export const UNITS_PER_WIDGET = 9;
export const DEFAULT_UNIT = 16;
export const UNIT_OPTIONS = [12, 16, 20, 24];

export const WIDGET_UNIT_SIZES: Record<string, { w: number; h: number }> = {
  clock: { w: 9, h: 9 },
  calendar: { w: 9, h: 9 },
  weather: { w: 9, h: 9 },
  ram: { w: 9, h: 9 },
  wifi: { w: 9, h: 4 },
  bluetooth: { w: 4, h: 4 },
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

const DEFAULT_POSITION_UNITS: Record<string, Position> = {
  clock: { x: 6, y: 6 },
  calendar: { x: 16, y: 6 },
  weather: { x: 6, y: 16 },
  ram: { x: 16, y: 16 },
  wifi: { x: 26, y: 6 },
  bluetooth: { x: 36, y: 6 },
  music: { x: 26, y: 11 },
  screentime: { x: 6, y: 26 },
  countdown: { x: 16, y: 26 },
};

export function defaultPositions(m: GridMetrics): Record<string, Position> {
  const out: Record<string, Position> = {};
  for (const [id, pos] of Object.entries(DEFAULT_POSITION_UNITS)) {
    out[id] = { x: pos.x * m.unit, y: pos.y * m.unit };
  }
  return out;
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

export function snap(value: number, m: GridMetrics): number {
  return Math.round(value / m.grid) * m.grid;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function screenBounds(screen: Screen, m: GridMetrics, id?: string): Bounds {
  const size = id ? getWidgetPixelSize(id, m) : { w: m.widgetSize, h: m.widgetSize };
  const floorToLattice = (v: number) =>
    Math.max(m.margin, m.margin + Math.max(0, Math.floor((v - m.margin) / m.grid)) * m.grid);
  return {
    minX: m.margin,
    minY: m.margin,
    maxX: floorToLattice(screen.width - m.margin - size.w),
    maxY: floorToLattice(screen.height - m.margin - size.h),
  };
}

export function clampToScreen(p: Position, screen: Screen, m: GridMetrics, id?: string): Position {
  const { minX, minY, maxX, maxY } = screenBounds(screen, m, id);
  return {
    x: Math.min(maxX, Math.max(minX, snap(p.x, m))),
    y: Math.min(maxY, Math.max(minY, snap(p.y, m))),
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
  const defaults = defaultPositions(m);

  for (const id of visibleIds) {
    const saved = positions[id];
    let candidate = clampToScreen(
      saved ?? defaults[id] ?? { x: m.margin, y: m.margin },
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
