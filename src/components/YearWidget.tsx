import { useEffect, useState } from "react";
import { MATRIX_DOT_RADIUS } from "../lib/constants";
import { getYearProgress } from "../lib/year";

const COLS = 22;
const ROWS = 17;
const VIEWBOX_WIDTH = 140;
const VIEWBOX_HEIGHT = 112;
const ORIGIN_X = 5;
const ORIGIN_Y = 3.5;
const SPACING_X = (VIEWBOX_WIDTH - ORIGIN_X * 2) / (COLS - 1);
const SPACING_Y = (VIEWBOX_HEIGHT - ORIGIN_Y * 2) / (ROWS - 1);

function dotClass(index: number, todayIndex: number): string {
  if (index === todayIndex) return "fill-nothing-widget-red";
  if (index < todayIndex) return "fill-theme-primary";
  return "fill-theme-inactive";
}

export default function YearWidget() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { year, totalDays, dayOfYear, daysRemaining, percent } = getYearProgress(now);
  const todayIndex = dayOfYear - 1;

  return (
    <div
      className="w-full h-full flex flex-col justify-start select-none overflow-hidden"
      style={{ gap: "calc(var(--unit) * 0.4)" }}
    >
      <div className="flex justify-between items-start w-full">
        <div className="font-dot text-theme-primary tracking-widest leading-none text-widget-title">
          {year}
        </div>
        <div className="font-dot text-theme-primary tracking-widest leading-none text-widget-title">
          {percent.toFixed(1)}%
        </div>
      </div>

      <svg
        className="w-full h-auto block"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Year ${year} progress: ${percent.toFixed(1)} percent complete, ${daysRemaining} days remaining`}
      >
        {Array.from({ length: ROWS }).map((_, row) =>
          Array.from({ length: COLS }).map((_, col) => {
            const index = row * COLS + col;
            if (index >= totalDays) return null;
            return (
              <circle
                key={`${row}-${col}`}
                cx={ORIGIN_X + col * SPACING_X}
                cy={ORIGIN_Y + row * SPACING_Y}
                r={MATRIX_DOT_RADIUS}
                className={dotClass(index, todayIndex)}
              />
            );
          }),
        )}
      </svg>
    </div>
  );
}
