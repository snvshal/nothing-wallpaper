import { useEffect, useState } from "react";
import { MATRIX_DOT_RADIUS } from "../lib/constants";

const COLS = 10;
const ROWS = 10;
const TOP_ROWS = 6; // 6 rows * 10 cols = 60 dots
const BOTTOM_ROWS = 6; // 6 rows * 10 cols = 60 dots
const TOTAL_SECONDS = 60;

export default function CountdownWidget() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    // 30ms interval for fluid falling droplet movement and upward reset wave
    const timer = setInterval(() => {
      setTime(new Date());
    }, 30);
    return () => clearInterval(timer);
  }, []);

  const seconds = time.getSeconds(); // 0..59
  const ms = time.getMilliseconds(); // 0..999

  // Upward reset wave when all dots have dropped (250ms snappy rewind at turn of minute)
  const isResetting = seconds === 0 && ms < 250;
  const resetProgress = Math.min(1, ms / 250); // 0 to 1 over 250ms

  // Active falling dot parameters for current second (seconds 1..59):
  const activeCol = seconds % COLS;
  const activeTopRowFromBottom = Math.floor(seconds / COLS); // 0 (row 5) up to 5 (row 0)
  const activeTopRow = TOP_ROWS - 1 - activeTopRowFromBottom; // Drops from bottom of top chamber first
  const activeBottomRow = ROWS - 1 - activeTopRowFromBottom; // Lands on bottom base first (row 9..4)
  const dropProgress = ms / 1000; // 0..1

  // Current row of the falling dot (traveling from topRow down to bottomRow)
  const currentFallingRow =
    activeTopRow + Math.floor(dropProgress * (activeBottomRow - activeTopRow + 1));

  return (
    <div className="w-full h-full flex items-center justify-center select-none overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 140 140">
        {Array.from({ length: ROWS }).map((_, row) => {
          const cy = 8.5 + row * 13.67;

          return Array.from({ length: COLS }).map((_, col) => {
            const cx = 8.5 + col * 13.67;
            let isActive = false;
            let isFalling = false;

            if (isResetting) {
              // All 6 layers of 10 dots float smoothly upward from [9..4] to [5..0]
              const isLayerActive = [0, 1, 2, 3, 4, 5].some((L) => {
                const origRow = ROWS - 1 - L;
                const destRow = TOP_ROWS - 1 - L;
                const animRow = Math.round(origRow - resetProgress * (origRow - destRow));
                return row === animRow;
              });

              if (isLayerActive) {
                isActive = true;
              }
            } else {
              // Check Top Chamber (Rows 0..5): 60 dots emptying from bottom row (row 5) up to ceiling (row 0)
              if (row < TOP_ROWS) {
                const rowFromBottom = TOP_ROWS - 1 - row;
                const topIndex = rowFromBottom * COLS + col;
                if (topIndex > seconds && topIndex < TOTAL_SECONDS) {
                  isActive = true; // Waiting to drop
                } else if (topIndex === seconds) {
                  if (row === currentFallingRow) {
                    isFalling = true;
                  }
                }
              }

              // Check Bottom Chamber (Rows 4..9): 60 dots filling from floor (row 9) up to row 4
              if (row >= ROWS - BOTTOM_ROWS) {
                const bottomRowFromBase = ROWS - 1 - row; // 0 = row 9, 1 = row 8, ..., 5 = row 4
                const bottomIndex = bottomRowFromBase * COLS + col;
                if (bottomIndex < seconds) {
                  isActive = true; // Already settled
                } else if (bottomIndex === seconds) {
                  if (row === currentFallingRow) {
                    isFalling = true;
                  }
                }
              }

              // In-flight falling dot (when moving between topRow and bottomRow)
              if (col === activeCol && row === currentFallingRow) {
                isFalling = true;
              }
            }

            const fillClass = isFalling
              ? "fill-theme-primary"
              : isActive
                ? "fill-theme-primary"
                : "fill-theme-inactive";

            return (
              <circle
                key={`${row}-${col}`}
                cx={cx}
                cy={cy}
                r={MATRIX_DOT_RADIUS}
                className={fillClass}
              />
            );
          });
        })}
      </svg>
    </div>
  );
}
