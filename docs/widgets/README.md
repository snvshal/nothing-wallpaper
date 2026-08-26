# Widgets

Detailed design specifications for each widget.

## Shared Wrapper

All widgets are wrapped in `DraggableWidget` which provides:

| Property     | Value                                                       | Notes                                              |
| ------------ | ----------------------------------------------------------- | -------------------------------------------------- |
| Size         | `--widget-size` square (144px default)                      | 9 × grid unit                                      |
| Background   | `bg-nothing-black`                                          | Pure black `#000000`                               |
| Border       | `border-nothing-white/20`                                   | 1px, 20% white opacity                             |
| Drag border  | `border-nothing-widget-red`                                 | Widget Red `#D71920` when dragging                 |
| Drag z-index | 50                                                          | Rises above other widgets                          |
| Idle z-index | 10                                                          | Normal stacking                                    |
| Transition   | `left/top/transform` `0.22s cubic-bezier(0.2, 0.8, 0.2, 1)` | Smooth snap animation on drop; none while dragging |
| Grid snap    | 1 unit                                                      | Positions snap to nearest grid unit                |
| Padding      | 1 unit (`var(--unit)`)                                      | Inner padding; clock opts out (`noPadding`)        |
| Edge padding | 1 unit                                                      | Lattice-aligned reserved border band               |
| Collision    | Enabled                                                     | Widgets cannot overlap                             |

## Widgets

| Widget      | File                           | Description                     |
| ----------- | ------------------------------ | ------------------------------- |
| Clock       | [clock.md](clock.md)           | Circular analog clock           |
| Calendar    | [calendar.md](calendar.md)     | Date display with day name      |
| Weather     | [weather.md](weather.md)       | Live weather display            |
| RAM         | [ram.md](ram.md)               | Real-time memory monitor        |
| Wi-Fi       | [wifi.md](wifi.md)             | Interactive quick toggle        |
| Bluetooth   | [bluetooth.md](bluetooth.md)   | Circular quick toggle           |
| Music       | [music.md](music.md)           | Spinning CD media player        |
| Screen Time | [screentime.md](screentime.md) | Live active app usage tracker   |
| Sand Timer  | [countdown.md](countdown.md)   | Live 1-minute digital sandglass |
