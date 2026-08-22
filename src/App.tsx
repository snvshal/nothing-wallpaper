import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useDragSnap } from "./hooks/useDragSnap";
import DraggableWidget from "./components/DraggableWidget";
import ClockWidget from "./components/ClockWidget";
import CalendarWidget from "./components/CalendarWidget";
import WeatherWidget from "./components/WeatherWidget";
import RamWidget from "./components/RamWidget";
import { loadSettings, saveSettings, type AppSettings } from "./settings/settings-store";
import { DEFAULT_POSITIONS, evaluateLayout, type Screen } from "./lib/placement";
import { DEFAULT_WALLPAPER_URL } from "./lib/constants";
import "./styles/global.css";

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
  const [screen, setScreen] = useState<Screen>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const settingsRef = useRef<AppSettings | null>(null);

  settingsRef.current = settings;

  useEffect(() => {
    loadSettings().then(setSettings);

    const unlisten = listen<AppSettings>("settings-changed", (event) => {
      setSettings(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const emitScreen = () =>
      emit("screen-info", { width: window.innerWidth, height: window.innerHeight });
    const onResize = () => {
      setScreen({ width: window.innerWidth, height: window.innerHeight });
      emitScreen();
    };
    emitScreen();
    const unlistenRequest = listen("request-screen", () => emitScreen());
    window.addEventListener("resize", onResize);
    return () => {
      unlistenRequest.then((fn) => fn());
      window.removeEventListener("resize", onResize);
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
  const savedPositions = useMemo(() => settings?.positions ?? {}, [settings]);
  const seededPositions = useMemo(
    () => ({ ...DEFAULT_POSITIONS, ...savedPositions }),
    [savedPositions],
  );

  const wallpaper = settings?.wallpaper ?? "default";
  const bgStyle: React.CSSProperties =
    wallpaper === "system"
      ? {}
      : {
          background: `url("${
            wallpaper === "default" ? DEFAULT_WALLPAPER_URL : convertFileSrc(wallpaper)
          }") center / cover no-repeat`,
        };

  const visibleIds = useMemo(
    () => Object.keys(DEFAULT_POSITIONS).filter((id) => visibleWidgets[id]),
    [visibleWidgets],
  );

  const layout = useMemo(
    () => evaluateLayout(visibleIds, seededPositions, screen),
    [visibleIds, seededPositions, screen],
  );

  useEffect(() => {
    if (!settings) return;
    const merged = { ...settings.positions };
    let differs = false;
    for (const id of visibleIds) {
      const p = layout.placed[id];
      if (p && (!merged[id] || merged[id].x !== p.x || merged[id].y !== p.y)) {
        merged[id] = p;
        differs = true;
      }
    }
    if (!differs) return;
    saveSettings({ ...settings, positions: merged });
  }, [settings, layout, visibleIds]);

  const onDragEnd = useCallback((id: string, position: { x: number; y: number }) => {
    const current = settingsRef.current;
    if (!current) return;
    saveSettings({
      ...current,
      positions: { ...current.positions, [id]: position },
    });
  }, []);

  const { positions, draggingId, fluidPos, dropTarget, containerRef, handleMouseDown } =
    useDragSnap({ initialPositions: layout.placed, widgetSize: WIDGET_SIZE, onDragEnd });

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden text-nothing-white select-none"
      style={bgStyle}
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
          className="border-2 border-dashed border-nothing-widget-red/60 z-0 flex items-center justify-center pointer-events-none"
        />
      )}

      {visibleIds.map((id) => {
        const isDragging = draggingId === id;
        const pos = (isDragging ? fluidPos : positions[id]) ?? layout.placed[id];
        if (!pos) return null;

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
