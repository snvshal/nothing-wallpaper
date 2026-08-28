import { useEffect, useMemo, useRef, useState } from "react";
import { emitTo, listen } from "@tauri-apps/api/event";
import {
  clampToScreen,
  collidesWithAny,
  defaultPositions,
  evaluateLayout,
  findFreePosition,
  gridMetrics,
  rescalePositions,
  type Screen,
} from "../lib/placement";
import { loadSettings, saveSettings, type AppSettings } from "./settings-store";
import { useTheme } from "../hooks/useTheme";
import GridUnitPicker from "./GridUnitPicker";
import TitleBar from "./TitleBar";
import ThemePicker from "./ThemePicker";
import WallpaperPicker from "./WallpaperPicker";
import WeatherSettings from "./WeatherSettings";
import WidgetToggles from "./WidgetToggles";
import LayoutMinimap from "./LayoutMinimap";
import StartupSettings from "./StartupSettings";

const WIDGET_IDS = [
  "clock",
  "calendar",
  "weather",
  "ram",
  "wifi",
  "bluetooth",
  "volume",
  "music",
  "screentime",
  "countdown",
];

const FALLBACK_SCREEN: Screen = { width: 1920, height: 1080 };

export default function SettingsApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [screen, setScreen] = useState<Screen>(FALLBACK_SCREEN);
  const settingsRef = useRef<AppSettings | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-surface", settings?.surfaceStyle ?? "solid");
  }, [settings?.surfaceStyle]);

  useEffect(() => {
    emitTo("main", "request-screen", null).catch(() => {});
    const unlisten = listen<Screen>("screen-info", (event) => setScreen(event.payload));
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const unlisten = listen<AppSettings>("settings-changed", (event) => {
      const local = settingsRef.current;
      if (local && JSON.stringify(event.payload) === JSON.stringify(local)) return;
      setSettings(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const visibleIds = useMemo(
    () => (settings ? WIDGET_IDS.filter((id) => settings.widgets[id]) : WIDGET_IDS),
    [settings],
  );

  const unit = settings?.unit ?? 16;
  const activeTheme = useTheme(settings?.theme ?? "dark");
  const metrics = useMemo(() => gridMetrics(unit), [unit]);

  const seededPositions = useMemo(
    () => ({ ...defaultPositions(metrics), ...settings?.positions }),
    [settings?.positions, metrics],
  );

  const layout = useMemo(
    () => evaluateLayout(visibleIds, seededPositions, screen, metrics),
    [visibleIds, seededPositions, screen, metrics],
  );

  if (!settings) return null;

  const update = async (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    await saveSettings(next);
  };

  const updateWidgets = async (widgets: Record<string, boolean>) => {
    const enabling = WIDGET_IDS.filter((id) => widgets[id] && !settings.widgets[id]);
    let positions = settings.positions;
    for (const id of enabling) {
      const others = evaluateLayout(
        WIDGET_IDS.filter((otherId) => otherId !== id && widgets[otherId]),
        seededPositions,
        screen,
        metrics,
      ).placed;
      const saved = positions[id];
      if (saved && !collidesWithAny(id, clampToScreen(saved, screen, metrics), others, metrics))
        continue;
      const free = findFreePosition(others, id, screen, metrics);
      if (free) positions = { ...positions, [id]: free };
    }
    await update({ widgets, positions });
  };

  const changeUnit = async (nextUnit: number) => {
    await update({
      unit: nextUnit,
      positions: rescalePositions(settings.positions, unit, nextUnit),
    });
  };

  return (
    <div className="settings-shell">
      <TitleBar />
      <div className="settings-body">
        <div className="settings-container">
          <StartupSettings />

          <ThemePicker
            theme={settings.theme}
            surfaceStyle={settings.surfaceStyle}
            onSelectTheme={(theme) => update({ theme })}
            onSelectSurface={(surfaceStyle) => update({ surfaceStyle })}
          />

          <WallpaperPicker
            selected={settings.wallpaper}
            activeTheme={activeTheme}
            onSelect={(wallpaper) => update({ wallpaper })}
          />

          <WeatherSettings
            city={settings.weatherCity}
            tempUnit={settings.tempUnit}
            onChange={(partial) => update(partial)}
          />

          <WidgetToggles widgets={settings.widgets} onToggle={updateWidgets} />

          <GridUnitPicker unit={unit} onSelect={changeUnit} />

          <LayoutMinimap
            widgets={settings.widgets}
            placed={layout.placed}
            positions={seededPositions}
            screen={screen}
            metrics={metrics}
            noSpaceIds={layout.skipped}
            onChange={(positions) => update({ positions })}
          />
        </div>
      </div>
    </div>
  );
}
