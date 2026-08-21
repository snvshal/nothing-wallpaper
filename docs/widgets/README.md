# Widgets

Detailed design specifications for each widget.

## Shared Wrapper

All widgets are wrapped in `DraggableWidget` which provides:

| Property     | Value                                  | Notes                                              |
| ------------ | -------------------------------------- | -------------------------------------------------- |
| Size         | 144px x 144px                          | `--widget-size` CSS variable                       |
| Background   | `bg-black`                             | Pure black `#000000`                               |
| Border       | `border-white/20`                      | 1px, 20% white opacity                             |
| Drag border  | `border-nothing-red`                   | N-Red `#C8102E` when dragging                      |
| Drag opacity | 0.9                                    | Widget becomes slightly transparent while dragging |
| Drag z-index | 50                                     | Rises above other widgets                          |
| Idle z-index | 10                                     | Normal stacking                                    |
| Transition   | `0.22s cubic-bezier(0.2, 0.8, 0.2, 1)` | Smooth snap animation                              |
| Grid snap    | 16px                                   | Positions snap to nearest 16px grid unit           |
| Edge padding | 16px (1 unit)                          | Lattice-aligned reserved border band               |
| Collision    | Enabled                                | Widgets cannot overlap                             |

## Widgets

| Widget   | File                       | Description                |
| -------- | -------------------------- | -------------------------- |
| Clock    | [clock.md](clock.md)       | Circular analog clock      |
| Calendar | [calendar.md](calendar.md) | Date display with day name |
| Weather  | [weather.md](weather.md)   | Static weather display     |
| RAM      | [ram.md](ram.md)           | Real-time memory monitor   |
