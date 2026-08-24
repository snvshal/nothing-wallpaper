import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { useDragSnap } from "./hooks/useDragSnap";
import DraggableWidget from "./components/DraggableWidget";
import ClockWidget from "./components/ClockWidget";
import CalendarWidget from "./components/CalendarWidget";
import WeatherWidget from "./components/WeatherWidget";
import RamWidget from "./components/RamWidget";
import { loadSettings, saveSettings, type AppSettings } from "./settings/settings-store";
import { defaultPositions, evaluateLayout, gridMetrics, type Screen } from "./lib/placement";
import { DEFAULT_WALLPAPER_URL, DEFAULT_LIGHT_WALLPAPER_URL } from "./lib/constants";
import { isTauri } from "./lib/tauri";
import { useTheme } from "./hooks/useTheme";
import "./styles/global.css";

const WIDGET_RADIUS: Record<string, string> = {
  clock: "50%",
};

const renderWidgetContent = (id: string, settings: AppSettings | null) => {
  switch (id) {
    case "clock":
      return <ClockWidget />;
    case "calendar":
      return <CalendarWidget />;
    case "weather":
      return <WeatherWidget city={settings?.weatherCity} tempUnit={settings?.tempUnit} />;
    case "ram":
      return <RamWidget />;
    default:
      return null;
  }
};

