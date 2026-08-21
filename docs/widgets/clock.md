# Clock Widget

Circular analog clock inspired by Nothing Phone lockscreen.

## DraggableWidget Config

| Property         | Value                   |
| ---------------- | ----------------------- |
| Border radius    | `50%`                   |
| Padding          | None (`noPadding=true`) |
| Initial position | `{ x: 96, y: 96 }`      |

## Layout

Centered circular face filling the entire widget. Three layered elements rotate around the center point.

```
+---------------------------+
|                           |
|        [hour hand]        |
|            |              |
|       ----O---- [minute]  |
|            |              |
|            . [second]     |
|                           |
+---------------------------+
```

## Elements

### Hour Hand

| Property         | Value                                          |
| ---------------- | ---------------------------------------------- |
| Colour           | `bg-nothing-white` (`#FFFFFF`)                 |
| Width            | `12%` of widget                                |
| Height           | `30%` of widget                                |
| Position         | Centered horizontally (`left: calc(50% - 6%)`) |
| Vertical         | `top: calc(50% - 24%)`                         |
| Transform origin | `50% 80%` (pivot near bottom)                  |
| Border radius    | Rounded (full)                                 |
| z-index          | 10                                             |

### Minute Hand

| Property         | Value                                            |
| ---------------- | ------------------------------------------------ |
| Colour           | `bg-nothing-dgrey` (`#6e6e6e`)                   |
| Width            | `3%` of widget                                   |
| Height           | `36%` of widget                                  |
| Position         | Centered horizontally (`left: calc(50% - 1.5%)`) |
| Vertical         | `top: calc(50% - 36%)`                           |
| Transform origin | `50% 100%` (pivot at very bottom)                |
| Border radius    | Rounded (full)                                   |
| z-index          | 20                                               |

### Second Indicator

| Property      | Value                                          |
| ------------- | ---------------------------------------------- |
| Colour        | `bg-nothing-red` (`#C8102E`)                   |
| Size          | `--widget-size * 0.03` (both width and height) |
| Position      | Centered horizontally                          |
| Vertical      | `marginTop: 4%` from top                       |
| Border radius | Full circle                                    |
| z-index       | 30                                             |

## Rotation Math

```
secondAngle = seconds * 6
minuteAngle = minutes * 6 + seconds * 0.1
hourAngle   = hours * 30 + minutes * 0.5
```

- Second hand: completes full rotation every 60 seconds (360 / 60 = 6 degrees per second)
- Minute hand: 6 degrees per minute, with sub-second smoothing from seconds
- Hour hand: 30 degrees per hour (360 / 12), with minute offset for smooth movement

## Behaviour

| Property        | Value                            |
| --------------- | -------------------------------- |
| Update interval | 1000ms (1 second)                |
| Data source     | `new Date()` (local system time) |
| 12-hour format  | Yes (`getHours() % 12`)          |
