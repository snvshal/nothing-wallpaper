import { useState, useRef, useCallback, useEffect } from "react";
import { MARGIN, clampToScreen, collidesWithAny, type Position } from "../lib/placement";

interface DragSnapOptions {
  initialPositions: Record<string, Position>;
  widgetSize?: number;
  gridSize?: number;
  minGap?: number;
  onDragEnd?: (id: string, position: Position) => void;
}

export function useDragSnap({
  initialPositions,
  widgetSize = 160,
  gridSize = 16,
  minGap = 16,
  onDragEnd,
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

  useEffect(() => {
    if (dragIdRef.current) return;
    setPositions((prev) => {
      const ids = new Set([...Object.keys(prev), ...Object.keys(initialPositions)]);
      let same = Object.keys(prev).length === Object.keys(initialPositions).length;
      if (same) {
        for (const id of ids) {
          const a = prev[id];
          const b = initialPositions[id];
          if (!a || !b || a.x !== b.x || a.y !== b.y) {
            same = false;
            break;
          }
        }
      }
      return same ? prev : { ...initialPositions };
    });
  }, [initialPositions]);

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

      rawX = Math.max(MARGIN, Math.min(rawX, containerRect.width - widgetSize - MARGIN));
      rawY = Math.max(MARGIN, Math.min(rawY, containerRect.height - widgetSize - MARGIN));

      setFluidPos({ x: rawX, y: rawY });

      const screen = { width: containerRect.width, height: containerRect.height };
      const snapped = clampToScreen(
        {
          x: Math.round(rawX / gridSize) * gridSize,
          y: Math.round(rawY / gridSize) * gridSize,
        },
        screen,
      );
      const snappedX = snapped.x;
      const snappedY = snapped.y;

      const pos = positionsRef.current;

      const collides = (tx: number, ty: number) => collidesWithAny(id, { x: tx, y: ty }, pos);

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
        const finalPos = dropTargetRef.current;
        setPositions((prev) => ({ ...prev, [id]: finalPos }));
        onDragEnd?.(id, finalPos);
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
  }, [draggingId, widgetSize, gridSize, minGap, onDragEnd]);

  return {
    positions,
    draggingId,
    fluidPos,
    dropTarget,
    containerRef,
    handleMouseDown,
  };
}
