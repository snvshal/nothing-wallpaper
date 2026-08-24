# AGENTS.md

Nothing OS-style live wallpaper for Windows (Tauri 2 + React 19 + Tailwind CSS v4). Package manager: bun.

## Read first

- `docs/DESIGN.md` — design-system source of truth (fonts, colors, sizes, layout)
- `docs/widgets/*.md` — per-widget specs (clock, calendar, weather, ram, wifi)
- `CONTRIBUTING.md` — step-by-step checklist for building & registering new widgets
- `docs/COPYRIGHT.md` — what must NEVER be bundled

## Verify before claiming done

Frontend:

```sh
bun run fmt && bun run check && bun run build
```

Rust backend (`src-tauri/`):

```sh
bun run fmt:rs && bun run check:rs
```

## Hard rules

- Follow `docs/` exactly when touching design, layout, or widgets
- Colors: theme tokens only (`--color-nothing-*`, `--color-widget-bg`); no default Tailwind palette classes, no new raw hex values
- Fonts: only `font-dot` / `font-body` / `font-emoji` utilities; sizes via `text-widget-*` tokens; no inline `fontSize` calc
- Never add Nothing proprietary fonts, images, or logos
- Commits: lowercase conventional style (`feat:`, `fix:`, `chore:`)
