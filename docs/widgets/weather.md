# Weather Widget

Static weather display with cloud emoji, temperature, and city name.

## DraggableWidget Config

| Property         | Value                         |
| ---------------- | ----------------------------- |
| Border radius    | `var(--radius-widget)` (24px) |
| Padding          | Default (`p-4`, 16px)         |
| Initial position | `{ x: 96, y: 256 }`           |

## Layout

Three-row vertical flex column: temperature at top, cloud emoji centered, city name at bottom.

```
+---------------------------+
|                    28deg  |
|                           |
|             cloud         |
|                           |
|  Villupuram               |
+---------------------------+
```

## Elements

### Temperature

| Property | Value                          |
| -------- | ------------------------------ |
| Font     | Doto (`font-dot`)              |
| Size     | `--widget-size * 0.1`          |
| Colour   | `#FFFFFF` (white)              |
| Position | Top-right (`flex justify-end`) |
| Case     | Uppercase                      |
| Content  | Static `28°` (placeholder)     |

### Cloud Emoji (main visual)

| Property    | Value                                                 |
| ----------- | ----------------------------------------------------- |
| Font        | Noto Emoji (`font-emoji`)                             |
| Size        | `--widget-size * 0.39`                                |
| Colour      | `#FFFFFF` (white)                                     |
| Position    | Centered (`my-auto flex items-center justify-center`) |
| Character   | `U+2601` (cloud)                                      |
| Line height | `leading-none`                                        |

### City Name

| Property       | Value                             |
| -------------- | --------------------------------- |
| Font           | Google Sans Code (`font-body`)    |
| Size           | `--widget-size * 0.07`            |
| Colour         | `text-nothing-ngrey` (`#DCD7D2`)  |
| Position       | Bottom-left (default flex)        |
| Letter spacing | `tracking-wider`                  |
| Case           | Sentence case                     |
| Content        | Static `Villupuram` (placeholder) |

## Behaviour

| Property        | Value                                     |
| --------------- | ----------------------------------------- |
| Data source     | None (static placeholder)                 |
| Update interval | N/A                                       |
| Future: API     | Could integrate weather API for live data |
