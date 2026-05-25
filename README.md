# StreamInk 🎨

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow)
![Chrome](https://img.shields.io/badge/Chrome-compatible-4285F4?logo=googlechrome&logoColor=white)

**Draw annotations on any webpage — fully visible in OBS window/tab capture.**

StreamInk injects a canvas overlay directly into the page DOM, so your drawings are captured by OBS (or any screen recorder that targets a browser window). No system-level overlay tricks — everything renders *inside* the browser, exactly where OBS looks.

---

## Why StreamInk?

Tools like [gInk](https://github.com/geovens/gInk) draw on a system-level overlay that OBS **can't see** when you're only capturing a browser window or tab. StreamInk draws *inside* the page, so annotations appear on stream without you needing to capture your entire desktop.

| | StreamInk | gInk / system tools |
|---|---|---|
| Visible in OBS window capture | ✅ | ❌ |
| Visible in OBS tab capture | ✅ | ❌ |
| No extra software needed | ✅ | ❌ |
| Works on any webpage | ✅ | ✅ |

---

## Features

- 🖊️ **Freehand pen** with smooth Bézier curves
- 📏 **Line, Rectangle, and Ellipse** shape tools
- 🧽 **Eraser** with a visual size cursor
- 🎨 **8 color swatches** + adjustable brush size (1–30 px)
- ↩️ **Undo** support (`Ctrl+Z`)
- 🔴 **"DRAW MODE" indicator** visible on stream so viewers know it's on
- ⌨️ **Full keyboard shortcuts** — never touch the toolbar mid-stream
- 🖥️ **HiDPI / Retina aware** — canvas scales with `devicePixelRatio`
- 🎥 **100% OBS-compatible** — window capture, tab capture, and browser source all work

---

## Installation

> No build step required. Load the folder directly as an unpacked Chrome extension.

1. **Download / clone this repository**

   ```bash
   git clone https://github.com/your-username/stream-ink.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer Mode** (toggle in the top-right corner)

4. Click **Load unpacked** and select the `stream-ink` folder (the one that contains `manifest.json`)

5. The StreamInk icon will appear in your Chrome toolbar — you're ready to go!

> **Updating:** After pulling new changes, go to `chrome://extensions/` and click the 🔄 refresh icon on the StreamInk card.

---

## Usage

### Activating draw mode

| Method | Action |
|---|---|
| Click the **StreamInk toolbar icon** | Toggle draw mode |
| `Alt+D` | Toggle draw mode |
| `Escape` | Exit draw mode |

When draw mode is active you'll see:
- The toolbar appear in the top-right corner
- A red **DRAW MODE** badge in the bottom-right corner (visible on stream)
- The cursor change to a crosshair

### Global shortcuts

| Shortcut | Action |
|---|---|
| `Alt+D` | Toggle draw mode on/off |
| `Alt+C` | Clear all drawings |
| `Ctrl+Z` | Undo last stroke |
| `Escape` | Exit draw mode |

### Tool shortcuts *(active while in draw mode)*

| Key | Tool |
|---|---|
| `P` | Pen — smooth freehand drawing |
| `L` | Line |
| `R` | Rectangle |
| `O` | Circle / Ellipse |
| `E` | Eraser |

### Toolbar controls

| Control | Description |
|---|---|
| Tool buttons | Switch drawing tool |
| Color swatches | Choose stroke color |
| Size slider | Adjust brush / stroke width (1–30 px) |
| ↩ Undo button | Remove the last stroke |
| 🗑 Clear button | Erase all annotations |
| **—** Minimize | Collapse the toolbar (just the minimize icon remains) |

---

## OBS Setup

### Option A — Window Capture

1. In OBS, add a **Window Capture** source
2. Select your Chrome window
3. Press `Alt+D` on the browser page and draw — annotations appear on stream instantly

### Option B — Browser Source

1. In OBS, add a **Browser Source**
2. Point it at the URL you want to annotate
3. Use StreamInk in that tab — drawings are captured by the browser source

### Option C — Display Capture (fallback)

Works too, but you'll capture your whole desktop. Use Window or Tab capture for a cleaner stream.

---

## Project Structure

```
stream-ink/
├── manifest.json       # Extension manifest (Manifest V3)
├── background.js       # Service worker — keyboard commands & icon click
├── content.js          # Canvas overlay + full drawing engine
├── overlay.css         # Styles for canvas, toolbar, indicator, eraser cursor
├── icons/              # Extension icons (16 × 16, 48 × 48, 128 × 128)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── .gitignore
├── LICENSE
└── README.md
```

### How it works

1. `background.js` (service worker) listens for the keyboard shortcut (`Alt+D`) and toolbar icon clicks, then sends a message to the active tab.
2. `content.js` is injected into every page at `document_idle`. It builds a `<canvas>` element appended directly to `<html>`, with `position: fixed` and the maximum possible `z-index` so it sits above all page content.
3. Because the canvas is part of the page DOM (not a system overlay), OBS's window/tab capture sees it just like any other page element.
4. `overlay.css` styles the toolbar and indicator with a scoped `#streamink-` prefix to avoid conflicts with page styles.

---

## Browser Compatibility

| Browser | Status |
|---|---|
| Chrome 88+ | ✅ Fully supported |
| Edge (Chromium) 88+ | ✅ Fully supported |
| Brave | ✅ Fully supported |
| Firefox | ❌ Not supported (uses different extension API) |
| Safari | ❌ Not supported |

Manifest V3 requires Chrome 88 or later.

---

## Troubleshooting

**"The extension icon does nothing on some tabs."**
Chrome restricts content scripts on `chrome://`, `chrome-extension://`, and the Chrome Web Store. This is a browser security policy — StreamInk can't be injected into those pages by design.

**"Drawings disappear when I scroll."**
The canvas is `position: fixed`, so it stays in place relative to the viewport. If the page scrolls, the drawings remain visually anchored to the window, not the page content. This is intentional for a streaming annotation overlay.

**"The keyboard shortcut doesn't work."**
Another extension may have claimed `Alt+D`. Go to `chrome://extensions/shortcuts` to remap StreamInk's shortcuts without conflicts.

**"OBS isn't capturing the drawings."**
Make sure you're using **Window Capture** pointed at the Chrome window (not the desktop), or a **Browser Source** pointed at the same URL. Display Capture works too but captures everything.

---

## Contributing

Contributions, bug reports, and feature ideas are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-improvement`
3. Commit your changes: `git commit -m "Add my improvement"`
4. Push and open a Pull Request

Please keep PRs focused — one feature or fix per PR makes review faster.

### Ideas for future improvements

- [ ] Persist drawings across page reloads (via `chrome.storage`)
- [ ] Export canvas as PNG
- [ ] Text / label tool
- [ ] Spotlight / laser pointer mode for presenters
- [ ] Customizable hotkeys via options page

---

## License

[MIT](LICENSE) — free to use, modify, and distribute.
