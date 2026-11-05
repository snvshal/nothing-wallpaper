# Widgets

Detailed design specifications for each widget.

## Shared Wrapper

All widgets are wrapped in `DraggableWidget` which provides:

| Property     | Value                                                       | Notes                                                                                  |
| ------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Size         | Width 9 units (`--widget-size`; 180px default)              | Height varies by widget (4-9 units)                                                    |
| Background   | `bg-nothing-black`                                          | Pure black `#000000`                                                                   |
| Border       | `border-nothing-white/20`                                   | 1px, 20% white opacity                                                                 |
| Drag border  | `border-nothing-widget-red`                                 | Widget Red `#D71920` when dragging                                                     |
| Drag z-index | 50                                                          | Rises above other widgets                                                              |
| Idle z-index | 10                                                          | Normal stacking                                                                        |
| Transition   | `left/top/transform` `0.22s cubic-bezier(0.2, 0.8, 0.2, 1)` | Smooth snap animation on drop; none while dragging                                     |
| Grid snap    | 1 unit                                                      | Positions snap to nearest grid unit                                                    |
| Padding      | 1 unit (`var(--unit)`)                                      | Inner padding; clock, digital time, Wi-Fi, Bluetooth, and volume opt out (`noPadding`) |
| Edge padding | 1 unit                                                      | Lattice-aligned reserved border band                                                   |
| Collision    | Enabled                                                     | Widgets cannot overlap                                                                 |

## Widgets

| Widget       | File                               | Description                     |
| ------------ | ---------------------------------- | ------------------------------- |
| Clock        | [clock.md](clock.md)               | Circular analog clock           |
| Digital Time | [digital-time.md](digital-time.md) | Capsule digital clock           |
| Calendar     | [calendar.md](calendar.md)         | Date display with day name      |
| Weather      | [weather.md](weather.md)           | Live weather display            |
| RAM          | [ram.md](ram.md)                   | Real-time memory monitor        |
| Wi-Fi        | [wifi.md](wifi.md)                 | Interactive quick toggle        |
| Bluetooth    | [bluetooth.md](bluetooth.md)       | Circular quick toggle           |
| Volume       | [volume.md](volume.md)             | Circular mute quick toggle      |
| Music        | [music.md](music.md)               | Spinning CD media player        |
| Visualizer   | [visualizer.md](visualizer.md)     | Live dotted system spectrum     |
| Screen Time  | [screentime.md](screentime.md)     | Live active app usage tracker   |
| Sand Timer   | [countdown.md](countdown.md)       | Live 1-minute digital sandglass |
| Year         | [year.md](year.md)                 | Year-in-dots progress tracker   |
