# NightPDF Agent Capabilities

This document outlines the programmatic capabilities of NightPDF for AI agents and automated workflows.

## Capability: PDF Dark Mode Conversion
- **Input:** standard PDF files (`.pdf`).
- **Processing:** Local, client-side JavaScript using `pdf-lib`.
- **Methodology:** Injects a white background layer and applies a `Difference` blend mode to the content layer.
- **Output:** Inverted PDF files with native text preserved.

## Constraints & Limits
- **Privacy:** 100% private. Data does not leave the local environment.
- **Size Limit:** Dependent on browser heap size (typically 1GB-2GB).
- **Format:** Only supports `.pdf`.

## Integration Pointers
- **Web UI:** `https://nightpdf.vercel.app/`
- **Machine-Readable Pricing:** `/pricing.md`
- **AI Context:** `/llms.txt`
