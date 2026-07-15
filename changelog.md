# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Multi-Touch Pinch-to-Zoom**: Added support for multi-touch pinch-to-zoom gestures in the PDF viewer using pointer events.
- **Stroke Cancellation on Multi-Touch**: Drawing ink strokes are now cancelled automatically when a multi-touch pinch gesture is initiated.
- **IndexedDB Multi-File Document Library**: Upgraded the local storage system to a multi-file document library in IndexedDB. It stores multiple PDF files (`pdfs` store) and manages their annotations, zoom levels, page states, and pen settings independently using a metadata database (`pdfs_metadata` store).
- **Direct Page Navigation**: Added a numeric input box in the header toolbar to navigate directly to any page by number.
- **Local PDF.js WASM Fallbacks**: Configured PDF.js to load WebAssembly support files locally from `/pdfjs/wasm/` for better performance and reliability.
- **Library Settings & Data Management**: Enhanced the settings panel to monitor total disk usage of all files and annotations in the library, with options to delete files individually or wipe the entire database.
- **Text Annotations**: Added support for placing multi-line text annotations onto PDF pages with customizable color, opacity, and size.
- **Draggable Text Annotations**: Enabled pointer-based dragging and repositioning of existing text annotations on the PDF canvas.
- **Toggleable Painting**: Added a settings option to enable or disable drawing/painting on the PDF.
- **Unified Undo & Clear**: Enhanced undo functionality to remove either drawing strokes or text annotations sequentially based on creation timestamps, and clear page to wipe both types of annotations.

### Fixed
- **Lint Command Target**: Corrected the `lint` script command in `package.json` to run only on the `src` directory (`oxlint src`).
- **Vite Upgrade for Cloudflare Pages**: Upgraded Vite to version `^6.0.0` to satisfy Wrangler/Cloudflare Pages deployment requirements.
