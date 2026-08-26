# Sand Timer / 1-Minute Gravity Dot Matrix Widget

Nothing OS / Glyph-style live digital hourglass visualizer. 60 dots representing the 60 seconds of a minute fall from the top reservoir into the bottom chamber across a text-free **10×10 square dot matrix** (100 dots total).

## DraggableWidget Config

| Property         | Value                             |
| ---------------- | --------------------------------- |
| Size             | 9x9 grid units (144px x 144px)    |
| Border radius    | Standard (`var(--radius-widget)`) |
| Padding          | Default (`p-4` / `16px`)          |
| Initial position | `{ x: 16, y: 26 }` (units)        |

## Layout

```
+-----------------------------------+
| • • • • • • • • • •               |  <- Top Reservoir: Rows 0..5 (60 dots: 6 rows x 10 cols)
| • • • • • • • • • •               |
| • • • • • • • • • •               |
| • • • • • • • • • •               |
| • • • • • • • • • •               |
| • • • • • • • • • •               |  <- Row 5: Empties first into the chute
| o o o o • o o o o o               |  <- Mid-transit: Dot drops down its own column line
| • • • • • • • • • •               |  <- Bottom Reservoir: Rows 4..9 (60 dots: 6 rows x 10 cols)
| • • • • • • • • • •               |
| • • • • • • • • • •               |  <- Row 9: Floor base fills first
+-----------------------------------+
```

## Elements

### Dot Matrix Sandglass (10×10 Grid)

| Property       | Value                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Matrix Grid    | SVG 10 columns × 10 rows (`viewBox="0 0 140 140"`), 100 dots total (`r=1.8`)                   |
| Top Chamber    | Rows 0..5 (60 dots total); empties from lowest row (Row 5) up to ceiling (Row 0)               |
| Transit Drop   | Active falling particle travels straight down its corresponding vertical column (`col = s%10`) |
| Bottom Chamber | Rows 4..9 (60 dots total); fills and stacks layer-by-layer from floor (Row 9) upward           |
| Active Dots    | `fill-theme-primary` (solid theme token)                                                       |
| Inactive Dots  | `fill-theme-inactive` (grey inactive theme token)                                              |

## Behaviour

| Property        | Value                                                              |
| --------------- | ------------------------------------------------------------------ |
| Typography      | Zero text — pure 1:1 square digital matrix visualizer              |
| Gravity Physics | Each second, 1 dot drops down along its respective vertical column |
| Update interval | 30ms smooth animation tick synchronized with system clock          |
| Minute Reset    | 250ms snappy upward rewind lifting all 6 layers from floor to top  |
| Performance     | 0% CPU impact (GPU-accelerated vector coordinates)                 |
