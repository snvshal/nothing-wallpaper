# Screen Time Widget

Nothing OS / Digital Wellbeing-style interactive activity tracker with two flippable modes: **Today View** (top active apps & durations) and **10-Day History Matrix View** (20×10 dot matrix histogram showing daily screen time).

## DraggableWidget Config

| Property         | Value                             |
| ---------------- | --------------------------------- |
| Size             | 9x9 grid units (144px x 144px)    |
| Border radius    | Standard (`var(--radius-widget)`) |
| Padding          | Default (`p-4` / `16px`)          |
| Initial position | `{ x: 6, y: 26 }` (units)         |
| Interaction      | Click to toggle Today / History   |

## Layouts

### 1. Today View (Default)

```
+-----------------------------------+
| (•)                        4H15M  |  <- Top: 16x16px red circle (left) & Total (right)
|                                   |
| VS Code                    2H15M |  <- Bottom: Top 3 most-used apps
| Chrome                      1H15M |
| Spotify                      30M |
| Other                        15M |  <- 4th category: remainder of total time
+-----------------------------------+
```

### 2. 10-Day History Matrix View (On Click)

```
+-----------------------------------+
| HISTORY                        6H |  <- Top: History label (left) & Target hour (right)
|                                   |
| o o o o o o o o o o • • o o o o o |  <- Bottom: 20 columns (2 cols per day)
| o o o o o o o o o o • • o o o o o |  <- 10 vertical rows (0% to 100% height)
| o o • • o o o o o o • • o o • • • |  <- • = fill-theme-primary / active
| • • • • o o • • o o • • • • • • • |  <- o = fill-theme-inactive / grey
| • • • • • • • • • • • • • • • • • |
| • • • • • • • • • • • • • • • • • |
+-----------------------------------+
```

## Elements

### Today View

| Property     | Value                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Header Left  | Red circle with `var(--text-widget-title)` size token (`rounded-full bg-nothing-widget-red`)    |
| Header Right | Today's total duration in `font-dot text-theme-primary text-widget-title` (`H`/`M` sub-sized)   |
| App List     | Top 3 apps + "Other" in `text-widget-subtitle font-body text-theme-primary` (`H`/`M` sub-sized) |

### 10-Day History Matrix View

| Property      | Value                                                                              |
| ------------- | ---------------------------------------------------------------------------------- |
| Header Left   | `HISTORY` in `font-dot text-theme-primary tracking-widest text-widget-title`       |
| Header Right  | Rounded target hour (e.g. `6H`) in `font-dot text-theme-primary text-widget-title` |
| Matrix Grid   | SVG 20 columns × 10 rows (`viewBox="0 0 140 68"`, 2 columns per day for 10 days)   |
| Dot Scaling   | Proportional to rounded target hour (`daySeconds / targetMaxSeconds * 10`)         |
| Active Dots   | `fill-theme-primary` (solid theme token)                                           |
| Inactive Dots | `fill-theme-inactive` (grey inactive theme token)                                  |

## Behaviour

| Property        | Value                                                                |
| --------------- | -------------------------------------------------------------------- |
| Interaction     | Single click anywhere on the widget toggles Today / History view     |
| Update interval | 1 minute (60,000ms) UI poll; 1000ms native background tracker thread |
| Data source     | Win32 `GetForegroundWindow` + `QueryFullProcessImageNameW`           |
| History Window  | 10 days stored in memory & updated on each session                   |
| Daily Reset     | Automatically creates a new day bucket at midnight local time        |
| Performance     | Non-blocking in-memory Mutex cache (`get_screen_time` < 0.001ms)     |
| Fallback        | Realistic interactive mock data during plain-browser preview         |
