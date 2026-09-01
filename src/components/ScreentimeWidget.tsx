import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../lib/tauri";
import { MATRIX_DOT_RADIUS } from "../lib/constants";

export interface ScreenTimeApp {
  name: string;
  seconds: number;
  percentage: number;
}

export interface DailyScreenTime {
  day_offset: number;
  seconds: number;
}

export interface ScreenTimeData {
  total_seconds: number;
  top_apps: ScreenTimeApp[];
  history_days: DailyScreenTime[];
}

const MOCK_DATA: ScreenTimeData = {
  total_seconds: 4 * 3600 + 15 * 60,
  top_apps: [
    { name: "VS Code", seconds: 2 * 3600 + 15 * 60, percentage: 55 },
    { name: "Chrome", seconds: 1 * 3600 + 15 * 60, percentage: 30 },
    { name: "Spotify", seconds: 30 * 60, percentage: 12 },
    { name: "Other", seconds: 15 * 60, percentage: 3 },
  ],
  history_days: [
    { day_offset: -9, seconds: 2 * 3600 + 10 * 60 },
    { day_offset: -8, seconds: 4 * 3600 + 30 * 60 },
    { day_offset: -7, seconds: 5 * 3600 + 15 * 60 },
    { day_offset: -6, seconds: 3 * 3600 + 50 * 60 },
    { day_offset: -5, seconds: 1 * 3600 + 20 * 60 },
    { day_offset: -4, seconds: 6 * 3600 + 10 * 60 },
    { day_offset: -3, seconds: 4 * 3600 + 40 * 60 },
    { day_offset: -2, seconds: 2 * 3600 + 50 * 60 },
    { day_offset: -1, seconds: 5 * 3600 },
    { day_offset: 0, seconds: 4 * 3600 + 15 * 60 },
  ],
};

function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes === 0) {
    return "0M";
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}M`;
  }
  if (minutes === 0) {
    return `${hours}H`;
  }
  return `${hours}H${minutes}M`;
}

function renderDuration(totalSeconds: number) {
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes === 0) {
    return (
      <span>
        0<span className="text-[0.7em] ml-px font-dot">M</span>
      </span>
    );
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return (
      <span>
        {minutes}
        <span className="text-[0.7em] ml-px font-dot">M</span>
      </span>
    );
  }
  if (minutes === 0) {
    return (
      <span>
        {hours}
        <span className="text-[0.7em] ml-px font-dot">H</span>
      </span>
    );
  }
  return (
    <span>
      {hours}
      <span className="text-[0.7em] ml-px font-dot">H</span>
      {minutes}
      <span className="text-[0.7em] ml-px font-dot">M</span>
    </span>
  );
}

const COLS = 20;
const ROWS = 10;

export default function ScreentimeWidget() {
  const [data, setData] = useState<ScreenTimeData>(() =>
    isTauri ? { total_seconds: 0, top_apps: [], history_days: [] } : MOCK_DATA,
  );
  const [viewMode, setViewMode] = useState<"today" | "history">("today");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTauri) return;

    let active = true;
    const fetchStats = async () => {
      try {
        const res = await invoke<ScreenTimeData>("get_screen_time");
        if (active && res) {
          setData(res);
        }
      } catch {
        // Retain previous stats on transient errors
      }
    };

    void fetchStats();
    const timer = setInterval(fetchStats, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // Ensure scroll position is strictly pinned to top when switching views
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      if (containerRef.current.parentElement) {
        containerRef.current.parentElement.scrollTop = 0;
      }
    }
  }, [viewMode]);

  // History scaling: Highest day in 10-day window rounded UP to whole hours
  const rawMaxSeconds = Math.max(
    3600,
    ...data.history_days.map((d) => d.seconds),
    data.total_seconds,
  );
  const targetMaxHours = Math.max(1, Math.ceil(rawMaxSeconds / 3600));
  const targetMaxSeconds = targetMaxHours * 3600;

  const handleToggle = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      if (containerRef.current.parentElement) {
        containerRef.current.parentElement.scrollTop = 0;
      }
    }
    setViewMode((prev) => (prev === "today" ? "history" : "today"));
  };

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      className="w-full h-full flex flex-col justify-between select-none cursor-pointer outline-none focus:outline-none text-left bg-transparent border-none p-0 m-0 font-[inherit]"
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggle();
        }
      }}
      title="Click to toggle Today / 10-Day History"
    >
      {viewMode === "today" ? (
        <>
          {/* Today View Header (Top) */}
          <div className="flex justify-between items-center w-full">
            <span
              className="rounded-full bg-nothing-widget-red flex-shrink-0 block"
              style={{
                width: "var(--text-widget-title)",
                height: "var(--text-widget-title)",
              }}
              aria-hidden="true"
            />
            <div className="font-dot text-theme-primary tracking-widest leading-none text-widget-title">
              {renderDuration(data.total_seconds)}
            </div>
          </div>

          {/* Today View App Rows (Aligned at Bottom) */}
          <div className="flex flex-col gap-1.5 overflow-hidden w-full mt-auto">
            {data.top_apps.length > 0 ? (
              data.top_apps.slice(0, 4).map((app) => (
                <div
                  key={app.name}
                  className="flex items-center justify-between text-widget-subtitle leading-none"
                  title={`${app.name}: ${formatDuration(app.seconds)}`}
                >
                  <span className="font-body text-theme-primary truncate max-w-[65%]">
                    {app.name}
                  </span>
                  <span className="font-dot text-theme-secondary flex-shrink-0">
                    {renderDuration(app.seconds)}
                  </span>
                </div>
              ))
            ) : (
              <div className="font-body text-theme-muted text-widget-subtitle truncate">
                No active apps today
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* History View Header (Top) */}
          <div className="flex justify-between items-center w-full">
            <div className="font-dot text-theme-primary tracking-widest leading-none text-widget-title">
              HISTORY
            </div>
            <div className="font-dot text-theme-primary tracking-widest leading-none text-widget-title">
              <span>
                {targetMaxHours}
                <span className="text-[0.7em] ml-px font-dot">H</span>
              </span>
            </div>
          </div>

          {/* 10-Day Dot Matrix Grid (Aligned at Bottom) */}
          <div className="w-full flex items-center justify-center mt-auto overflow-hidden">
            <svg className="w-full block h-auto" viewBox="0 0 140 68">
              {Array.from({ length: COLS }).map((_, col) => {
                // 10 days: 2 columns per day (d = 0..9)
                const dayIndex = Math.floor(col / 2);
                const dayData = data.history_days[dayIndex];
                // For today (index 9), take the higher of history or live total_seconds
                const seconds =
                  dayIndex === 9
                    ? Math.max(dayData?.seconds ?? 0, data.total_seconds)
                    : (dayData?.seconds ?? 0);

                const activeRows =
                  seconds > 0 ? Math.max(1, Math.round((seconds / targetMaxSeconds) * ROWS)) : 0;

                const cx = 5 + col * 6.8;

                return Array.from({ length: ROWS }).map((_, rowFromTop) => {
                  const rowFromBottom = ROWS - 1 - rowFromTop;
                  const isActive = rowFromBottom < activeRows;
                  const cy = 5 + rowFromTop * 6.2;

                  return (
                    <circle
                      key={`${col}-${rowFromTop}`}
                      cx={cx}
                      cy={cy}
                      r={MATRIX_DOT_RADIUS}
                      className={isActive ? "fill-theme-primary" : "fill-theme-inactive"}
                    />
                  );
                });
              })}
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
