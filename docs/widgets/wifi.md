# Wi-Fi Widget

Interactive 9x4 rectangular card widget with live connection status, speed monitor, and direct desktop toggle.

## DraggableWidget Config

| Property         | Value                         |
| ---------------- | ----------------------------- |
| Size             | 9x4 grid units (144px x 64px) |
| Border radius    | Capsule / Pill (`9999px`)     |
| Padding          | Default (`p-4` / `16px`)      |
| Initial position | `{ x: 26, y: 6 }` (units)     |

## Layout

Two-column horizontal card layout:

```
+---------------------------+
|  ((•))   VIKAS_5G_5G      |   <-- Solid fan icon + SSID (or "No Internet")
|          ↓ 4.2 MB/s ↑ 1.1 |   <-- Live network speeds (Rx / Tx)
+---------------------------+
```

## Elements

### Solid Cone Wi-Fi Icon (Left)

| Property    | Value                                                            |
| ----------- | ---------------------------------------------------------------- |
| Visual      | Single fully filled solid cone / circular sector (Nothing OS UI) |
| State (On)  | Nothing Widget Red (`#D71920`) solid filled cone                 |
| State (Off) | Theme muted grey (`--theme-text-muted`) with diagonal slash      |
| Position    | Vertically centered on the left                                  |

### Network Information (Right Column)

| Property    | Value                                                             |
| ----------- | ----------------------------------------------------------------- |
| Top line    | SSID name in `font-body` (or `No Internet` / `Wi-Fi Off`)         |
| Bottom line | Live throughput `↓ {rx} ↑ {tx}` in `font-dot` (or `Disconnected`) |
| Interactive | Clicking card toggles Wi-Fi                                       |

## Behaviour

| Property        | Value                                           |
| --------------- | ----------------------------------------------- |
| Update interval | 3000ms (3 seconds)                              |
| Data source     | Native Win32 WLAN FFI + `sysinfo::Networks`     |
| Toggle action   | `invoke("toggle_wifi")`                         |
| Fallback        | Interactive mock state in plain-browser preview |
