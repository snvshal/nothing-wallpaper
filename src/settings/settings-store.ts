import { LazyStore } from "@tauri-apps/plugin-store";
import { emit } from "@tauri-apps/api/event";

export interface AppSettings {
  wallpaper: string;
  widgets: Record<string, boolean>;
  positions: Record<string, { x: number; y: number }>;
}

const DEFAULTS: AppSettings = {
  wallpaper: "default",
  widgets: {
    clock: true,
    calendar: true,
    weather: true,
    ram: true,
  },
  positions: {},
};

const store = new LazyStore("settings.json", {
  defaults: DEFAULTS as unknown as Record<string, unknown>,
  autoSave: true,
});

export async function loadSettings(): Promise<AppSettings> {
  const wallpaper = (await store.get<string>("wallpaper")) ?? DEFAULTS.wallpaper;
  const widgets = (await store.get<Record<string, boolean>>("widgets")) ?? DEFAULTS.widgets;
  const positions =
    (await store.get<Record<string, { x: number; y: number }>>("positions")) ?? DEFAULTS.positions;
  return { wallpaper, widgets, positions };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await store.set("wallpaper", settings.wallpaper);
  await store.set("widgets", settings.widgets);
  await store.set("positions", settings.positions);
  await emit("settings-changed", settings);
}
