# Audio Visualizer Widget

Live 9×9 system output visualizer. A 12-band spectrum animates inside a square dot matrix with no labels or controls.

## Layout and appearance

- Uses the standard 9×9 widget footprint, card radius, and padding.
- The SVG uses the shared `140×140` matrix coordinate space and `MATRIX_DOT_RADIUS` (`1.8`) from `src/lib/constants.ts`.
- Active dots use `fill-theme-primary`; inactive dots use `fill-theme-inactive`, matching the RAM and Sand Timer matrices in light and dark themes.
- Twelve frequency bands rise from the bottom edge. The label-free square matrix scales with the grid unit.
- No album metadata or playback controls; the existing Music widget remains the playback surface.
- Keep the spectrum monochrome: the design guide reserves colored fills from graphics. Nothing Widget Red remains available for interactive or status accents elsewhere in the widget system.

## Audio and behavior

- Windows WASAPI shared-mode loopback captures the default output endpoint only while the widget is enabled; samples are analyzed in memory and not saved or transmitted.
- Native code calculates 12 Goertzel frequency bands and exposes only normalized levels through `get_audio_visualizer_levels`.
- Disabling the widget stops capture and clears the levels. Capture setup and device errors trigger a retry while the widget remains enabled.
- The native analyzer applies an immediate attack and slower decay, including a fade to silence when output pauses; the UI polls its levels at 20 Hz.
- Browser preview uses a synthetic moving spectrum.
