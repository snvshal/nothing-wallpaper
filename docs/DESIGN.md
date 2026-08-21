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

| Name     | Hex       | RGB       | Use               |
| -------- | --------- | --------- | ----------------- |
| N-Red    | `#C8102E` | 200/16/46 | Accent highlights |
| N-Blue   | `#002F6C` | 0/47/108  | Accent highlights |
| N-Yellow | `#FFC700` | 255/199/0 | Accent highlights |

### Rules

- No gradients on any element
- No drop shadows
- No colour fills on graphic elements
- Black and white only for text and backgrounds
- Accent colours only for interactive/highlighted elements

## Typography

### Font Files

Located in `src/assets/fonts/` and `src/assets/emojis/`:

| File                              | Format | Typeface        | Role                                |
| --------------------------------- | ------ | --------------- | ----------------------------------- |
| `Ndot-55.otf`                     | OTF    | NDot 55         | RAM title, percentage, weather temp |
| `NType82-Regular.woff2`           | WOFF2  | NType82 Regular | Calendar date, day name, city name  |
| `LetteraMonoLL-Regular.otf`       | OTF    | Lettera Mono LL | RAM GB values, small details        |
| `NotoEmoji-VariableFont_wght.ttf` | TTF    | Noto Emoji      | Weather cloud emoji                 |

### Typefaces (full reference)

#### NDot 55

- **Role**: Product names / logotype
- **Inspiration**: Industrial dot-matrix printers
- **Size range**: 10pt to unlimited
- **Leading**: 90% of font size
- **Tracking**: 0 (not optical or metrical)
- **Case**: Mainly uppercase; can combine uppercase with lowercase for product names
- **Wallpaper use**: RAM title/percentage, weather temperature

#### NType82 Regular

- **Role**: Body text / preamble / quotes
- **Inspiration**: Olivetti Lexikon 82 typewriter
- **Leading / tracking by size**:
  - 7.5–15pt: tracking +1%, leading 125%
  - 15–30pt: tracking +1%, leading 115%
  - 30–60pt: tracking −1%, leading 115%
  - 60–120pt: tracking −1%, leading 100%
  - 120pt+: tracking −1%, leading 85%
- **Case**: Sentence case
- **Wallpaper use**: Calendar date, day name, weather city

#### NType82 Headline (not used)

- Headlines only, 40pt+
- Not needed for this wallpaper

#### NType82 Mono (not used)

- Monospaced body, 7.5–15pt max
- Not needed — Lettera Mono LL covers small text

#### Lettera Mono LL

- **Role**: Small / legal text, spec sheets, fine print
- **Size range**: 5pt minimum to 10pt maximum
- **Font width**: 90%
- **Leading**: 110% of font size
- **Tracking**: 0 (mono spaced, don't adjust)
- **Wallpaper use**: RAM GB values, small details

### Wallpaper Element Mapping

| Element        | Font            | Size                   | Colour    | Case          |
| -------------- | --------------- | ---------------------- | --------- | ------------- |
| Calendar date  | NType82 Regular | `--widget-size * 0.39` | `#FFFFFF` | Sentence case |
| Calendar day   | NDot 55         | `--widget-size * 0.07` | `#C8102E` | Uppercase     |
| Weather temp   | NDot 55         | `--widget-size * 0.1`  | `#FFFFFF` | Uppercase     |
| Weather city   | NType82 Regular | `--widget-size * 0.07` | `#DCD7D2` | Sentence case |
| Weather emoji  | Noto Emoji      | `--widget-size * 0.39` | `#FFFFFF` | N/A           |
| RAM title      | NDot 55         | `--widget-size * 0.1`  | `#FFFFFF` | Uppercase     |
| RAM percentage | NDot 55         | `--widget-size * 0.1`  | `#FFFFFF` | Uppercase     |
| RAM GB values  | Lettera Mono LL | `--widget-size * 0.06` | `#DCD7D2` | N/A           |

## Layout

### Grid

- Format: 16:9 (1920×1080 desktop)
- Column margin: 2.3% of format width
- Centre-aligned composition for desktop wallpaper

### Widget Grid System

All widget dimensions and positions snap to a **16px grid** (1 unit = 16px).

| Property             | Value            | Notes                                 |
| -------------------- | ---------------- | ------------------------------------- |
| Grid unit            | 16px             | 1 unit = 16px                         |
| Widget size variable | `--widget-size`  | CSS variable in `global.css`          |
| Small widget         | 9 units (144px)  | Odd number for symmetry               |
| Medium widget        | 11 units (176px) | Odd number for symmetry               |
| Large widget         | 13 units (208px) | Odd number for symmetry               |
| XL widget            | 15 units (240px) | Odd number for symmetry               |
| Grid snap            | 16px             | Drag positions snap to nearest unit   |
| Widget gap           | 16px (1 unit)    | Minimum space between any two widgets |
| Edge padding         | 20px             | Minimum distance from screen edges    |
| Border radius        | 16px             | `--radius-widget` CSS variable        |

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

| Element         | Multiplier | Description                        |
| --------------- | ---------- | ---------------------------------- |
| Main number     | 0.39       | Calendar date, weather emoji       |
| Secondary label | 0.1        | RAM title/percentage, weather temp |
| Small text      | 0.07       | Day name, city name                |
| Detail text     | 0.06       | RAM GB values                      |

This ensures widgets maintain proportions when size changes.

### Spacing

- Minimal gaps between elements
- No decorative borders, dividers, or separators
- Breathing room over density

## Graphics Rules

### Do

- Use NDot 55 for the Nothing logotype and product names only
- Use NType82 for body text and headlines
- Keep monochrome
- Use sharp edges by default (border-radius `16px` accepted for widget cards only)

### Don't

- Apply colour fills to graphic elements
- Use drop shadows on any graphic element
- Use gradients anywhere
- Alter the established layout / grid
- Mix font sizes within NDot55, NType82, or Lettera Mono blocks
- Use NDot 55 for body text

## Current Deviations

| Issue                | Current                    | Notes                                                         |
| -------------------- | -------------------------- | ------------------------------------------------------------- |
| Background           | `background.jpg` image     | Pure black `#000000` is Nothing spec — image is intentional   |
| Widget border-radius | `16px`                     | Intentional deviation — matches Nothing card spec             |
| Clock widget         | Circular with hands        | Nothing Phone lockscreen inspired — no digital time displayed |
| Widget background    | `bg-black` (pure black)    | Compliant with Nothing spec                                   |
| All sizing           | Relative (`--widget-size`) | Scales with widget — no fixed pixel sizes                     |
