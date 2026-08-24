# Nothing Wallpaper — Design Reference

Design system based on [Nothing Brand Reference](https://nothing.wiki/nothing/brand_reference).

For detailed per-widget specs, see [docs/widgets/](widgets/).

## Design Principles

- **Transparency** — exposed internals, honest materials
- **Industrial warmth** — technical but human
- **Minimalism** — no decoration, only function
- **Monochrome** — black, white, grey only. No colour fills, no gradients, no shadows

## Colour Palette

### Foundation

| Name        | Hex       | RGB         | Use                         |
| ----------- | --------- | ----------- | --------------------------- |
| Pure Black  | `#000000` | 0/0/0       | Backgrounds, primary canvas |
| Window Grey | `#B1B3B3` | 177/179/179 | Muted labels, subtle text   |
| N-Grey      | `#DCD7D2` | 220/215/210 | Secondary text, dates       |
| Pure White  | `#FFFFFF` | 255/255/255 | Primary text, headlines     |

### Primary (accent — use sparingly)

| Name       | Hex       | RGB       | Use                       |
| ---------- | --------- | --------- | ------------------------- |
| N-Red      | `#C8102E` | 200/16/46 | Accent highlights         |
| N-Blue     | `#002F6C` | 0/47/108  | Accent highlights         |
| N-Yellow   | `#FFC700` | 255/199/0 | Accent highlights         |
| Widget Red | `#D71920` | 215/25/32 | Nothing OS widget accents |

All eight values above are the official published palette and are exposed as theme tokens (`--color-nothing-*`) in `global.css`. **Widget Red is active** for all widget-layer accents (calendar day name, clock second hand, drag borders, snap indicators); **N-Red remains in use for settings-window UI accents only**. **N-Blue and N-Yellow are currently reserved** — defined but unused. Two project-local utility neutrals sit outside this palette and are used only for UI scaffolding: `nothing-dgrey` (`#6E6E6E`, muted borders/details) and `widget-bg` (`#111111`, minimap tiles).

### Theme System (Dark & Light Modes)

The wallpaper and settings applications support three theme preferences (`dark`, `light`, `system`):

- **Dark Mode**: Default Nothing OS pitch-black aesthetic (`#000000` / `#111111` canvas and widget cards, `#FFFFFF` typography, subtle white/grey borders).
- **Light Mode**: Inverted monochrome aesthetic (`#FFFFFF` / `#F4F4F4` canvas and widget cards, `#000000` typography, subtle black borders).
- **System Mode**: Dynamically follows the Windows OS dark/light mode preference (`prefers-color-scheme`).

Theme switching is mediated via semantic CSS variables at `:root` / `[data-theme="dark"]` and `[data-theme="light"]` (`--theme-bg-widget`, `--theme-text-primary`, `--theme-text-secondary`, `--theme-border-widget`, etc.). Signature red accents remain consistently active in both modes.

### Rules

- No gradients on any element
- No drop shadows
- No colour fills on graphic elements
- Black and white only for text and backgrounds
- Accent colours only for interactive/highlighted elements

## Typography

### Font Files

Located in `src/assets/fonts/` and `src/assets/emojis/`:

| File                                               | Format       | Typeface         | Role                                            |
| -------------------------------------------------- | ------------ | ---------------- | ----------------------------------------------- |
| `Doto/Doto-VariableFont.ttf`                       | TTF variable | Doto             | Dot-matrix display: RAM title, percentage, temp |
| `Google_Sans_Code/GoogleSansCode-VariableFont.ttf` | TTF variable | Google Sans Code | Body/UI: date, city name, RAM GB values         |
| `NotoEmoji-VariableFont_wght.ttf`                  | TTF variable | Noto Emoji       | Weather cloud emoji                             |

Both font families are SIL OFL 1.1 licensed (`OFL.txt` bundled alongside).

### Typefaces (full reference)

#### Doto

- **Role**: Dot-matrix display text (headings, numerals)
- **License**: SIL OFL 1.1
- **Variation axes**: `wght` 100–900, `ROND` 0–100 (`ROND 100` = round dots, matching the NDot aesthetic)
- **Case**: Uppercase preferred
- **Wallpaper use**: Calendar day, weather temperature, RAM title/percentage

#### Google Sans Code

- **Role**: Body / UI text and monospace details
- **License**: SIL OFL 1.1
- **Variation axes**: `wght` 100–800, `MONO` 0–1
- **Case**: Sentence case
- **Wallpaper use**: Calendar date, weather city, RAM GB values

### Wallpaper Element Mapping

| Element        | Font             | Size                   | Colour    | Case          |
| -------------- | ---------------- | ---------------------- | --------- | ------------- |
| Calendar date  | Google Sans Code | `--widget-size * 0.39` | `#FFFFFF` | Sentence case |
| Calendar day   | Doto             | `--widget-size * 0.1`  | `#D71920` | Uppercase     |
| Weather temp   | Doto             | `--widget-size * 0.1`  | `#FFFFFF` | Uppercase     |
| Weather city   | Google Sans Code | `--widget-size * 0.07` | `#DCD7D2` | Sentence case |
| Weather emoji  | Noto Emoji       | `--widget-size * 0.39` | `#FFFFFF` | N/A           |
| RAM title      | Doto             | `--widget-size * 0.1`  | `#FFFFFF` | Uppercase     |
| RAM percentage | Doto             | `--widget-size * 0.1`  | `#FFFFFF` | Uppercase     |
| RAM GB values  | Google Sans Code | `--widget-size * 0.06` | `#DCD7D2` | N/A           |

Font sizes are centralized as Tailwind theme tokens in `global.css`: `text-widget-display` (×0.39), `text-widget-title` (×0.1), `text-widget-subtitle` (×0.07), `text-widget-detail` (×0.06) — tune the scale by editing those four variables only.

## Layout

### Grid

- Format: 16:9 (1920×1080 desktop)
- Column margin: 2.3% of format width
- Centre-aligned composition for desktop wallpaper

### Widget Grid System

All widget dimensions and positions snap to the **grid unit** (default 16px,
user-configurable in settings).

| Property             | Value                       | Notes                                                         |
| -------------------- | --------------------------- | ------------------------------------------------------------- |
| Grid unit            | 16px (configurable 12–24px) | Settings › Grid unit; 1 unit = chosen px                      |
| Widget size variable | `--widget-size`             | `9 × unit`, set at runtime on `documentElement` with `--unit` |
| Small widget         | 9 units                     | Odd number for symmetry                                       |
| Medium widget        | 11 units                    | Odd number for symmetry                                       |
| Large widget         | 13 units                    | Odd number for symmetry                                       |
| XL widget            | 15 units                    | Odd number for symmetry                                       |
| Grid snap            | 1 unit                      | Drag positions snap to nearest unit                           |
| Widget gap           | 1 unit                      | Minimum space between any two widgets                         |
| Edge padding         | 1 unit                      | Lattice-aligned reserved border band                          |
| Border radius        | `var(--widget-size) / 6`    | `--radius-widget`; 24px at the default unit                   |

### Placement Engine

Widget placement logic lives in `src/lib/placement.ts` and is shared by the
wallpaper window and the settings layout minimap.

- **Collision rule** — a widget's footprint is size + gap (160px at the
  default unit); overlapping widgets are never rendered side by side
