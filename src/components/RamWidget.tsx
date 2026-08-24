import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../lib/tauri";

interface MemoryInfo {
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
  used_percent: number;
}

function formatGB(bytes: number): string {
  return (bytes / 1073741824).toFixed(1);
}

const COLS = 20;
const ROWS = 10;

export default function RamWidget() {
  const [memory, setMemory] = useState<MemoryInfo | null>(null);
  const historyRef = useRef<number[]>(Array.from({ length: COLS }, () => 0));

  useEffect(() => {
    // Browser preview: no backend, show the placeholder graph untouched.
    if (!isTauri) return;
    const fetchMemory = async () => {
      try {
        const info = await invoke<MemoryInfo>("get_memory_usage");
        setMemory(info);

        historyRef.current = [...historyRef.current.slice(1), info.used_percent];
      } catch {
        // invoke can fail transiently, keep last values
      }
    };

    fetchMemory();
    const interval = setInterval(fetchMemory, 2000);
    return () => clearInterval(interval);
  }, []);

  const usedPercent = memory?.used_percent ?? 0;
  const usedGB = memory ? formatGB(memory.used_bytes) : "0.0";
  const totalGB = memory ? formatGB(memory.total_bytes) : "0.0";
  const history = historyRef.current;

  return (
    <>
      <div className="flex justify-between items-start">
        <div>
          <div className="font-dot text-nothing-white tracking-widest leading-none text-widget-title">
            RAM
          </div>
          <div
            className="font-body text-nothing-ngrey text-widget-detail"
            style={{ marginTop: "calc(var(--unit) * 0.25)" }}
          >
            {totalGB} GB
          </div>
        </div>
        <div className="text-right">
          <div className="font-dot text-nothing-white tracking-widest leading-none text-widget-title">
            {usedPercent.toFixed(1)}%
          </div>
          <div
            className="font-body text-nothing-ngrey text-widget-detail"
            style={{ marginTop: "calc(var(--unit) * 0.25)" }}
          >
            {usedGB} GB
          </div>
        </div>
      </div>

      <div className="w-full flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 140 68">
          {Array.from({ length: COLS }).map((_, col) => {
            const val = history[col] || 0;
            const activeRows = Math.max(1, Math.round((val / 100) * ROWS));
            return Array.from({ length: ROWS }).map((_, rowFromTop) => {
              const rowFromBottom = ROWS - 1 - rowFromTop;
              const isActive = rowFromBottom < activeRows;
              const cx = 5 + col * 6.8;
              const cy = 5 + rowFromTop * 6.2;
              return (
                <circle
                  key={`${col}-${rowFromTop}`}
                  cx={cx}
                  cy={cy}
                  r={1.8}
                  className={isActive ? "fill-nothing-white" : "fill-nothing-white/15"}
                />
              );
            });
          })}
        </svg>
      </div>
    </>
  );
}
