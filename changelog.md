# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Multi-Touch Pinch-to-Zoom**: Added support for multi-touch pinch-to-zoom gestures in the PDF viewer using pointer events.
- **Stroke Cancellation on Multi-Touch**: Drawing ink strokes are now cancelled automatically when a multi-touch pinch gesture is initiated.
- **IndexedDB PDF Persistence**: Implemented local caching of the active PDF document (`ArrayBuffer`) in IndexedDB, enabling automatic restoration on page reload.
- **Direct Page Navigation**: Added a numeric input box in the header toolbar to navigate directly to any page by number.
- **Local PDF.js WASM Fallbacks**: Configured PDF.js to load WebAssembly support files locally from `/pdfjs/wasm/` for better performance and reliability.

### Fixed
- **Lint Command Target**: Corrected the `lint` script command in `package.json` to run only on the `src` directory (`oxlint src`).
