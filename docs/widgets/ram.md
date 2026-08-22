# RAM Widget

Real-time memory usage monitor with dot-matrix graph.

## DraggableWidget Config

| Property         | Value                         |
| ---------------- | ----------------------------- |
| Border radius    | `var(--radius-widget)` (24px) |
| Padding          | Default (`p-4`, 16px)         |
| Initial position | `{ x: 256, y: 256 }`          |

## Layout

Two sections: stats row at top, dot-matrix graph filling remaining space.

```
+---------------------------+
| RAM              45.2%    |
| 16.0 GB         7.2 GB    |
|                           |
| . . . . . . . . . .      |
| . . . . . . . . . .      |
| . . O O O . . . . .      |
| . . O O O . . . . .      |
| . . O O O . . . . .      |
| O O O O O . . . . .      |
| O O O O O O . . . .      |
| O O O O O O O . . .      |
| O O O O O O O O . .      |
| O O O O O O O O O .      |
+---------------------------+
```

## Elements

### Title "RAM" (top-left)

| Property       | Value                            |
| -------------- | -------------------------------- |
| Font           | Doto (`font-dot`)                |
| Size           | `--widget-size * 0.1`            |
| Colour         | `text-nothing-white` (`#FFFFFF`) |
| Letter spacing | `tracking-widest`                |
| Line height    | `leading-none`                   |

### Total GB (below title)

| Property   | Value                            |
| ---------- | -------------------------------- |
| Font       | Google Sans Code (`font-body`)   |
| Size       | `--widget-size * 0.06`           |
| Colour     | `text-nothing-ngrey` (`#DCD7D2`) |
| Margin top | `mt-1` (4px)                     |
| Format     | `{totalGB} GB` (e.g. "16.0 GB")  |

### Percentage (top-right)

| Property       | Value                                      |
| -------------- | ------------------------------------------ |
| Font           | Doto (`font-dot`)                          |
| Size           | `--widget-size * 0.1`                      |
| Colour         | `text-nothing-white` (`#FFFFFF`)           |
| Letter spacing | `tracking-widest`                          |
| Line height    | `leading-none`                             |
| Alignment      | Right (`text-right`)                       |
| Format         | `{percent}%` with 1 decimal (e.g. "45.2%") |

### Used GB (below percentage)

| Property   | Value                            |
| ---------- | -------------------------------- |
| Font       | Google Sans Code (`font-body`)   |
| Size       | `--widget-size * 0.06`           |
| Colour     | `text-nothing-ngrey` (`#DCD7D2`) |
| Margin top | `mt-1` (4px)                     |
| Alignment  | Right (`text-right`)             |
| Format     | `{usedGB} GB` (e.g. "7.2 GB")    |

## Dot-Matrix Graph

### SVG Specs

| Property       | Value             |
| -------------- | ----------------- |
| ViewBox        | `0 0 140 68`      |
| Columns        | 20                |
| Rows           | 10                |
| Dot radius     | 1.8               |
| Column spacing | 6.8               |
| Row spacing    | 6.2               |
| Origin offset  | 5px from top-left |

### Dot Colours

| State    | Fill                     | Description      |
| -------- | ------------------------ | ---------------- |
| Active   | `#FFFFFF`                | Memory usage dot |
| Inactive | `rgba(255,255,255,0.15)` | Background dot   |

### Graph Logic

- History stores last 20 data points (one per column)
- New data pushes in from the right, oldest drops off the left
- Active rows calculated: `Math.max(1, Math.round((usedPercent / 100) * ROWS))`
- Dots fill from bottom up

## Behaviour

| Property        | Value                                            |
| --------------- | ------------------------------------------------ |
| Update interval | 2000ms (2 seconds)                               |
| Data source     | `invoke("get_memory_usage")` (Tauri IPC to Rust) |
| Rust command    | `get_memory_usage` in `src-tauri/src/lib.rs`     |
| sysinfo crate   | v0.39                                            |
| History size    | 20 data points                                   |
| Fallback        | Keeps default values (0%) if invoke fails        |

### Data Structure

```typescript
interface MemoryInfo {
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
  used_percent: number;
}
```

### GB Formatting

```typescript
function formatGB(bytes: number): string {
  return (bytes / 1073741824).toFixed(1);
}
```
