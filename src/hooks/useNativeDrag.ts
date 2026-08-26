import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { isTauri } from "../lib/tauri";

interface NativeDragOptions {
  beginExternal: (id: string, x: number, y: number) => void;
  moveExternal: (x: number, y: number) => void;
  endExternal: () => void;
}

/**
 * Hook-native drag lifecycle arrives entirely as push events from Rust:
 * "drag-phase" marks press / threshold / release transitions, and
 * "drag-cursor" streams cursor motion between frames. WebView2 never sees
 * button input during drags, so no polling or mouse handlers are needed.
 */
export function useNativeDrag({ beginExternal, moveExternal, endExternal }: NativeDragOptions) {
  useEffect(() => {
    if (!isTauri) return;
    let stopped = false;
    let moveFrame = 0;
    let latestCursor: { x: number; y: number } | null = null;
    /** Seq of the gesture being tracked; null while idle. */
    let activeSeq: number | null = null;
    /** Highest finished seq — drops reordered tails of an ended gesture. */
    let endedSeq = -1;

    // Native input may arrive much faster than the monitor can paint. Apply
    // only the newest point per frame so each visual update is smooth and
    // avoids unnecessary React work.
    const flushMove = () => {
      moveFrame = 0;
      if (!latestCursor) return;
      moveExternal(latestCursor.x, latestCursor.y);
      latestCursor = null;
    };
    const queueMove = (x: number, y: number) => {
      latestCursor = { x, y };
      if (!moveFrame) moveFrame = requestAnimationFrame(flushMove);
    };
    const finishDrag = () => {
      if (moveFrame) cancelAnimationFrame(moveFrame);
      flushMove();
      endExternal();
    };
    const toCss = (v: number) => v / (window.devicePixelRatio || 1);

    const unlistenPhase = listen<{
      seq: number;
      phase: string;
      id: string | null;
      x: number;
      y: number;
    }>("drag-phase", (e) => {
      if (stopped) return;
      const { seq, phase, id, x, y } = e.payload;
      if (phase === "pending" || phase === "drag") {
        if (!id || seq <= endedSeq) return;
        if (activeSeq !== seq) {
          activeSeq = seq;
          beginExternal(id, toCss(x), toCss(y));
        } else {
          queueMove(toCss(x), toCss(y));
        }
      } else if (activeSeq !== null) {
        endedSeq = Math.max(endedSeq, seq);
        activeSeq = null;
        queueMove(toCss(x), toCss(y)); // land exactly on the release point
        finishDrag();
      }
    });

    const unlistenPush = listen<{ seq: number; x: number; y: number }>("drag-cursor", (e) => {
      if (stopped || activeSeq === null || e.payload.seq !== activeSeq) return;
      queueMove(toCss(e.payload.x), toCss(e.payload.y));
    });

    return () => {
      stopped = true;
      if (moveFrame) cancelAnimationFrame(moveFrame);
      unlistenPhase.then((fn) => fn());
      unlistenPush.then((fn) => fn());
    };
  }, [beginExternal, moveExternal, endExternal]);
}
