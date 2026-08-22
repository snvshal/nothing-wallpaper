import { useEffect, useMemo, useRef, useState } from "react";
import { emitTo, listen } from "@tauri-apps/api/event";
import {
  DEFAULT_POSITIONS,
  clampToScreen,
  collidesWithAny,
  evaluateLayout,
  findFreePosition,
  type Screen,
} from "../lib/placement";
import { loadSettings, saveSettings, type AppSettings } from "./settings-store";
import TitleBar from "./TitleBar";
import WallpaperPicker from "./WallpaperPicker";
import WidgetToggles from "./WidgetToggles";
import LayoutMinimap from "./LayoutMinimap";

const WIDGET_IDS = Object.keys(DEFAULT_POSITIONS);

const FALLBACK_SCREEN: Screen = { width: 1920, height: 1080 };

export default function SettingsApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [screen, setScreen] = useState<Screen>(FALLBACK_SCREEN);
  const settingsRef = useRef<AppSettings | null>(null);

  settingsRef.current = settings;

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

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

  const seededPositions = useMemo(
    () => ({ ...DEFAULT_POSITIONS, ...settings?.positions }),
    [settings],
  );

  const layout = useMemo(
    () => evaluateLayout(visibleIds, seededPositions, screen),
    [visibleIds, seededPositions, screen],
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
      ).placed;
      const saved = positions[id];
      if (saved && !collidesWithAny(id, clampToScreen(saved, screen), others)) continue;
      const free = findFreePosition(others, id, screen);
      if (free) positions = { ...positions, [id]: free };
    }
    await update({ widgets, positions });
  };

  return (
    <div className="settings-shell">
      <TitleBar />
      <div className="settings-body">
        <div className="settings-container">
          <WallpaperPicker
            selected={settings.wallpaper}
            onSelect={(wallpaper) => update({ wallpaper })}
          />

          <WidgetToggles widgets={settings.widgets} onToggle={updateWidgets} />

          <LayoutMinimap
            widgets={settings.widgets}
            placed={layout.placed}
            positions={seededPositions}
            screen={screen}
            noSpaceIds={layout.skipped}
            onChange={(positions) => update({ positions })}
          />
        </div>
      </div>
    </div>
  );
}
