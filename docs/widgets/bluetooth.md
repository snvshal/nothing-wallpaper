# Bluetooth Widget

Interactive 4x4 circular quick-toggle button widget with live Bluetooth radio status and direct desktop toggle.

## DraggableWidget Config

| Property         | Value                                 |
| ---------------- | ------------------------------------- |
| Size             | 4x4 grid units (64px x 64px)          |
| Border radius    | Circular (`50%` / `rounded-full`)     |
| Padding          | Opts out (`noPadding` / edge-to-edge) |
| Initial position | `{ x: 36, y: 6 }` (units)             |

## Layout

Centered circular quick-toggle button:

```
+-------+
|  /|\  |   <-- Nothing OS Bluetooth Bind-Rune
|  \|/  |   <-- Red when On, Muted Slash when Off
+-------+
```

## Elements

### Bluetooth Rune Icon

| Property    | Value                                                                             |
| ----------- | --------------------------------------------------------------------------------- |
| Visual      | Minimal vector Bluetooth bind-rune (Nothing OS Quick Settings UI)                 |
| State (On)  | Nothing Widget Red background (`bg-nothing-widget-red`) with white rune           |
| State (Off) | Transparent background with clean muted grey rune (`text-theme-muted`) (no slash) |
| Interactive | Clicking toggles Windows Bluetooth radio on / off                                 |

## Behaviour

| Property        | Value                                             |
| --------------- | ------------------------------------------------- |
| Update interval | 3000ms (3 seconds)                                |
| Data source     | Native Windows.Devices.Radios WinRT API (0.000ms) |
| Toggle action   | `invoke("toggle_bluetooth")`                      |
| Fallback        | Interactive mock state in plain-browser preview   |
