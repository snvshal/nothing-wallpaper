import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { UNIT_OPTIONS } from "../lib/placement";

interface GridUnitPickerProps {
  unit: number;
  onSelect: (unit: number) => void;
}

const LAST_INDEX = UNIT_OPTIONS.length - 1;

const stopPosition = (index: number) => (index / LAST_INDEX) * 100;

export default function GridUnitPicker({ unit, onSelect }: GridUnitPickerProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [dragPct, setDragPct] = useState<number | null>(null);

  const activeIndex = UNIT_OPTIONS.indexOf(unit);

  const ratioFromEvent = (event: PointerEvent<HTMLDivElement>) => {
    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  };

  const handleThumbDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const ratio = ratioFromEvent(event);
    if (ratio === null) return;
    setDragPct(ratio * 100);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragPct === null) return;
    const ratio = ratioFromEvent(event);
    if (ratio === null) return;
    setDragPct(ratio * 100);
    const value = UNIT_OPTIONS[Math.round(ratio * LAST_INDEX)];
    if (value !== unit) onSelect(value);
  };

  const endDrag = () => setDragPct(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let index = activeIndex < 0 ? Math.round(LAST_INDEX / 2) : activeIndex;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        index += 1;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        index -= 1;
        break;
      case "Home":
        index = 0;
        break;
      case "End":
        index = LAST_INDEX;
        break;
      default:
        return;
    }
    event.preventDefault();
    const next = UNIT_OPTIONS[Math.min(LAST_INDEX, Math.max(0, index))];
    if (next !== unit) onSelect(next);
  };

  const thumbPct = dragPct ?? stopPosition(activeIndex < 0 ? 0 : activeIndex);

  return (
    <div className="settings-section">
      <div className="settings-section-title">Grid unit</div>
      <div
        ref={sliderRef}
        className={`grid-unit-slider ${dragPct !== null ? "dragging" : ""}`}
        role="slider"
        tabIndex={0}
        aria-label="Grid unit"
        aria-valuemin={UNIT_OPTIONS[0]}
        aria-valuemax={UNIT_OPTIONS[LAST_INDEX]}
        aria-valuenow={activeIndex < 0 ? undefined : unit}
        aria-valuetext={activeIndex < 0 ? undefined : `${unit} pixels`}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={handleKeyDown}
      >
        <div className="grid-unit-track" />
        <div className="grid-unit-track-fill" style={{ width: `${thumbPct}%` }} />
        {UNIT_OPTIONS.map((value, index) => (
          <span
            key={value}
            aria-hidden="true"
            className={`grid-unit-stop ${index <= activeIndex ? "passed" : ""} ${
              value === unit ? "active" : ""
            }`}
            style={{ left: `${stopPosition(index)}%` }}
            onClick={() => onSelect(value)}
          >
            <span className="grid-unit-dot" />
            <span className="grid-unit-value">{value}</span>
          </span>
        ))}
        <div
          className="grid-unit-thumb"
          style={{ left: `${thumbPct}%` }}
          onPointerDown={handleThumbDown}
        />
      </div>
    </div>
  );
}
