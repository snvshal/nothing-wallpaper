import { useEffect, useState, useCallback, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useDragSnap } from "./hooks/useDragSnap";
import DraggableWidget from "./components/DraggableWidget";
import ClockWidget from "./components/ClockWidget";
import CalendarWidget from "./components/CalendarWidget";
import WeatherWidget from "./components/WeatherWidget";
import RamWidget from "./components/RamWidget";
import { loadSettings, saveWidgetPositions, type AppSettings } from "./settings/settings-store";
import "./styles/global.css";

const ALL_POSITIONS: Record<string, { x: number; y: number }> = {
  clock: { x: 96, y: 96 },
  calendar: { x: 256, y: 96 },
  weather: { x: 96, y: 256 },
  ram: { x: 256, y: 256 },
};

const WIDGET_SIZE = 144;

const WIDGET_RADIUS: Record<string, string> = {
  clock: "50%",
};

const WIDGET_CONTENT: Record<string, React.ReactNode> = {
  clock: <ClockWidget />,
  calendar: <CalendarWidget />,
  weather: <WeatherWidget />,
  ram: <RamWidget />,
};

export default function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);

    const unlisten = listen<AppSettings>("settings-changed", (event) => {
      setSettings(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const visibleWidgets = useMemo(
    () =>
      settings?.widgets ?? {
        clock: true,
        calendar: true,
        weather: true,
        ram: true,
      },
    [settings?.widgets],
  );
  const savedPositions = settings?.positions ?? {};

  const bgUrl =
    settings?.wallpaper && settings.wallpaper !== "default"
      ? convertFileSrc(settings.wallpaper)
      : "/background.jpg";

  const visibleIds = useMemo(
    () => Object.keys(ALL_POSITIONS).filter((id) => visibleWidgets[id]),
    [visibleWidgets],
  );

  const initialPositions: Record<string, { x: number; y: number }> = {};
  for (const id of visibleIds) {
    initialPositions[id] = savedPositions[id] ?? ALL_POSITIONS[id];
  }

  const onDragEnd = useCallback(
    (id: string, position: { x: number; y: number }) => {
      const updated = { ...savedPositions, [id]: position };
      saveWidgetPositions(updated);
    },
    [savedPositions],
  );

  const { positions, draggingId, fluidPos, dropTarget, containerRef, handleMouseDown } =
    useDragSnap({ initialPositions, visibleIds, widgetSize: WIDGET_SIZE, onDragEnd });

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden text-white select-none"
      style={{
        background: `url("${bgUrl}") center / cover no-repeat`,
      }}
    >
      {draggingId && (
        <div
          style={{
            position: "absolute",
            left: `${dropTarget.x}px`,
            top: `${dropTarget.y}px`,
            width: `${WIDGET_SIZE}px`,
            height: `${WIDGET_SIZE}px`,
            borderRadius: WIDGET_RADIUS[draggingId] ?? "var(--radius-widget)",
          }}
          className="border-2 border-dashed border-nothing-red/60 z-0 flex items-center justify-center pointer-events-none"
        />
      )}

      {visibleIds.map((id) => {
        const isDragging = draggingId === id;
        const pos = isDragging ? fluidPos : positions[id];

        return (
          <DraggableWidget
            key={id}
            x={pos.x}
            y={pos.y}
            isDragging={isDragging}
            onMouseDown={(e) => handleMouseDown(id, e)}
            radius={WIDGET_RADIUS[id]}
            noPadding={id === "clock"}
          >
            {WIDGET_CONTENT[id]}
          </DraggableWidget>
        );
      })}
    </div>
  );
}
