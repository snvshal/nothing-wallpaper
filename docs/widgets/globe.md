# Globe Widget

Slowly rotating dot-matrix globe with a marker at the configured Weather city.

## DraggableWidget Config

| Property         | Value                                                                |
| ---------------- | -------------------------------------------------------------------- |
| Footprint        | 9×9 units                                                            |
| Border radius    | `50%` (circle)                                                       |
| Padding          | None                                                                 |
| Surface          | Transparent; opts out of the shared widget background and backdrop   |
| Border           | Shared `border-widget-subtle` 1px; Widget Red outline while dragging |
| Initial position | `41u, 1u`; `41u, 11u` when grid < 71 columns                         |

## Layout

The WebGL canvas fills the circular widget inside the shared 1px border. The globe uses scale `1.24`, so the sphere reaches the widget edge without inner padding. The canvas is masked at the sphere edge so Cobe's glow does not add a halo. The widget surface is transparent, leaving the desktop visible around the globe; solid and Frosted Glass surface settings do not apply. There are no labels, controls, or captions.

## Rendering

| Property         | Value                                                    |
| ---------------- | -------------------------------------------------------- |
| Library          | Cobe 2.0.1 (MIT)                                         |
| Canvas           | Manual canvas, WebGL2 with WebGL1 fallback               |
| Map samples      | 8000                                                     |
| Scale            | 1.24                                                     |
| Diffuse          | 1.2                                                      |
| Map brightness   | 6                                                        |
| Map dots         | Dark: `--theme-text-primary`; light: `--theme-bg-widget` |
| Glow             | `--theme-text-muted`, masked at the sphere edge          |
| Mask             | Radial mask at 99.2% of half-size                        |
| Marker           | `--color-nothing-widget-red`                             |
| Marker size      | 0.05                                                     |
| Marker elevation | 0.02                                                     |
| Dark mode        | `1` in dark theme, `0` in light theme                    |
| DPR              | `min(window.devicePixelRatio, 2)`                        |
| Frame rate       | 30 FPS, driven by the widget rather than Cobe            |
| Rotation         | `0.1 rad/s`                                              |
| Context          | `powerPreference: "low-power"; antialias: false`         |

Colours are resolved from the active CSS theme tokens at runtime; Cobe receives normalized RGB arrays.

## Behaviour

| Property         | Value                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Data source      | Shared Weather location resolver (`getLocation`)                                                             |
| Location         | Configured Weather city, or IP-based auto-detection when empty                                               |
| Initial rotation | Centered on the marker longitude                                                                             |
| City change      | Marker updates and rotation re-centers                                                                       |
| Location error   | Globe remains visible without a marker                                                                       |
| Visibility       | Animation pauses while the document is hidden                                                                |
| Fallback         | Centered globe glyph if WebGL is unavailable                                                                 |
| Accessibility    | Canvas uses `role="img"` and a city-aware `aria-label`                                                       |
| Theme support    | Dark, light, and system via existing tokens; the transparent surface ignores solid/glass and Frosted Opacity |

## Performance

- Renders at 30 FPS instead of display refresh rate.
- Caps device pixel ratio at 2.
- Pauses on `visibilitychange`.
- Uses `ResizeObserver` so resizing only updates the canvas buffer when needed.
- Releases the WebGL context and canvas buffers on unmount so disabling Globe reclaims GPU memory.
- Widget is disabled by default.
