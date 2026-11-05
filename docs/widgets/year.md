# Year Progress Widget

Year-in-dots tracker. One dot represents one day of the current calendar year: elapsed days illuminate, today is a single Widget Red dot, and remaining days stay dim.

## DraggableWidget Config

| Property         | Value                             |
| ---------------- | --------------------------------- |
| Size             | 9x9 grid units (144px x 144px)    |
| Border radius    | Standard (`var(--radius-widget)`) |
| Padding          | Default (`var(--unit)`)           |
| Initial position | `{ x: 21, y: 1 }` (units)         |

## Layout

Single header row at top, a `0.4u` gap, then the dot-matrix year filling the remaining space at full widget width.

```
+---------------------------+
| 2026              74.5%   |
|                           |
| . . . . . . . . . .       |
| . . . . . . . . . .       |
| . . . . . . . . . .       |
| . . . . . . . . . .       |
| ...                       |
| . . . . . . . . . .       |
+---------------------------+
```

## Elements

### Year (top-left)

| Property       | Value                                       |
| -------------- | ------------------------------------------- |
| Font           | Doto (`font-dot`)                           |
| Size           | `--widget-size * 0.1` (`text-widget-title`) |
| Colour         | `text-theme-primary`                        |
| Letter spacing | `tracking-widest`                           |
| Line height    | `leading-none`                              |
| Format         | `{year}` (e.g. "2026")                      |

### Percentage (top-right)

| Property       | Value                                       |
| -------------- | ------------------------------------------- |
| Font           | Doto (`font-dot`)                           |
| Size           | `--widget-size * 0.1` (`text-widget-title`) |
| Colour         | `text-theme-primary`                        |
| Letter spacing | `tracking-widest`                           |
| Line height    | `leading-none`                              |
| Alignment      | Right (`text-right`)                        |
| Format         | One decimal (e.g. "74.5%")                  |

## Dot-Matrix Year

### SVG Specs

| Property   | Value                                        |
| ---------- | -------------------------------------------- |
| ViewBox    | `0 0 140 112`                                |
| Columns    | 22                                           |
| Rows       | 17                                           |
| Dot radius | `MATRIX_DOT_RADIUS` (1.8)                    |
| Fill order | Bottom row first, left to right, then upward |

- Jan 1 is the bottom-left dot; the final partial row appears at the top.
- 374 lattice cells; only `totalDays` (365 or 366) render, leaving a short trailing row.
- A leap year renders 366 dots; a common year renders 365.

### Dot Colours

| State    | Class                     | Description        |
| -------- | ------------------------- | ------------------ |
| Elapsed  | `fill-theme-primary`      | Completed days     |
| Today    | `fill-nothing-widget-red` | Current day accent |
| Upcoming | `fill-theme-inactive`     | Remaining days     |

## Behaviour

| Property        | Value                                                     |
| --------------- | --------------------------------------------------------- |
| Update interval | 60000ms (1 minute)                                        |
| Data source     | Local system clock — no IPC or backend command            |
| Year rollover   | Recomputed from the current date; dots reset on Jan 1     |
| Theme support   | Dark, Light, System, Solid, and Glass via theme tokens    |
| Fallback        | Works in the plain-browser preview (pure date arithmetic) |

### Day Math

`src/lib/year.ts` exposes `getYearProgress(now)`:

- `totalDays = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000`
- `dayOfYear` uses UTC-normalized local year/month/day, avoiding DST off-by-one errors
- `daysRemaining = totalDays - dayOfYear`
- `percent = ((dayOfYear - 1 + fractionOfDay) / totalDays) * 100`
