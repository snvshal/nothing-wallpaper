# Contributing to Nothing Wallpaper

Thank you for your interest in contributing to Nothing Wallpaper! This document explains our development workflow, design system standards, and provides a step-by-step checklist for building and integrating new widgets.

---

## 1. Design System Standards

Always consult [`docs/DESIGN.md`](docs/DESIGN.md) and [`docs/COPYRIGHT.md`](docs/COPYRIGHT.md) before writing frontend code.

### Colors & Themes
- **Use Theme Tokens Only**: Use semantic CSS classes (`text-theme-primary`, `text-theme-secondary`, `text-theme-muted`, `bg-widget-surface`, `border-widget-subtle`, `text-nothing-widget-red`, etc.).
- **No Raw Hex Values**: Never hardcode hex colors (`#ffffff`, `#000000`, etc.) in components.
- **Support All Theme Modes**: Widgets must render properly across **Dark**, **Light**, and **System** themes.

### Typography
- **Fonts**:
  - `font-dot` (`Doto` variable font) — uppercase dot-matrix headings, numbers, and stats.
  - `font-body` (`Google Sans Code` variable font) — sentence-case labels, names, and body text.
  - `font-emoji` (`Noto Emoji` variable font) — monochrome iconography.
- **Dynamic Sizing**: Size text and icons relative to `calc(var(--unit) * ...)` or `text-widget-*` tokens so widgets scale smoothly across all grid unit options (`12px`, `16px`, `20px`, `24px`).

### Copyright & Assets
- **Zero Proprietary Assets**: Never bundle or commit Nothing proprietary fonts (`NDot57`, `NType82`), brand logos, or copyrighted images.

---

## 2. Step-by-Step Guide: Adding a New Widget

To add a new widget (e.g. `battery`), follow these 6 steps:

### Step 1: Create the Component
Create `src/components/BatteryWidget.tsx`:
- Scale padding, gaps, fonts, and icon sizes with `calc(var(--unit) * ...)`.
- Separate interactive click actions (e.g., buttons) from the widget card surface so the card can be grabbed and dragged (`cursor: grab`).
- Always provide a realistic browser fallback (`!isTauri`) so the widget works during web development and previews.

```tsx
// src/components/BatteryWidget.tsx
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../lib/tauri";

export default function BatteryWidget() {
  const [level, setLevel] = useState(100);

  useEffect(() => {
    if (!isTauri) return; // plain-browser preview uses default state
    const fetchBattery = async () => {
      try {
        const res = await invoke<{ level: number }>("get_battery_status");
        setLevel(res.level);
      } catch {
        // Retain previous state on transient failure
      }
    };
    void fetchBattery();
    const interval = setInterval(fetchBattery, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="w-full h-full flex items-center select-none overflow-hidden"
      style={{
        padding: "calc(var(--unit) * 0.75)",
        gap: "calc(var(--unit) * 0.5)",
      }}
    >
      <span
        className="font-dot text-theme-primary leading-none"
        style={{ fontSize: "calc(var(--unit) * 0.9)" }}
      >
        {level}%
      </span>
    </div>
  );
}
```

### Step 2: Register Dimensions & Default Positions
In [`src/lib/placement.ts`](src/lib/placement.ts):
1. Add the widget footprint in grid units to `WIDGET_UNIT_SIZES`:
   ```ts
   export const WIDGET_UNIT_SIZES: Record<string, { w: number; h: number }> = {
     clock: { w: 9, h: 9 },
     calendar: { w: 9, h: 9 },
     weather: { w: 9, h: 9 },
     ram: { w: 9, h: 9 },
     wifi: { w: 9, h: 4 },
     battery: { w: 9, h: 4 }, // <-- Add your widget size here
   };
   ```
2. Add its initial grid position in `DEFAULT_POSITION_UNITS`:
   ```ts
   const DEFAULT_POSITION_UNITS: Record<string, Position> = {
     // ...
     battery: { x: 26, y: 11 },
   };
   ```

### Step 3: Register in the Wallpaper App
In [`src/App.tsx`](src/App.tsx):
1. Import your component and register it in `renderWidgetContent`:
   ```tsx
   case "battery":
     return <BatteryWidget />;
   ```
2. If your widget uses a custom border radius (e.g. `50%` circular or `9999px` capsule), add it to `WIDGET_RADIUS`:
   ```ts
   const WIDGET_RADIUS: Record<string, string> = {
     clock: "50%",
     wifi: "9999px",
     battery: "9999px",
   };
   ```

### Step 4: Add to Settings & Store
1. **Default Settings** in [`src/settings/settings-store.ts`](src/settings/settings-store.ts):
   Add the widget ID to `DEFAULTS.widgets`:
   ```ts
   widgets: {
     clock: true,
     calendar: true,
     weather: true,
     ram: true,
     wifi: true,
     battery: true, // <-- Enabled by default
   },
   ```
2. **Toggle List** in [`src/settings/WidgetToggles.tsx`](src/settings/WidgetToggles.tsx):
   Add the user-facing label to `WIDGET_LABELS`:
   ```ts
   const WIDGET_LABELS: Record<string, string> = {
     clock: "Clock",
     calendar: "Calendar",
     weather: "Weather",
     ram: "RAM Usage",
     wifi: "Wi-Fi",
     battery: "Battery",
   };
   ```

### Step 5: Rust Backend Integration (Optional)
If your widget queries Windows OS APIs:
1. Implement the Tauri command in [`src-tauri/src/lib.rs`](src-tauri/src/lib.rs):
   - Use high-performance native Win32 FFI or standard crates.
   - **Never spawn command-line subprocesses (`powershell`, `cmd`) in periodic polling loops**.
2. Register the command in `tauri::generate_handler![...]`.

### Step 6: Documentation
1. Create `docs/widgets/<widget-name>.md` documenting the footprint, typography, layout, and API behavior.
2. Link the new widget document in [`docs/widgets/README.md`](docs/widgets/README.md).

---

## 3. Verifications Before Submitting

Always run all automated formatters, linters, typecheckers, and builds before committing:

### Frontend
```sh
bun run fmt && bun run check && bun run build
```

### Backend (Rust)
```sh
bun run fmt:rs && bun run check:rs
```

---

## 4. Commit Message Guidelines

We follow lowercase Conventional Commits format:
- `feat: add battery widget with live power level monitor`
- `fix: resolve drag hit-test boundary calculation on high-dpi displays`
- `chore: update dependencies`
