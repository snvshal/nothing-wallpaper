export const UNITS_PER_WIDGET = 9;
export const DEFAULT_UNIT = 20;
export const UNIT_OPTIONS = [12, 16, 20, 24];

export const WIDGET_UNIT_SIZES: Record<string, { w: number; h: number }> = {
  clock: { w: 9, h: 9 },
  calendar: { w: 9, h: 9 },
  weather: { w: 9, h: 9 },
  ram: { w: 9, h: 9 },
  wifi: { w: 9, h: 4 },
  bluetooth: { w: 4, h: 4 },
  volume: { w: 4, h: 4 },
  music: { w: 19, h: 9 },
  screentime: { w: 9, h: 9 },
  countdown: { w: 9, h: 9 },
};

export interface GridMetrics {
  unit: number;
  widgetSize: number;
  grid: number;
  gap: number;
  margin: number;
  footprint: number;
}

export function gridMetrics(unit: number = DEFAULT_UNIT): GridMetrics {
  return {
    unit,
    widgetSize: UNITS_PER_WIDGET * unit,
    grid: unit,
    gap: unit,
    margin: unit,
    footprint: (UNITS_PER_WIDGET + 1) * unit,
  };
}

export function getWidgetPixelSize(id: string, m: GridMetrics): { w: number; h: number } {
  const units = WIDGET_UNIT_SIZES[id] ?? { w: 9, h: 9 };
  return {
    w: units.w * m.unit,
    h: units.h * m.unit,
  };
}

