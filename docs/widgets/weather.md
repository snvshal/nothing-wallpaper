# Weather Widget

Live meteorological weather display with condition emoji, temperature, and city name.

## DraggableWidget Config

| Property         | Value                         |
| ---------------- | ----------------------------- |
| Border radius    | `var(--radius-widget)` (24px) |
| Padding          | Default (`p-4`, 16px)         |
| Initial position | `{ x: 96, y: 256 }`           |

## Layout

Three-row vertical flex column: temperature at top, condition emoji centered, city name at bottom.

```
+---------------------------+
|                    28deg  |
|                           |
|             cloud         |
|                           |
|  London                   |
+---------------------------+
```

## Elements

### Temperature

| Property | Value                          |
| -------- | ------------------------------ |
| Font     | Doto (`font-dot`)              |
| Size     | `--widget-size * 0.1`          |
| Colour   | `--theme-text-primary`         |
| Position | Top-right (`flex justify-end`) |
| Case     | Uppercase                      |
| Content  | Live temperature (e.g. `24°`)  |

### Weather Condition Emoji (main visual)

| Property    | Value                                                                                   |
| ----------- | --------------------------------------------------------------------------------------- |
| Font        | Noto Emoji (`font-emoji`)                                                               |
| Size        | `--widget-size * 0.39`                                                                  |
| Colour      | `--theme-text-primary`                                                                  |
| Position    | Centered (`my-auto flex items-center justify-center`)                                   |
| Line height | `leading-none`                                                                          |
| Mapping     | WMO code & day/night status to Noto Emoji glyphs (sun, 8 astronomical moon phases, etc) |

### City Name

| Property       | Value                            |
| -------------- | -------------------------------- |
| Font           | Google Sans Code (`font-body`)   |
| Size           | `--widget-size * 0.07`           |
| Colour         | `--theme-text-secondary`         |
| Position       | Bottom-left (default flex)       |
| Letter spacing | `tracking-wider`                 |
| Case           | Sentence case                    |
| Content        | Live detected or configured city |

## Behaviour

| Property        | Value                                                                   |
| --------------- | ----------------------------------------------------------------------- |
| Data source     | Open-Meteo Forecast & Geocoding APIs (free, no API key required)        |
| Location        | Auto-detected via IP geolocation or custom city name from settings      |
| Day/Night cycle | Open-Meteo `is_day` displays sun during day or live moon phase at night |
| Lunar phases    | Synodic calculation maps clear night skies to 8 moon phases (🌑 to 🌘)  |
| Update interval | 1 hour (3,600,000ms) with local cache fallback                          |
| Units           | Celsius (°C) or Fahrenheit (°F) user-configurable                       |
