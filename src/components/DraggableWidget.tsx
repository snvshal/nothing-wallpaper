import { type ReactNode } from "react";
import { SETTLE_TRANSITION } from "../lib/motion";

interface DraggableWidgetProps {
  id: string;
  x: number;
  y: number;
  isDragging: boolean;
  radius?: string;
  noPadding?: boolean;
  unitsW?: number;
  unitsH?: number;
  /** Browser-preview drag entry; the desktop app drags via the native hook. */
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  children: ReactNode;
}

export default function DraggableWidget({
  id,
  x,
  y,
  isDragging,
  radius = "var(--radius-widget)",
  noPadding = false,
  unitsW = 9,
  unitsH = 9,
  onPointerDown,
  children,
}: DraggableWidgetProps) {
  return (
    <div
      data-widget-id={id}
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        width: unitsW === 9 ? "var(--widget-size)" : `calc(var(--unit) * ${unitsW})`,
        height: unitsH === 9 ? "var(--widget-size)" : `calc(var(--unit) * ${unitsH})`,
        padding: noPadding ? 0 : "var(--unit)",
        touchAction: "none",
        borderRadius: radius,
        overflow: "hidden",
        backdropFilter: "var(--theme-widget-backdrop, none)",
        WebkitBackdropFilter: "var(--theme-widget-backdrop, none)",
        transition: isDragging ? "none" : SETTLE_TRANSITION,
        willChange: isDragging ? "transform" : undefined,
      }}
      className={`cursor-grab flex flex-col justify-between border bg-widget-surface text-theme-primary ${
        isDragging ? "cursor-grabbing border-nothing-widget-red z-50" : "border-widget-subtle z-10"
      }`}
    >
      {children}
    </div>
  );
}