export default function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [screen, setScreen] = useState<Screen>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  // Tracked so physical-pixel math (widget hit regions, drag coordinates)
  // survives moving the window between monitors with different scale factors.
  const [dpr, setDpr] = useState(() => window.devicePixelRatio || 1);
  const settingsRef = useRef<AppSettings | null>(null);

  settingsRef.current = settings;

  useEffect(() => {
    const mq = window.matchMedia(`(resolution: ${dpr}dppx)`);
    const onChange = () => setDpr(window.devicePixelRatio || 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [dpr]);

  useEffect(() => {
    loadSettings().then(setSettings);

    const preventDrag = (e: Event) => e.preventDefault();
    document.addEventListener("dragstart", preventDrag);
    document.addEventListener("drop", preventDrag);

    // Tauri-only: cross-window settings sync has no counterpart in the
    // plain-browser preview.
    const unlisten = isTauri
      ? listen<AppSettings>("settings-changed", (event) => {
          const local = settingsRef.current;
          if (local && JSON.stringify(event.payload) === JSON.stringify(local)) return;
          setSettings(event.payload);
        })
      : null;
    return () => {
      document.removeEventListener("dragstart", preventDrag);
      document.removeEventListener("drop", preventDrag);
      unlisten?.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (!isTauri) {
      // Browser preview: keep layout responsive without any IPC.
      const onResize = () => setScreen({ width: window.innerWidth, height: window.innerHeight });
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
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
  const unit = settings?.unit ?? 16;
  const metrics = useMemo(() => gridMetrics(unit), [unit]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--unit", `${metrics.unit}px`);
    root.style.setProperty("--widget-size", `${metrics.widgetSize}px`);
  }, [metrics]);

  const seededPositions = useMemo(
    () => ({ ...defaultPositions(metrics), ...savedPositions }),
    [savedPositions, metrics],
  );

  const wallpaper = settings?.wallpaper ?? "default";
  const activeTheme = useTheme(settings?.theme ?? "dark");
  const defaultBgUrl =
    activeTheme === "light" ? DEFAULT_LIGHT_WALLPAPER_URL : DEFAULT_WALLPAPER_URL;

  const bgStyle: React.CSSProperties =
    wallpaper === "system"
      ? {}
      : {
          background: `url("${
            wallpaper === "default" || !isTauri ? defaultBgUrl : convertFileSrc(wallpaper)
          }") center / cover no-repeat`,
        };

  const visibleIds = useMemo(
    () => Object.keys(defaultPositions(metrics)).filter((id) => visibleWidgets[id]),
    [visibleWidgets, metrics],
  );

  const layout = useMemo(
    () => evaluateLayout(visibleIds, seededPositions, screen, metrics),
    [visibleIds, seededPositions, screen, metrics],
  );

  const commitSettings = useCallback((next: AppSettings) => {
    settingsRef.current = next;
    setSettings(next);
    void saveSettings(next);
  }, []);

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
    commitSettings({ ...settings, positions: merged });
  }, [settings, layout, visibleIds, commitSettings]);

  const onDragEnd = useCallback(
    (id: string, position: { x: number; y: number }) => {
      const current = settingsRef.current;
      if (!current) return;
      commitSettings({
        ...current,
        positions: { ...current.positions, [id]: position },
      });
    },
    [commitSettings],
  );

  const {
    positions,
    draggingId,
    dropTarget,
    containerRef,
    beginExternal,
    moveExternal,
    endExternal,
    beginPointerDrag,
  } = useDragSnap({
    initialPositions: layout.placed,
    widgetSize: metrics.widgetSize,
    gridSize: metrics.grid,
    minGap: metrics.gap,
    margin: metrics.margin,
    onDragEnd,
  });

  useEffect(() => {
    if (!isTauri) return;
    const scale = window.devicePixelRatio || 1;
    const sizePx = metrics.widgetSize * scale;
    const regions = Object.entries(positions).map(([id, p]) => ({
      id,
      x: Math.round(p.x * scale),
      y: Math.round(p.y * scale),
      w: sizePx,
      h: sizePx,
    }));
    invoke("set_widget_regions", { regions }).catch(() => {});
  }, [positions, metrics.widgetSize, dpr]);

  // Hook-native drag lifecycle arrives entirely as push events from Rust:
  // "drag-phase" marks press / threshold / release transitions, and
  // "drag-cursor" streams cursor motion between frames. WebView2 never sees
  // button input during drags, so no polling or mouse handlers are needed.
  useEffect(() => {
    if (!isTauri) return;
    let stopped = false;
    let moveFrame = 0;
    let latestCursor: { x: number; y: number } | null = null;
    /** Seq of the gesture being tracked; null while idle. */
    let activeSeq: number | null = null;
    /** Highest finished seq — drops reordered tails of an ended gesture. */
    let endedSeq = -1;

    // Native input may arrive much faster than the monitor can paint. Apply
    // only the newest point per frame so each visual update is smooth and
    // avoids unnecessary React work.
    const flushMove = () => {
      moveFrame = 0;
      if (!latestCursor) return;
      moveExternal(latestCursor.x, latestCursor.y);
      latestCursor = null;
    };
    const queueMove = (x: number, y: number) => {
      latestCursor = { x, y };
      if (!moveFrame) moveFrame = requestAnimationFrame(flushMove);
    };
    const finishDrag = () => {
      if (moveFrame) cancelAnimationFrame(moveFrame);
      flushMove();
      endExternal();
    };
    const toCss = (v: number) => v / (window.devicePixelRatio || 1);

    const unlistenPhase = listen<{
      seq: number;
      phase: string;
      id: string | null;
      x: number;
      y: number;
    }>("drag-phase", (e) => {
      if (stopped) return;
      const { seq, phase, id, x, y } = e.payload;
      if (phase === "pending" || phase === "drag") {
        if (!id || seq <= endedSeq) return;
        if (activeSeq !== seq) {
          activeSeq = seq;
          beginExternal(id, toCss(x), toCss(y));
        } else {
          queueMove(toCss(x), toCss(y));
        }
      } else if (activeSeq !== null) {
        endedSeq = Math.max(endedSeq, seq);
        activeSeq = null;
        queueMove(toCss(x), toCss(y)); // land exactly on the release point
        finishDrag();
      }
    });

    const unlistenPush = listen<{ seq: number; x: number; y: number }>("drag-cursor", (e) => {
      if (stopped || activeSeq === null || e.payload.seq !== activeSeq) return;
      queueMove(toCss(e.payload.x), toCss(e.payload.y));
    });

    return () => {
      stopped = true;
      if (moveFrame) cancelAnimationFrame(moveFrame);
      unlistenPhase.then((fn) => fn());
      unlistenPush.then((fn) => fn());
    };
  }, [beginExternal, moveExternal, endExternal]);

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden text-theme-primary select-none"
      style={bgStyle}
    >
      {draggingId && (
        <div
          style={{
            position: "absolute",
            left: `${dropTarget.x}px`,
            top: `${dropTarget.y}px`,
            width: `${metrics.widgetSize}px`,
            height: `${metrics.widgetSize}px`,
            borderRadius: WIDGET_RADIUS[draggingId] ?? "var(--radius-widget)",
          }}
          className="border-2 border-dashed border-nothing-widget-red/60 z-0 flex items-center justify-center pointer-events-none"
        />
      )}

      {visibleIds.map((id) => {
        const isDragging = draggingId === id;
        const base = positions[id] ?? layout.placed[id];
        if (!base) return null;

        return (
          <DraggableWidget
            key={id}
            id={id}
            x={base.x}
            y={base.y}
            isDragging={isDragging}
            radius={WIDGET_RADIUS[id]}
            noPadding={id === "clock"}
            onPointerDown={
              isTauri
                ? undefined
                : (e) => {
                    if ((e.target as HTMLElement).closest("button")) return;
                    e.preventDefault();
                    beginPointerDrag(id, e.clientX, e.clientY);
                  }
            }
          >
            {renderWidgetContent(id, settings)}
          </DraggableWidget>
        );
      })}
    </div>
  );
}
