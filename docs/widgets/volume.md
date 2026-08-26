# Volume Mute Widget

Interactive 4x4 circular quick-toggle button widget with live Windows master audio mute status, volume readout, and direct desktop toggle.

## DraggableWidget Config

| Property         | Value                                 |
| ---------------- | ------------------------------------- |
| Size             | 4x4 grid units (64px x 64px)          |
| Border radius    | Circular (`50%` / `rounded-full`)     |
| Padding          | Opts out (`noPadding` / edge-to-edge) |
| Initial position | `{ x: 41, y: 6 }` (units)             |

## Layout

Centered circular quick-toggle button:

```
+-------+
|  ))   |   <-- Nothing OS Minimal Speaker Glyph
| |>))  |   <-- Red when Muted, Muted Secondary Gray when Sound On
+-------+
```

## Elements

### Speaker Silhouette Icon

| Property      | Value                                                                      |
| ------------- | -------------------------------------------------------------------------- |
| Visual        | Minimal vector speaker with sound waves / diagonal cross                   |
| State (Muted) | Nothing Widget Red background (`bg-nothing-widget-red`) with white icon    |
| State (On)    | Transparent background with clean muted grey icon (`text-theme-secondary`) |
| Interactive   | Clicking toggles Windows master audio mute / unmute                        |

## Behaviour

| Property        | Value                                           |
| --------------- | ----------------------------------------------- |
| Update interval | 2000ms (2 seconds)                              |
| Data source     | Native Win32 CoreAudio IAudioEndpointVolume FFI |
| Toggle action   | `invoke("toggle_audio_mute")`                   |
| Fallback        | Interactive mock state in plain-browser preview |
