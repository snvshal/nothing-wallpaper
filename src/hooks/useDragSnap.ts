import { useState, useRef, useCallback, useEffect } from "react";

export interface Position {
  x: number;
  y: number;
}

interface DragSnapOptions {
  initialPositions: Record<string, Position>;
  widgetSize?: number;
  gridSize?: number;
  minGap?: number;
}

export function useDragSnap({
  initialPositions,
  widgetSize = 160,
  gridSize = 16,
  minGap = 16,
}: DragSnapOptions) {
  const [positions, setPositions] = useState(initialPositions);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [fluidPos, setFluidPos] = useState<Position>({ x: 0, y: 0 });
  const [dropTarget, setDropTarget] = useState<Position>({ x: 0, y: 0 });

  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<string | null>(null);
  const dropTargetRef = useRef<Position>({ x: 0, y: 0 });
  const positionsRef = useRef(positions);

  positionsRef.current = positions;

  const handleMouseDown = useCallback(
    (id: string, e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;

      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const pos = positions[id];

      dragIdRef.current = id;
      setDraggingId(id);
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setFluidPos({ ...pos });
      setDropTarget({ ...pos });
      dropTargetRef.current = { ...pos };
    },
    [positions],
  );

  useEffect(() => {
    if (!draggingId) return;

    const handleMove = (e: MouseEvent) => {
      const id = dragIdRef.current;
      if (!id || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let rawX = e.clientX - containerRect.left - dragOffset.current.x;
      let rawY = e.clientY - containerRect.top - dragOffset.current.y;

      rawX = Math.max(20, Math.min(rawX, containerRect.width - widgetSize - 20));
      rawY = Math.max(20, Math.min(rawY, containerRect.height - widgetSize - 20));

      setFluidPos({ x: rawX, y: rawY });

      const snappedX = Math.round(rawX / gridSize) * gridSize;
      const snappedY = Math.round(rawY / gridSize) * gridSize;

      const pos = positionsRef.current;
      const totalSize = widgetSize + minGap;

      const collides = (tx: number, ty: number) =>
        Object.entries(pos).some(
          ([k, p]) =>
            k !== id &&
            tx < p.x + totalSize &&
            tx + totalSize > p.x &&
            ty < p.y + totalSize &&
            ty + totalSize > p.y,
        );

      if (!collides(snappedX, snappedY)) {
        dropTargetRef.current = { x: snappedX, y: snappedY };
      } else if (!collides(snappedX, pos[id].y)) {
        dropTargetRef.current = { x: snappedX, y: pos[id].y };
      } else if (!collides(pos[id].x, snappedY)) {
        dropTargetRef.current = { x: pos[id].x, y: snappedY };
      }

      setDropTarget({ ...dropTargetRef.current });
    };

    const handleUp = () => {
      const id = dragIdRef.current;
      if (id) {
        setPositions((prev) => ({ ...prev, [id]: dropTargetRef.current }));
      }
      dragIdRef.current = null;
      setDraggingId(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [draggingId, widgetSize, gridSize, minGap]);

  return {
    positions,
    draggingId,
    fluidPos,
    dropTarget,
    containerRef,
    handleMouseDown,
  };
}
