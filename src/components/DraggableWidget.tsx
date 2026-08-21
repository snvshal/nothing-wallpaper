import { type ReactNode } from "react";

interface DraggableWidgetProps {
  x: number;
  y: number;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  radius?: string;
  noPadding?: boolean;
  children: ReactNode;
}

export default function DraggableWidget({
  x,
  y,
  isDragging,
  onMouseDown,
  radius = "var(--radius-widget)",
  noPadding = false,
  children,
}: DraggableWidgetProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        touchAction: "none",
        borderRadius: radius,
        transition: isDragging
          ? "none"
          : "left 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
      className={`w-[144px] h-[144px] cursor-grab active:cursor-grabbing flex flex-col justify-between border bg-black ${
        noPadding ? "" : "p-4"
      } ${isDragging ? "border-nothing-red z-50 opacity-90" : "border-white/20 z-10"}`}
    >
      {children}
    </div>
  );
}