export interface Screen {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export const DEFAULT_POSITION_UNITS: Record<string, Position> = {
  calendar: { x: 1, y: 1 },
  clock: { x: 11, y: 1 },
  weather: { x: 1, y: 44 },
  screentime: { x: 11, y: 44 },
  countdown: { x: 76, y: 1 },
  ram: { x: 86, y: 1 },
  bluetooth: { x: 76, y: 39 },
  volume: { x: 81, y: 39 },
  wifi: { x: 86, y: 39 },
  music: { x: 76, y: 44 },
};

export interface ScreenGridOffsets {
  numCols: number;
  numRows: number;
  remX: number;
  remY: number;
  offsetX: number;
  offsetY: number;
}

export function getScreenGridOffsets(screen: Screen, m: GridMetrics): ScreenGridOffsets {
  const numCols = Math.max(1, Math.floor(screen.width / m.grid));
  const numRows = Math.max(1, Math.floor(screen.height / m.grid));
  const remX = screen.width - numCols * m.grid;
  const remY = screen.height - numRows * m.grid;
  const offsetX = Math.floor(remX / 2);
  const offsetY = Math.floor(remY / 2);
  return { numCols, numRows, remX, remY, offsetX, offsetY };
}

export function defaultPositions(m: GridMetrics, screen?: Screen): Record<string, Position> {
  const { offsetX, offsetY, numCols, numRows } = screen
    ? getScreenGridOffsets(screen, m)
    : { offsetX: 0, offsetY: 0, numCols: 96, numRows: 54 };

  const isWide = numCols >= 42;
  const rightX = isWide ? numCols - 1 : 20;
  const bottomY = Math.max(15, numRows - 1);
  const musicY = bottomY - 9;
  const quickControlsY = musicY - 1 - 4;

  const u = m.unit;
  return {
    calendar: { x: offsetX + 1 * u, y: offsetY + 1 * u },
    clock: { x: offsetX + 11 * u, y: offsetY + 1 * u },
    weather: { x: offsetX + 1 * u, y: offsetY + musicY * u },
    screentime: { x: offsetX + 11 * u, y: offsetY + musicY * u },
    countdown: { x: offsetX + (rightX - 19) * u, y: offsetY + 1 * u },
    ram: { x: offsetX + (rightX - 9) * u, y: offsetY + 1 * u },
    bluetooth: { x: offsetX + (rightX - 19) * u, y: offsetY + quickControlsY * u },
    volume: { x: offsetX + (rightX - 14) * u, y: offsetY + quickControlsY * u },
    wifi: { x: offsetX + (rightX - 9) * u, y: offsetY + quickControlsY * u },
    music: { x: offsetX + (rightX - 19) * u, y: offsetY + musicY * u },
  };
}

export function rescalePositions(
  positions: Record<string, Position>,
  fromUnit: number,
  toUnit: number,
): Record<string, Position> {
  if (fromUnit === toUnit) return positions;
  const out: Record<string, Position> = {};
  for (const [id, pos] of Object.entries(positions)) {
    out[id] = {
      x: Math.round(pos.x / fromUnit) * toUnit,
      y: Math.round(pos.y / fromUnit) * toUnit,
    };
  }
  return out;
}

function rectsOverlap(
  posA: Position,
  sizeA: { w: number; h: number },
  posB: Position,
  sizeB: { w: number; h: number },
  gap: number,
): boolean {
  return (
    posA.x < posB.x + sizeB.w + gap &&
    posA.x + sizeA.w + gap > posB.x &&
    posA.y < posB.y + sizeB.h + gap &&
    posA.y + sizeA.h + gap > posB.y
  );
}

export function snap(value: number, m: GridMetrics, offset: number = 0): number {
  return offset + Math.round((value - offset) / m.grid) * m.grid;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function screenBounds(screen: Screen, m: GridMetrics, id?: string): Bounds {
  const size = id ? getWidgetPixelSize(id, m) : { w: m.widgetSize, h: m.widgetSize };
  const { offsetX, offsetY, numCols, numRows } = getScreenGridOffsets(screen, m);
  const minX = offsetX + m.margin;
  const minY = offsetY + m.margin;
  const maxX = Math.max(minX, offsetX + (numCols - 1) * m.grid - size.w);
  const maxY = Math.max(minY, offsetY + (numRows - 1) * m.grid - size.h);
  return { minX, minY, maxX, maxY };
}

export function clampToScreen(p: Position, screen: Screen, m: GridMetrics, id?: string): Position {
  const { minX, minY, maxX, maxY } = screenBounds(screen, m, id);
  const { offsetX, offsetY } = getScreenGridOffsets(screen, m);
  return {
    x: Math.min(maxX, Math.max(minX, snap(p.x, m, offsetX))),
    y: Math.min(maxY, Math.max(minY, snap(p.y, m, offsetY))),
  };
}

export function collidesWithAny(
  id: string,
  pos: Position,
  positions: Record<string, Position>,
  m: GridMetrics,
): boolean {
  const sizeA = getWidgetPixelSize(id, m);
  for (const [otherId, other] of Object.entries(positions)) {
    if (otherId === id) continue;
    const sizeB = getWidgetPixelSize(otherId, m);
    if (rectsOverlap(pos, sizeA, other, sizeB, m.gap)) return true;
  }
  return false;
}

export function findFreePosition(
  placed: Record<string, Position>,
  id: string,
  screen: Screen,
  m: GridMetrics,
): Position | null {
  const { minX, minY, maxX, maxY } = screenBounds(screen, m, id);
  for (let y = minY; y <= maxY; y += m.grid) {
    for (let x = minX; x <= maxX; x += m.grid) {
      const candidate = { x, y };
      if (!collidesWithAny(id, candidate, placed, m)) return candidate;
    }
  }
  return null;
}

export interface LayoutResult {
  placed: Record<string, Position>;
  skipped: string[];
}

export function evaluateLayout(
  visibleIds: string[],
  positions: Record<string, Position>,
  screen: Screen,
  m: GridMetrics,
): LayoutResult {
  const placed: Record<string, Position> = {};
  const skipped: string[] = [];
  const defaults = defaultPositions(m, screen);

  for (const id of visibleIds) {
    const saved = positions[id];
    const bounds = screenBounds(screen, m, id);
    let candidate = clampToScreen(
      saved ?? defaults[id] ?? { x: bounds.minX, y: bounds.minY },
      screen,
      m,
      id,
    );
    if (collidesWithAny(id, candidate, placed, m)) {
      const rescued = findFreePosition(placed, id, screen, m);
      if (!rescued) {
        skipped.push(id);
        continue;
      }
      candidate = rescued;
    }
    placed[id] = candidate;
  }

  return { placed, skipped };
}
