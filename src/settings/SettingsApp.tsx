import { useEffect, useState } from "react";
import { loadSettings, saveSettings, type AppSettings } from "./settings-store";
import WallpaperPicker from "./WallpaperPicker";
import WidgetToggles from "./WidgetToggles";

export default function SettingsApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  if (!settings) return null;

  const update = async (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    await saveSettings(next);
  };

  return (
    <div className="settings-container">
      <div className="settings-header">Settings</div>

      <WallpaperPicker
        selected={settings.wallpaper}
        onSelect={(wallpaper) => update({ wallpaper })}
      />

      <WidgetToggles widgets={settings.widgets} onToggle={(widgets) => update({ widgets })} />
    </div>
  );
}
