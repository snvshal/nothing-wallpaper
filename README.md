# Nothing Wallpaper

A Nothing Phone-inspired desktop wallpaper application for Windows.

> **Disclaimer:** Unofficial fan project. Not affiliated with or endorsed by Nothing Technology Limited.

## Features

- Desktop wallpaper layer — sits behind desktop icons, above system wallpaper
- 10 widgets: analog clock, calendar, weather, RAM monitor, Wi-Fi, Bluetooth, volume, music player, screen time, sand timer
- Draggable widgets with grid-snap and collision detection
- Settings window: wallpaper picker (default / system / custom image) + per-widget toggles
- Layout minimap: dot-grid desktop preview, drag to arrange, live two-way sync
- Smart placement: overlap-free auto-positioning with "not enough space" indicator
- Nothing design system: dot-matrix typography, monochrome palette, N-Red accent

## Tech Stack

- [Tauri 2](https://tauri.app) — desktop framework
- React 19 + TypeScript
- Tailwind CSS v4
- Rust (Win32 API for wallpaper layer + mouse hook)
- Bun (package manager)

## Prerequisites

- [Bun](https://bun.sh)
- [Rust](https://rustup.rs)
- Windows 10/11

## Setup

```bash
bun install
bun run tauri dev
```

## Build

```bash
bun run tauri build
```

## Fonts

Bundled open-source fonts, both [SIL OFL 1.1](https://openfontlicense.org) licensed with license files included in-repo:

- [Doto](https://fonts.google.com/specimen/Doto) — dot-matrix display typeface (variable `wght` + `ROND` axes)
- [Google Sans Code](https://fonts.google.com/specimen/Google+Sans+Code) — UI/body monospace
- Noto Emoji — weather emoji glyphs

No proprietary Nothing assets are included in this repository.

## License

[MIT](LICENSE)

## Credits

- [Nothing Brand Reference](https://nothing.wiki/nothing/brand_reference) — design system reference
- [Nothing](https://nothing.tech) — inspiration and design language
