document.addEventListener('DOMContentLoaded', () => {
    console.log("NightPDF: DOM fully loaded and parsed.");

    // --- PWA SERVICE WORKER REGISTRATION ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log("NightPDF: Service Worker registered.", reg))
            .catch(err => console.warn("NightPDF: Service Worker registration failed.", err));
    }

    // Check for PDFLib dependency
    if (typeof PDFLib === 'undefined') {
        console.error("NightPDF Error: PDFLib is not loaded! Please check your internet connection or the script tag.");
        alert("Critical Error: PDF processing library failed to load. Please refresh the page.");
        return;
    }

    // Set initial random quote in header
    const dynamicQuote = document.getElementById('dynamic-quote');
    if (dynamicQuote) {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        dynamicQuote.innerText = `"${randomQuote}"`;
    }

    // --- PWA INSTALL PROMPT ---
    let deferredPrompt;
    const installBtn = document.getElementById('install-btn');
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.classList.remove('hidden');
    });

    installBtn.addEventListener('click', () => {
        installBtn.classList.add('hidden');
        deferredPrompt.prompt();
    });

    // --- THEME TOGGLE LOGIC ---
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
        htmlElement.classList.add('dark');
        htmlElement.classList.remove('light');
    } else {
        htmlElement.classList.add('light');
        htmlElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }

    themeToggle.addEventListener('click', () => {
        if (htmlElement.classList.contains('dark')) {
            htmlElement.classList.remove('dark');
            htmlElement.classList.add('light');
            localStorage.setItem('theme', 'light');
        } else {
            htmlElement.classList.remove('light');
            htmlElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
    });

    // --- QUOTES DATABASE ---
    const quotes = [
        "Brewing dark mode potion...",
        "Your retinas are writing us a thank you note. 👁️",
        "4 AM is just a social construct anyway. 🌙",
        "Inverting reality... one page at a time.",
        "Delaying eye strain, one PDF at a time. 🚀",
        "Converting study stress into dark mode chill. 😎",
        "No innocent PDFs were harmed in this process. ✌️",
        "Wait for it... magic is happening! ✨",
        "Brewing virtual espresso for your eyes. ☕",
        "The sun is basically a giant flashbang. Stay safe. 🦇"
    ];

    // --- PDF PROCESSING LOGIC ---
    const dropZone = document.getElementById('drop-zone');
    const fileUpload = document.getElementById('file-upload');
    const fileList = document.getElementById('file-list');
    const nukedArea = document.getElementById('nuked-area');
    const { PDFDocument, rgb, BlendMode, PDFName, PDFArray } = PDFLib;

    dropZone.addEventListener('click', () => fileUpload.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('bg-purple-200', 'dark:bg-purple-900/60');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('bg-purple-200', 'dark:bg-purple-900/60');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('bg-purple-200', 'dark:bg-purple-900/60');
        if (e.dataTransfer.files) handleFiles(Array.from(e.dataTransfer.files));
    });

    fileUpload.addEventListener('change', (e) => {
        if (e.target.files) handleFiles(Array.from(e.target.files));
    });

    async function handleFiles(files) {
        const pdfFiles = files.filter(f => f.type === 'application/pdf');
        if (pdfFiles.length === 0) return;

        fileList.classList.remove('hidden');
        if (pdfFiles.length > 1) nukedArea.classList.remove('hidden');

        for (const file of pdfFiles) {
            addFileToUI(file);
        }
    }

    function addFileToUI(file) {
        const fileId = Math.random().toString(36).substr(2, 9);
        const item = document.createElement('div');
        item.className = "bg-white dark:bg-black border-4 border-black dark:border-white p-4 rounded-xl neo-shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-all";
        item.id = `file-${fileId}`;
        
        item.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="bg-pink-300 border-2 border-black p-2 rounded-lg font-bold">PDF</div>
                <div class="text-left">
                    <p class="font-bold truncate max-w-[200px] text-black dark:text-white">${file.name}</p>
                    <p class="text-xs text-gray-500 quote-text">Waiting to process...</p>
                </div>
            </div>
            <div class="status-area w-full md:w-auto text-center">
                <div class="loader hidden w-6 h-6 border-4 border-black dark:border-white border-t-lime-400 rounded-full animate-spin mx-auto"></div>
                <a href="#" download class="download-btn hidden bg-lime-400 text-black border-2 border-black px-4 py-1 rounded-lg neo-btn font-bold text-sm">Download</a>
            </div>
        `;

        fileList.appendChild(item);
        processFile(file, item);
    }

    async function processFile(file, element) {
        const loader = element.querySelector('.loader');
        const downloadBtn = element.querySelector('.download-btn');
        const quoteText = element.querySelector('.quote-text');
        
        loader.classList.remove('hidden');
        
        // Quote rotation
        let quoteIndex = 0;
        const quoteInterval = setInterval(() => {
            quoteText.innerText = quotes[quoteIndex % quotes.length];
            quoteIndex++;
        }, 2000);

        try {
            const fileBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(fileBuffer);
            const pages = pdfDoc.getPages();

            for (const page of pages) {
                const { width, height } = page.getSize();
                const bgStream = pdfDoc.context.flateStream(`q\n1 1 1 rg\n0 0 ${width} ${height} re\nf\nQ\n`);
                const bgRef = pdfDoc.context.register(bgStream);
                const currentContents = page.node.get(PDFName.of('Contents'));
                const newContents = pdfDoc.context.obj([bgRef]);

                if (currentContents instanceof PDFArray) {
                    for (let j = 0; j < currentContents.size(); j++) newContents.push(currentContents.get(j));
                } else if (currentContents) {
                    newContents.push(currentContents);
                }
                page.node.set(PDFName.of('Contents'), newContents);
                page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1), blendMode: BlendMode.Difference });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            downloadBtn.href = url;
            downloadBtn.download = file.name.replace('.pdf', '_night.pdf');
            downloadBtn.classList.remove('hidden');
            quoteText.innerText = "Processing Complete! 🎉";
            quoteText.classList.add('text-lime-500', 'dark:text-lime-400');
            
        } catch (err) {
            console.error(err);
            quoteText.innerText = "ERROR: Processing failed. ❌";
            quoteText.classList.add('text-red-500');
        } finally {
            loader.classList.add('hidden');
            clearInterval(quoteInterval);
        }
    }
});