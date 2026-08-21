# Calendar Widget

Large date display with day name accent in Nothing style.

## DraggableWidget Config

| Property         | Value                         |
| ---------------- | ----------------------------- |
| Border radius    | `var(--radius-widget)` (16px) |
| Padding          | Default (`p-4`, 16px)         |
| Initial position | `{ x: 256, y: 96 }`           |

## Layout

Centered date number with day name positioned in the top-right corner.

```
+---------------------------+
|                     MON   |
|                           |
|            21             |
|                           |
|                           |
+---------------------------+
```

## Elements

### Day Number (main)

| Property        | Value                          |
| --------------- | ------------------------------ |
| Font            | NType82 Regular (`font-ntype`) |
| Size            | `--widget-size * 0.39`         |
| Colour          | `#FFFFFF` (white)              |
| Position        | Centered in widget             |
| Vertical offset | `translate-y-2` (8px down)     |
| Letter spacing  | `tracking-wider`               |
| Line height     | `leading-none`                 |
| Case            | Numeric (no case)              |

### Day Name (accent)

| Property       | Value                                     |
| -------------- | ----------------------------------------- |
| Font           | NDot 55 (`font-ndot`)                     |
| Size           | `--widget-size * 0.07`                    |
| Colour         | `text-nothing-red` (`#C8102E`)            |
| Position       | `absolute top-0 right-0`                  |
| Letter spacing | `tracking-wider`                          |
| Case           | Uppercase (via `toUpperCase()`)           |
| Format         | 3-letter abbreviation (e.g. "MON", "TUE") |

## Behaviour

| Property        | Value                                   |
| --------------- | --------------------------------------- |
| Update interval | 60000ms (1 minute)                      |
| Data source     | `new Date()` (local system time)        |
| Locale          | `en-US`                                 |
| Day format      | Short weekday name (`weekday: "short"`) |
