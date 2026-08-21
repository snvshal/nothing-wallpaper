# Nothing Wallpaper

A Nothing Phone-inspired desktop wallpaper application for Windows.

> **Disclaimer:** Unofficial fan project. Not affiliated with or endorsed by Nothing Technology Limited.

## Features

- Desktop wallpaper layer — sits behind desktop icons, above system wallpaper
- 4 widgets: analog clock, calendar, weather, RAM monitor
- Draggable widgets with grid-snap and collision detection
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

This project uses proprietary Nothing fonts (NDot55, NDot57, NType82, NType82Mono) that are not included in the repository due to licensing restrictions. To use them, obtain the fonts separately and place them in `src/assets/fonts/`:

- `Ndot-55.otf`
- `NDot-57.woff2`
- `NType82-Regular.woff2`
- `NType82Mono-Regular.woff2`

The app will still build without these fonts, but typography will fall back to system fonts.

## License

[MIT](LICENSE)

## Credits

- [Nothing Brand Reference](https://nothing.wiki/nothing/brand_reference) — design system reference
- [Nothing](https://nothing.tech) — inspiration and design language
