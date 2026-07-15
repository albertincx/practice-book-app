# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Multi-Touch Pinch-to-Zoom**: Added support for multi-touch pinch-to-zoom gestures in the PDF viewer using pointer events.
- **Stroke Cancellation on Multi-Touch**: Drawing ink strokes are now cancelled automatically when a multi-touch pinch gesture is initiated.
- **IndexedDB PDF & State Persistence**: Implemented local caching of both the active PDF document (`ArrayBuffer`) and its associated viewer state (current page, zoom level, opacity, pen settings, drawn strokes, text annotations, and painting mode setting) in IndexedDB, enabling automatic restoration on page reload.
- **Direct Page Navigation**: Added a numeric input box in the header toolbar to navigate directly to any page by number.
- **Local PDF.js WASM Fallbacks**: Configured PDF.js to load WebAssembly support files locally from `/pdfjs/wasm/` for better performance and reliability.
- **Local Storage Settings & Deletion**: Added a settings panel displaying the total size of locally saved PDF, drawings, and annotations, with a button to permanently clear local storage and reset the workspace.
- **Text Annotations**: Added support for placing multi-line text annotations onto PDF pages with customizable color, opacity, and size.
- **Draggable Text Annotations**: Enabled pointer-based dragging and repositioning of existing text annotations on the PDF canvas.
- **Toggleable Painting**: Added a settings option to enable or disable drawing/painting on the PDF.
- **Unified Undo & Clear**: Enhanced undo functionality to remove either drawing strokes or text annotations sequentially based on creation timestamps, and clear page to wipe both types of annotations.

### Fixed
- **Lint Command Target**: Corrected the `lint` script command in `package.json` to run only on the `src` directory (`oxlint src`).