- **Toggle-on placement** — when a widget is enabled, its previous position is
  restored if still valid; otherwise the first free slot scanning from the
  top-left corner (1-unit steps) is assigned
- **No-space state** — if no free slot exists anywhere, the widget stays hidden
  and settings flags it ("not enough space"); it appears automatically once
  space frees up or it is repositioned from the layout minimap
- **Live sync** — position changes in either window persist to the store and
  broadcast via the `settings-changed` event, keeping both views identical

### Modular Grid Rule

All widget sizes use **odd grid units** (9, 11, 13, 15...). This ensures small
widgets fit symmetrically between larger widgets with consistent 1-unit gaps.

Example: A 15-unit XL widget = one 9-unit small + one 9-unit small + two 1-unit gaps.

### Responsive Sizing

All widget content scales relative to `--widget-size` CSS variable using `calc()`:

```css
/* Example: font size scales with widget */
font-size: calc(var(--widget-size) * 0.39); /* 39% of widget width */
```

| Element         | Multiplier | Description                                  |
| --------------- | ---------- | -------------------------------------------- |
| Main number     | 0.39       | Calendar date, weather emoji                 |
| Secondary label | 0.1        | RAM title/percentage, weather temp, day name |
| Small text      | 0.07       | City name                                    |
| Detail text     | 0.06       | RAM GB values                                |

