import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../lib/tauri";
import { MATRIX_DOT_RADIUS } from "../lib/constants";

const BANDS = 12;
const ROWS = 12;
const EMPTY = Array.from({ length: BANDS }, () => 0);

export default function AudioVisualizerWidget() {
  const [levels, setLevels] = useState<number[]>(EMPTY);

  useEffect(() => {
    let active = true;
    let phase = 0;
    if (!isTauri) {
      const preview = setInterval(() => {
        phase += 0.22;
        setLevels(
          Array.from(
            { length: BANDS },
            (_, i) =>
              0.12 +
              0.78 *
                Math.abs(Math.sin(phase + i * 0.58)) *
                (0.55 + 0.45 * Math.sin(phase * 0.37 + i) ** 2),
          ),
        );
      }, 70);
      return () => clearInterval(preview);
    }

    void invoke("set_audio_visualizer_active", { active: true }).catch(() => {});
    const poll = () => {
      void invoke<number[]>("get_audio_visualizer_levels")
        .then((next) => {
          if (active && Array.isArray(next)) setLevels(next);
        })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 50);
    return () => {
      active = false;
      clearInterval(interval);
      void invoke("set_audio_visualizer_active", { active: false }).catch(() => {});
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center select-none overflow-hidden">
      <svg
        className="w-full flex-1 min-h-0"
        viewBox="0 0 140 140"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Live system audio visualizer"
        role="img"
      >
        {Array.from({ length: BANDS * ROWS }, (_, index) => {
          const col = index % BANDS;
          const row = Math.floor(index / BANDS);
          const rowFromBottom = ROWS - 1 - row;
          const level = Math.max(0, Math.min(1, levels[col] ?? 0));
          const activeRows = Math.round(level * ROWS);
          const isActive = rowFromBottom < activeRows;
          const cx = 7 + col * 11.5;
          const cy = 7 + row * 11.5;
          return (
            <circle
              key={index}
              cx={cx}
              cy={cy}
              r={MATRIX_DOT_RADIUS}
              className={isActive ? "fill-theme-primary" : "fill-theme-inactive"}
            />
          );
        })}
      </svg>
    </div>
  );
}
