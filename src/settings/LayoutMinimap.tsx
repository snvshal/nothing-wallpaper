import { useEffect, useRef, useState } from "react";
import {
  clampToScreen,
  collidesWithAny,
  findFreePosition,
  getScreenGridOffsets,
  getWidgetPixelSize,
  type GridMetrics,
  type Position,
  type Screen,
} from "../lib/placement";

interface LayoutMinimapProps {
  widgets: Record<string, boolean>;
  placed: Record<string, Position>;
  positions: Record<string, Position>;
  screen: Screen;
  metrics: GridMetrics;
  noSpaceIds: string[];
  onChange: (positions: Record<string, Position>) => void;
}

const LABELS: Record<string, string> = {
  clock: "Clock",
  calendar: "Calendar",
  weather: "Weather",
  ram: "RAM",
  wifi: "Wi-Fi",
  bluetooth: "Bluetooth",
  volume: "Audio Mute",
  music: "Music",
  screentime: "Screen Time",
  countdown: "Sand Timer",
};

const ORDER = Object.keys(LABELS);

interface DragState {
  id: string;
  pos: Position;
  collides: boolean;
}

export default function LayoutMinimap({
  widgets,
  placed,
  positions,
  screen,
  metrics,
  noSpaceIds,
  onChange,
}: LayoutMinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const dragStart = useRef<{ clientX: number; clientY: number; origin: Position } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const numCols = Math.max(1, Math.floor(screen.width / metrics.grid));
  const numRows = Math.max(1, Math.floor(screen.height / metrics.grid));
  const cell = width > 0 ? width / numCols : 0;
  const height = Math.round(numRows * cell);
  const minimapScale = cell > 0 ? cell / metrics.grid : 0;
  const { offsetX, offsetY } = getScreenGridOffsets(screen, metrics);

  const othersOf = (id: string): Record<string, Position> => {
    const others: Record<string, Position> = {};
    for (const [otherId, pos] of Object.entries(placed)) {
      if (otherId !== id) others[otherId] = pos;
    }
    return others;
  };

  const startDrag = (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const origin = placed[id];
    if (!origin || minimapScale <= 0) return;
    dragIdRef.current = id;
    dragStart.current = { clientX: e.clientX, clientY: e.clientY, origin };
    setDrag({ id, pos: origin, collides: false });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const id = dragIdRef.current;
    const start = dragStart.current;
    if (!id || !start || !drag) return;
    const raw = {
      x: start.origin.x + (e.clientX - start.clientX) / minimapScale,
      y: start.origin.y + (e.clientY - start.clientY) / minimapScale,
    };
    const next = clampToScreen(raw, screen, metrics, id);
    setDrag({ id, pos: next, collides: collidesWithAny(id, next, othersOf(id), metrics) });
  };

  const endDrag = () => {
    const id = dragIdRef.current;
    const start = dragStart.current;
    dragIdRef.current = null;
    dragStart.current = null;
    if (!id || !start || !drag || drag.id !== id) {
      setDrag(null);
      return;
    }
    let finalPos = drag.pos;
    if (collidesWithAny(id, finalPos, othersOf(id), metrics)) {
      finalPos = findFreePosition(othersOf(id), id, screen, metrics) ?? start.origin;
    }
    setDrag(null);
    const stored = positions[id];
    if (!stored || stored.x !== finalPos.x || stored.y !== finalPos.y) {
      onChange({ ...positions, [id]: finalPos });
    }
  };

  const tileStyle = (pos: Position, id: string): React.CSSProperties => {
    const size = getWidgetPixelSize(id, metrics);
    return {
      left: `${(pos.x - offsetX) * minimapScale}px`,
      top: `${(pos.y - offsetY) * minimapScale}px`,
      width: `${size.w * minimapScale}px`,
      height: `${size.h * minimapScale}px`,
    };
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title">Layout</div>
      <div
        ref={containerRef}
        className="minimap"
        style={{
          height: `${height}px`,
        }}
      >
        {cell > 0 && (
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            <defs>
              <pattern
                id="minimap-grid"
                x={-cell / 2}
                y={-cell / 2}
                width={cell}
                height={cell}
                patternUnits="userSpaceOnUse"
              >
                <circle cx={cell / 2} cy={cell / 2} r={0.75} fill="var(--theme-minimap-dot)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#minimap-grid)" />
            {width > 2 * cell && height > 2 * cell && (
              <rect
                x={cell}
                y={cell}
                width={width - 2 * cell}
                height={height - 2 * cell}
                fill="none"
                stroke="var(--theme-border-widget)"
                strokeDasharray="4 4"
              />
            )}
          </svg>
        )}
        {ORDER.map((id) => {
          if (!widgets[id]) return null;
          const pos = drag?.id === id ? drag.pos : placed[id];
          if (!pos) {
            const storedPos = positions[id];
            if (!storedPos) return null;
            const ghostPos = clampToScreen(storedPos, screen, metrics, id);
            return (
              <div
                key={id}
                className="minimap-ghost nospace"
                style={{
                  ...tileStyle(ghostPos, id),
                  fontSize: `${Math.max(8, 11 * minimapScale)}px`,
                }}
              >
                {LABELS[id]}
              </div>
            );
          }
          const collides = drag?.id === id && drag.collides;
          return (
            <div
              key={id}
              className={`minimap-tile${collides ? " collides" : ""}`}
              style={{
                ...tileStyle(pos, id),
                fontSize: `${Math.max(8, 11 * minimapScale)}px`,
              }}
              onPointerDown={startDrag(id)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
            >
              {LABELS[id]}
            </div>
          );
        })}
      </div>
      {noSpaceIds.length > 0 && (
        <div className="minimap-warning">
          Not enough space: {noSpaceIds.map((id) => LABELS[id]).join(", ")}
        </div>
      )}
    </div>
  );
}
