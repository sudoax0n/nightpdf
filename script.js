document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const themeToggle = document.getElementById('theme-toggle');
  const installButton = document.getElementById('install-btn');
  const dropZone = document.getElementById('drop-zone');
  const fileUpload = document.getElementById('file-upload');
  const uploadNotice = document.getElementById('upload-notice');
  const queue = document.getElementById('queue');
  const queueCount = document.getElementById('queue-count');
  const fileList = document.getElementById('file-list');
  const clearCompletedButton = document.getElementById('clear-completed');

  const fileRecords = new Map();
  let deferredInstallPrompt = null;

  const requiredElements = [dropZone, fileUpload, uploadNotice, queue, queueCount, fileList];
  if (requiredElements.some((element) => !element)) {
    console.error('NightPDF: required interface elements are missing.');
    return;
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('NightPDF: service worker registration failed.', error);
    });
  }

  function updateHeaderState() {
    header?.classList.toggle('scrolled', window.scrollY > 8);
  }

  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });

  function setTheme(theme) {
    root.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch (_) {
      // Local storage can be unavailable in private browsing contexts.
    }

    if (themeToggle) {
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      themeToggle.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
      themeToggle.title = `Switch to ${nextTheme} theme`;
    }
  }

  setTheme(root.dataset.theme === 'light' ? 'light' : 'dark');

  themeToggle?.addEventListener('click', () => {
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton?.classList.remove('hidden');
  });

  installButton?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;

    installButton.classList.add('hidden');
    await deferredInstallPrompt.prompt();
    deferredInstallPrompt = null;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installButton?.classList.add('hidden');
  });

  function showNotice(message, type = 'error') {
    uploadNotice.textContent = message;
    uploadNotice.classList.remove('hidden', 'notice-success');
    if (type === 'success') uploadNotice.classList.add('notice-success');
  }

  function hideNotice() {
    uploadNotice.textContent = '';
    uploadNotice.classList.add('hidden');
    uploadNotice.classList.remove('notice-success');
  }

  function isPdf(file) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
    const units = ['B', 'KB', 'MB', 'GB'];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, unitIndex);
    return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
  }

  function makeId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function createSvg(pathData) {
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.7');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    return svg;
  }

  function updateQueueControls() {
    queueCount.textContent = String(fileRecords.size);
    queue.classList.toggle('hidden', fileRecords.size === 0);

    const hasCompleted = Array.from(fileRecords.values()).some((record) => record.state === 'complete');
    clearCompletedButton?.classList.toggle('hidden', !hasCompleted);
  }

  function createFileItem(file) {
    const id = makeId();
    const item = document.createElement('article');
    item.className = 'file-item';
    item.dataset.fileId = id;

    const icon = document.createElement('div');
    icon.className = 'file-icon';
    icon.appendChild(createSvg('M7 3h7l4 4v14H7V3Zm7 0v5h4M9.5 13h5M9.5 16.5h5'));

    const main = document.createElement('div');
    main.className = 'file-main';

    const nameRow = document.createElement('div');
    nameRow.className = 'file-name-row';

    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = file.name;
    name.title = file.name;

    const size = document.createElement('span');
    size.className = 'file-size';
    size.textContent = formatBytes(file.size);

    nameRow.append(name, size);

    const status = document.createElement('p');
    status.className = 'file-status';
    status.textContent = 'Queued…';

    const progressTrack = document.createElement('div');
    progressTrack.className = 'progress-track';
    progressTrack.setAttribute('aria-hidden', 'true');

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.width = '4%';
    progressTrack.appendChild(progressBar);

    main.append(nameRow, status, progressTrack);

    const action = document.createElement('div');
    action.className = 'processing-indicator';
    action.setAttribute('aria-label', 'Processing');

    item.append(icon, main, action);
    fileList.prepend(item);

    const record = {
      id,
      file,
      item,
      status,
      progressBar,
      action,
      state: 'processing',
      objectUrl: null
    };

    fileRecords.set(id, record);
    updateQueueControls();
    return record;
  }

  function setProgress(record, percent, message) {
    const safePercent = Math.max(4, Math.min(100, Math.round(percent)));
    record.progressBar.style.width = `${safePercent}%`;
    if (message) record.status.textContent = message;
  }

  function markComplete(record, objectUrl, outputName, pageCount) {
    record.state = 'complete';
    record.objectUrl = objectUrl;
    record.item.classList.add('is-complete');
    setProgress(record, 100, `Ready · ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`);

    const download = document.createElement('a');
    download.className = 'download-button';
    download.href = objectUrl;
    download.download = outputName;
    download.setAttribute('aria-label', `Download ${outputName}`);
    download.title = 'Download converted PDF';
    download.appendChild(createSvg('M12 3v12m0 0 4-4m-4 4-4-4M5 20h14'));

    record.action.replaceWith(download);
    record.action = download;
    updateQueueControls();
  }

  function markError(record, message) {
    record.state = 'error';
    record.item.classList.add('is-error');
    record.progressBar.style.width = '100%';
    record.status.textContent = message;

    const errorBadge = document.createElement('span');
    errorBadge.className = 'file-size';
    errorBadge.textContent = 'Failed';
    record.action.replaceWith(errorBadge);
    record.action = errorBadge;
    updateQueueControls();
  }

  function getOutputName(fileName) {
    return fileName.toLowerCase().endsWith('.pdf')
      ? `${fileName.slice(0, -4)}_night.pdf`
      : `${fileName}_night.pdf`;
  }

  function yieldToBrowser() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  async function processFile(record) {
    if (typeof PDFLib === 'undefined') {
      markError(record, 'PDF library did not load. Refresh while online and try again.');
      return;
    }

    const { PDFDocument, rgb, BlendMode, PDFName, PDFArray } = PDFLib;

    try {
      setProgress(record, 8, 'Reading PDF…');
      const fileBuffer = await record.file.arrayBuffer();
      const pdfDocument = await PDFDocument.load(fileBuffer);
      const pages = pdfDocument.getPages();

      if (pages.length === 0) {
        throw new Error('The PDF contains no pages.');
      }

      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        const { width, height } = page.getSize();
        const backgroundStream = pdfDocument.context.flateStream(
          `q\n1 1 1 rg\n0 0 ${width} ${height} re\nf\nQ\n`
        );
        const backgroundReference = pdfDocument.context.register(backgroundStream);
        const currentContents = page.node.get(PDFName.of('Contents'));
        const newContents = pdfDocument.context.obj([backgroundReference]);

        if (currentContents instanceof PDFArray) {
          for (let contentIndex = 0; contentIndex < currentContents.size(); contentIndex += 1) {
            newContents.push(currentContents.get(contentIndex));
          }
        } else if (currentContents) {
          newContents.push(currentContents);
        }

        page.node.set(PDFName.of('Contents'), newContents);
        page.drawRectangle({
          x: 0,
          y: 0,
          width,
          height,
          color: rgb(1, 1, 1),
          blendMode: BlendMode.Difference
        });

        const percent = 12 + ((index + 1) / pages.length) * 72;
        setProgress(record, percent, `Converting page ${index + 1} of ${pages.length}…`);

        if (index % 6 === 0) await yieldToBrowser();
      }

      setProgress(record, 90, 'Preparing download…');
      const outputBytes = await pdfDocument.save();
      const blob = new Blob([outputBytes], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      markComplete(record, objectUrl, getOutputName(record.file.name), pages.length);
    } catch (error) {
      console.error('NightPDF: conversion failed.', error);
      const message = error instanceof Error && error.message
        ? `Could not convert: ${error.message}`
        : 'Could not convert this PDF.';
      markError(record, message);
    }
  }

  async function handleFiles(fileCollection) {
    hideNotice();
    const files = Array.from(fileCollection || []);
    if (files.length === 0) return;

    const pdfFiles = files.filter(isPdf);
    const rejectedCount = files.length - pdfFiles.length;

    if (pdfFiles.length === 0) {
      showNotice('Please choose one or more PDF files.');
      return;
    }

    if (rejectedCount > 0) {
      showNotice(`${rejectedCount} non-PDF ${rejectedCount === 1 ? 'file was' : 'files were'} skipped.`);
    }

    const records = pdfFiles.map(createFileItem);
    for (const record of records) {
      await processFile(record);
    }
  }

  dropZone.addEventListener('click', () => fileUpload.click());
  dropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileUpload.click();
    }
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add('is-dragging');
    });
  });

  ['dragleave', 'dragend'].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('is-dragging');
    });
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
    handleFiles(event.dataTransfer?.files);
  });

  fileUpload.addEventListener('change', (event) => {
    handleFiles(event.target.files);
    event.target.value = '';
  });

  clearCompletedButton?.addEventListener('click', () => {
    for (const [id, record] of fileRecords.entries()) {
      if (record.state !== 'complete') continue;
      if (record.objectUrl) URL.revokeObjectURL(record.objectUrl);
      record.item.remove();
      fileRecords.delete(id);
    }
    updateQueueControls();
  });

  window.addEventListener('beforeunload', () => {
    for (const record of fileRecords.values()) {
      if (record.objectUrl) URL.revokeObjectURL(record.objectUrl);
    }
  });
});