Spacing follows the unit the same way:

| Element          | Value                              | Description                         |
| ---------------- | ---------------------------------- | ----------------------------------- |
| Widget padding   | 1 unit (`var(--unit)`)             | Inner padding of widget cards       |
| RAM label margin | `calc(var(--unit) * 0.25)`         | Gap under RAM title/percentage rows |
| Calendar nudge   | `calc(var(--widget-size) * 0.028)` | Optical centring of the date number |
| Border           | fixed `1px`                        | Hairline strokes never scale        |

`--widget-size` and `--unit` are set on `documentElement` at runtime so the
`:root`-level token calcs recompute whenever the grid unit changes.

This ensures widgets maintain proportions when size changes.

### Spacing

- Minimal gaps between elements
- No decorative borders, dividers, or separators
- Breathing room over density

## Window Chrome (Settings)

| Property        | Value                                                                            |
| --------------- | -------------------------------------------------------------------------------- |
| Window radius   | `8px` — native DWM rounding (`DWMWCP_ROUND`) on Windows 11, CSS-matched fallback |
| Size            | Fixed `720×520`, non-resizable, not maximizable                                  |
| Titlebar height | `36px`                                                                           |
| Titlebar label  | Doto, `12px`, uppercase, `0.1em` spacing, grey (`--color-nothing-grey`)          |
| Control buttons | `44px` wide, full bar height                                                     |
| Button hover    | `--color-widget-bg`; close uses `--color-nothing-red`                            |
| Icons           | Inline SVG, `10px`, stroke `currentColor`                                        |
| Drag region     | Whole bar via `data-tauri-drag-region`                                           |

- Native decorations disabled; transparent window background; corners rounded by Windows DWM (`DWMWCP_ROUND`) with matching CSS fallback
- Minimize + Close only (window is not maximizable)
- Dev builds additionally expose Inspect / F12 (release stays locked down)

## Graphics Rules

### Do

- Use Doto (`font-dot`) for dot-matrix display text only
- Use Google Sans Code (`font-body`) for body text and UI
- Keep monochrome
- Use sharp edges by default (border-radius `16px` accepted for widget cards only)

### Don't

- Apply colour fills to graphic elements
- Use drop shadows on any graphic element
- Use gradients anywhere
- Alter the established layout / grid
- Increase logotype size beyond its column width
- Change the placement of additional / partner logotypes
- Apply colour fills, gradients, or shadows to logos — black & white only
- Mix font sizes within Doto or Google Sans Code blocks
- Use Doto for body text

## Current Deviations

| Issue                | Current                         | Notes                                                         |
| -------------------- | ------------------------------- | ------------------------------------------------------------- |
| Background           | `background.png` image          | Original generated artwork at 3840×2160 — black + dot grid    |
| Widget border-radius | `16px`                          | Intentional deviation — matches Nothing card spec             |
| Clock widget         | Circular with hands             | Nothing Phone lockscreen inspired — no digital time displayed |
| Widget background    | `bg-nothing-black` (pure black) | Compliant with Nothing spec                                   |
| All sizing           | Relative (`--widget-size`)      | Scales with widget — no fixed pixel sizes                     |
