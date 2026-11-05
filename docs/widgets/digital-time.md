# Digital Time Widget

12-hour digital clock in a 9x4 capsule, matching the Wi-Fi quick-toggle silhouette.

## DraggableWidget Config

| Property         | Value                         |
| ---------------- | ----------------------------- |
| Size             | 9x4 grid units (180px x 80px) |
| Border radius    | Capsule / Pill (`9999px`)     |
| Padding          | None (`noPadding=true`)       |
| Inner padding    | `0.5u` on all sides           |
| Initial position | `{ x: 31, y: 1 }` (units)     |

## Layout

Centered single row inside the capsule; the period sits on the time baseline:

```
+---------------------------+
|        09:41 AM           |
+---------------------------+
```

## Elements

### Time

| Property       | Value                                       |
| -------------- | ------------------------------------------- |
| Font           | Google Sans Code (`font-body`)              |
| Size           | `--widget-size * 0.21` (`text-widget-time`) |
| Colour         | `text-theme-primary`                        |
| Format         | 12-hour `HH:MM` with a leading-zero hour    |
| Letter spacing | `tracking-tight`                            |
| Line height    | `leading-none`                              |
| Numerals       | Tabular (`tabular-nums`)                    |

### AM/PM Period

| Property       | Value                                          |
| -------------- | ---------------------------------------------- |
| Font           | Doto (`font-dot`)                              |
| Size           | `--widget-size * 0.085` (`text-widget-period`) |
| Colour         | `text-theme-primary`                           |
| Position       | Inline after the time, baseline-aligned        |
| Gap            | `calc(var(--unit) * 0.2)`                      |
| Letter spacing | `tracking-widest`                              |
| Line height    | `leading-none`                                 |
| Format         | `AM` or `PM`                                   |

## Behaviour

| Property        | Value                                            |
| --------------- | ------------------------------------------------ |
| Update interval | 1000ms (1 second)                                |
| Data source     | `new Date()` (local system time)                 |
| Format          | 12-hour, leading-zero hour, no seconds           |
| Accessibility   | Semantic `<time>` with a full spoken time label  |
| Fallback        | Works in the plain-browser preview (local date)  |
| Theme support   | Dark, Light, System, Solid, and Glass via tokens |
