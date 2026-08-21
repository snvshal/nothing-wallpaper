export const WIDGET_SIZE = 144;
export const GRID = 16;
export const GAP = 16;
export const MARGIN = GRID;

export interface Screen {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

const FOOTPRINT = WIDGET_SIZE + GAP;

function overlaps(a: Position, b: Position): boolean {
  return (
    a.x < b.x + FOOTPRINT && a.x + FOOTPRINT > b.x && a.y < b.y + FOOTPRINT && a.y + FOOTPRINT > b.y
  );
}

export function snap(value: number): number {
  return Math.round(value / GRID) * GRID;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function screenBounds(screen: Screen): Bounds {
  const floorToLattice = (v: number) =>
    Math.max(MARGIN, MARGIN + Math.max(0, Math.floor((v - MARGIN) / GRID)) * GRID);
  return {
    minX: MARGIN,
    minY: MARGIN,
    maxX: floorToLattice(screen.width - MARGIN - WIDGET_SIZE),
    maxY: floorToLattice(screen.height - MARGIN - WIDGET_SIZE),
  };
}

export function clampToScreen(p: Position, screen: Screen): Position {
  const { minX, minY, maxX, maxY } = screenBounds(screen);
  return {
    x: Math.min(maxX, Math.max(minX, snap(p.x))),
    y: Math.min(maxY, Math.max(minY, snap(p.y))),
  };
}

export function inBounds(p: Position, screen: Screen): boolean {
  return (
    p.x >= MARGIN &&
    p.y >= MARGIN &&
    p.x + WIDGET_SIZE <= screen.width - MARGIN &&
    p.y + WIDGET_SIZE <= screen.height - MARGIN
  );
}

export function collidesWithAny(
  id: string,
  pos: Position,
  positions: Record<string, Position>,
): boolean {
  for (const [otherId, other] of Object.entries(positions)) {
    if (otherId === id) continue;
    if (overlaps(pos, other)) return true;
  }
  return false;
}

export function findFreePosition(
  placed: Record<string, Position>,
  id: string,
  screen: Screen,
): Position | null {
  const { minX, minY, maxX, maxY } = screenBounds(screen);
  for (let y = minY; y <= maxY; y += GRID) {
    for (let x = minX; x <= maxX; x += GRID) {
      const candidate = { x, y };
      if (!collidesWithAny(id, candidate, placed)) return candidate;
    }
  }
  return null;
}

export interface LayoutResult {
  placed: Record<string, Position>;
  skipped: string[];
}

export const DEFAULT_POSITIONS: Record<string, Position> = {
  clock: { x: 96, y: 96 },
  calendar: { x: 256, y: 96 },
  weather: { x: 96, y: 256 },
  ram: { x: 256, y: 256 },
};

export function evaluateLayout(
  visibleIds: string[],
  positions: Record<string, Position>,
  screen: Screen,
): LayoutResult {
  const placed: Record<string, Position> = {};
  const skipped: string[] = [];

  for (const id of visibleIds) {
    const saved = positions[id];
    let candidate = clampToScreen(
      saved ?? DEFAULT_POSITIONS[id] ?? { x: MARGIN, y: MARGIN },
      screen,
    );
    if (collidesWithAny(id, candidate, placed)) {
      const rescued = findFreePosition(placed, id, screen);
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
