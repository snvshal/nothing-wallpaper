import { useEffect, useRef, useState } from "react";
import {
  clampToScreen,
  collidesWithAny,
  findFreePosition,
  getWidgetPixelSize,
  snap,
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

  const scale = width > 0 ? width / screen.width : 0;
  const height = scale > 0 ? Math.round(screen.height * scale) : 0;
  const cell = metrics.grid * scale;

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
    if (!origin || scale <= 0) return;
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
      x: start.origin.x + (e.clientX - start.clientX) / scale,
      y: start.origin.y + (e.clientY - start.clientY) / scale,
    };
    const next = clampToScreen(
      { x: snap(raw.x, metrics), y: snap(raw.y, metrics) },
      screen,
      metrics,
      id,
    );
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
      left: `${pos.x * scale}px`,
      top: `${pos.y * scale}px`,
      width: `${size.w * scale}px`,
      height: `${size.h * scale}px`,
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
          backgroundSize: `${cell}px ${cell}px`,
          backgroundPosition: `-${cell / 2}px -${cell / 2}px`,
        }}
      >
        <div className="minimap-margin" style={{ inset: `${metrics.margin * scale}px` }} />
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
                style={{ ...tileStyle(ghostPos, id), fontSize: `${Math.max(8, 11 * scale)}px` }}
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
              style={{ ...tileStyle(pos, id), fontSize: `${Math.max(8, 11 * scale)}px` }}
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
