# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## NightPDF Overview
NightPDF is a fully private, browser-based utility for converting PDFs to Dark Mode using CSS blend modes.

## Technical Stack
- **Frontend:** Vanilla HTML5, Tailwind CSS (via CDN)
- **PDF Processing:** `pdf-lib` (via CDN)
- **Deployment:** Vercel (static)
- **PWA:** Service Worker (`sw.js`) and Web Manifest (`manifest.json`)

## Development Commands
- **Serve Locally:** Use any static server, e.g., `npx serve .` or `python -m http.server`
- **Build/Lint/Test:** None (pure static project)

## AI SEO & Agent Discovery
The following files are maintained for AI/Agent discovery:
- `llms.txt`: Project context and summary
- `pricing.md`: Machine-readable pricing information
- `AGENTS.md`: Technical capabilities and integration pointers for AI agents

## Key Files
- `index.html`: Main UI, metadata, and SEO/Schema markup
- `script.js`: Core logic for PDF processing and PWA lifecycle
- `sw.js`: Service worker for offline support
- `styles.css`: Custom utility classes and animations
- `public/banner.svg`: Main branding asset
