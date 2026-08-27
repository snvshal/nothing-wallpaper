import { useEffect, useRef } from "react";
import { MATRIX_DOT_RADIUS } from "../lib/constants";

const COLS = 10;
const ROWS = 10;
const TOP_ROWS = 6;
const BOTTOM_ROWS = 6;
const TOTAL_SECONDS = 60;

function computeCellClass(row: number, col: number, seconds: number, ms: number): string {
  const isResetting = seconds === 0 && ms < 250;
  const resetProgress = Math.min(1, ms / 250);

  const activeCol = seconds % COLS;
  const activeTopRowFromBottom = Math.floor(seconds / COLS);
  const activeTopRow = TOP_ROWS - 1 - activeTopRowFromBottom;
  const activeBottomRow = ROWS - 1 - activeTopRowFromBottom;
  const dropProgress = ms / 1000;
  const currentFallingRow =
    activeTopRow + Math.floor(dropProgress * (activeBottomRow - activeTopRow + 1));

  if (isResetting) {
    const isLayerActive = [0, 1, 2, 3, 4, 5].some((L) => {
      const origRow = ROWS - 1 - L;
      const destRow = TOP_ROWS - 1 - L;
      const animRow = Math.round(origRow - resetProgress * (origRow - destRow));
      return row === animRow;
    });
    return isLayerActive ? "fill-theme-primary" : "fill-theme-inactive";
  }

  let active = false;
  let falling = false;

  if (row < TOP_ROWS) {
    const rowFromBottom = TOP_ROWS - 1 - row;
    const topIndex = rowFromBottom * COLS + col;
    if (topIndex > seconds && topIndex < TOTAL_SECONDS) {
      active = true;
    } else if (topIndex === seconds && row === currentFallingRow) {
      falling = true;
    }
  }

  if (row >= ROWS - BOTTOM_ROWS) {
    const bottomRowFromBase = ROWS - 1 - row;
    const bottomIndex = bottomRowFromBase * COLS + col;
    if (bottomIndex < seconds) {
      active = true;
    } else if (bottomIndex === seconds && row === currentFallingRow) {
      falling = true;
    }
  }

  if (col === activeCol && row === currentFallingRow) {
    falling = true;
  }

  if (falling || active) return "fill-theme-primary";
  return "fill-theme-inactive";
}

export default function CountdownWidget() {
  const circleRefs = useRef<(SVGCircleElement | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
  );
  const rafRef = useRef(0);
  const prevClasses = useRef<string[]>(Array(ROWS * COLS).fill(""));

  useEffect(() => {
    let running = true;

    const tick = () => {
      if (!running) return;

      const now = new Date();
      const seconds = now.getSeconds();
      const ms = now.getMilliseconds();

      let idx = 0;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const cls = computeCellClass(row, col, seconds, ms);
          if (cls !== prevClasses.current[idx]) {
            circleRefs.current[row]?.[col]?.setAttribute("class", cls);
            prevClasses.current[idx] = cls;
          }
          idx++;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center select-none overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 140 140">
        {Array.from({ length: ROWS }).map((_, row) => {
          const cy = 8.5 + row * 13.67;
          return Array.from({ length: COLS }).map((_, col) => {
            const cx = 8.5 + col * 13.67;
            return (
              <circle
                key={`${row}-${col}`}
                ref={(el) => {
                  circleRefs.current[row][col] = el;
                }}
                cx={cx}
                cy={cy}
                r={MATRIX_DOT_RADIUS}
                className="fill-theme-inactive"
              />
            );
          });
        })}
      </svg>
    </div>
  );
}
