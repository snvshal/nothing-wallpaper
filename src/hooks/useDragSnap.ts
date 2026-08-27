import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  clampToScreen,
  collidesWithAny,
  getWidgetPixelSize,
  type GridMetrics,
  type Position,
} from "../lib/placement";
import { SETTLE_TRANSITION } from "../lib/motion";

interface DragSnapOptions {
  initialPositions: Record<string, Position>;
  widgetSize?: number;
  gridSize?: number;
  minGap?: number;
  margin?: number;
  onDragEnd?: (id: string, position: Position) => void;
}

export function useDragSnap({
  initialPositions,
  widgetSize = 160,
  gridSize = 16,
  minGap = 16,
  margin = 16,
  onDragEnd,
}: DragSnapOptions) {
  const [positions, setPositions] = useState<Record<string, Position>>(initialPositions);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<Position>({ x: 0, y: 0 });

  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const containerRectRef = useRef<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const dragElementRef = useRef<HTMLElement | null>(null);
  /** Clamped cursor-follow position; the widget's on-screen spot right now. */
  const lastRawRef = useRef<Position>({ x: 0, y: 0 });
  const dropTargetRef = useRef<Position>({ x: 0, y: 0 });
  const positionsRef = useRef(positions);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  const metrics: GridMetrics = useMemo(
    () => ({
      unit: gridSize,
      widgetSize,
      grid: gridSize,
      gap: minGap,
      margin,
      footprint: widgetSize + minGap,
    }),
    [gridSize, widgetSize, minGap, margin],
  );

  useEffect(() => {
    if (dragIdRef.current) return;
    setPositions((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [id, b] of Object.entries(initialPositions)) {
        const a = prev[id];
        if (!a || a.x !== b.x || a.y !== b.y) {
          next[id] = { ...b };
          changed = true;
        }
      }
      for (const id of Object.keys(prev)) {
        if (!(id in initialPositions)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [initialPositions]);

  /** Begin a hook-driven drag for `id` with the cursor at CSS coords. */
  const beginExternal = useCallback((id: string, clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const pos = positionsRef.current[id];
    if (!pos) return;
    const el = document.querySelector<HTMLElement>(`[data-widget-id="${id}"]`);
    if (!el) return;
    // A previous settle may still be gliding; kill its transition and strip
    // its transform so the measured rect matches the layout position.
    el.style.setProperty("transition", "none");
    el.style.removeProperty("transform");
    const rect = el.getBoundingClientRect();
    const c = containerRef.current.getBoundingClientRect();
    containerRectRef.current = { left: c.left, top: c.top, width: c.width, height: c.height };

    dragIdRef.current = id;
    dragElementRef.current = el;
    setDraggingId(id);
    lastRawRef.current = { x: pos.x, y: pos.y };
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
    setDropTarget({ ...pos });
    dropTargetRef.current = { ...pos };
  }, []);

  /** Feed a new cursor position (CSS px) into the active drag. */
  const moveExternal = useCallback(
    (clientX: number, clientY: number) => {
      const id = dragIdRef.current;
      if (!id || !containerRectRef.current) return;

      // Container geometry is cached at gesture start; measuring per frame
      // would force synchronous layout and stutter the drag.
      const containerRect = containerRectRef.current;
      const widgetDimensions = getWidgetPixelSize(id, metrics);
      let rawX = clientX - containerRect.left - dragOffset.current.x;
      let rawY = clientY - containerRect.top - dragOffset.current.y;

      rawX = Math.max(margin, Math.min(rawX, containerRect.width - widgetDimensions.w - margin));
      rawY = Math.max(margin, Math.min(rawY, containerRect.height - widgetDimensions.h - margin));

      const screen = { width: containerRect.width, height: containerRect.height };
      const snapped = clampToScreen(
        {
          x: Math.round(rawX / gridSize) * gridSize,
          y: Math.round(rawY / gridSize) * gridSize,
        },
        screen,
        metrics,
        id,
      );
      const snappedX = snapped.x;
      const snappedY = snapped.y;

      const pos = positionsRef.current;

      const collides = (tx: number, ty: number) =>
        collidesWithAny(id, { x: tx, y: ty }, pos, metrics);

      if (!collides(snappedX, snappedY)) {
        dropTargetRef.current = { x: snappedX, y: snappedY };
      } else if (!collides(snappedX, pos[id].y)) {
        dropTargetRef.current = { x: snappedX, y: pos[id].y };
      } else if (!collides(pos[id].x, snappedY)) {
        dropTargetRef.current = { x: pos[id].x, y: snappedY };
      }

      const base = pos[id];
      lastRawRef.current = { x: rawX, y: rawY };
      dragElementRef.current?.style.setProperty(
        "transform",
        `translate3d(${rawX - base.x}px, ${rawY - base.y}px, 0)`,
      );

      setDropTarget((previous) =>
        previous.x === dropTargetRef.current.x && previous.y === dropTargetRef.current.y
          ? previous
          : { ...dropTargetRef.current },
      );
    },
    [gridSize, margin, metrics],
  );

  /**
   * Commit the active drag at its drop target, gliding from the exact spot
   * where the widget was released into its snapped cell.
   *
   * The settle is done imperatively and synchronously on purpose: this runs
   * from an event listener outside React's batching, so the re-render that
   * flips `isDragging` (and with it the CSS transition) lands in a later
   * task. Writing only a transform target here used to let a frame paint in
   * between with transitions still off — the widget snapped back to its old
   * base and then fast-replayed the whole drag path via left/top. Freezing
   * the visual position first makes every ordering converge to one glide.
   */
  const endExternal = useCallback(() => {
    const id = dragIdRef.current;
    containerRectRef.current = null;
    if (id) {
      const finalPos = dropTargetRef.current;
      const el = dragElementRef.current;
      if (el && positionsRef.current[id]) {
        // 1. Bake the current on-screen position into left/top, no motion.
        el.style.setProperty("transition", "none");
        el.style.left = `${lastRawRef.current.x}px`;
        el.style.top = `${lastRawRef.current.y}px`;
        el.style.removeProperty("transform");
        // 2. Flush styles so this frozen state becomes the before-value.
        void el.getBoundingClientRect();
        // 3. Arm the transition and glide home. React's later commit writes
        //    identical left/top values — a no-op that cannot restart it.
        el.style.transition = SETTLE_TRANSITION;
        el.style.left = `${finalPos.x}px`;
        el.style.top = `${finalPos.y}px`;
      }
      setPositions((prev) => ({ ...prev, [id]: finalPos }));
      onDragEnd?.(id, finalPos);
    }
    dragIdRef.current = null;
    dragElementRef.current = null;
    setDraggingId(null);
  }, [onDragEnd]);

  /**
   * Browser-preview drag entry (`bun run dev` outside Tauri, where the
   * native hook cannot exist): drives the same external-drag trio from DOM
   * pointer events. No-op while a gesture is already active or if the id is
   * unknown.
   */
  const beginPointerDrag = useCallback(
    (id: string, clientX: number, clientY: number) => {
      if (dragIdRef.current) return;
      beginExternal(id, clientX, clientY);
      // beginExternal rejects unknown ids/elements; only then listen.
      if (!dragIdRef.current) return;

      const finish = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        endExternal();
      };
      const move = (e: PointerEvent) => moveExternal(e.clientX, e.clientY);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
    },
    [beginExternal, moveExternal, endExternal],
  );

  return {
    positions,
    draggingId,
    dropTarget,
    containerRef,
    beginExternal,
    moveExternal,
    endExternal,
    beginPointerDrag,
  };
}
