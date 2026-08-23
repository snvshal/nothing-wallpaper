import { LazyStore } from "@tauri-apps/plugin-store";
import { emit } from "@tauri-apps/api/event";
import { DEFAULT_UNIT, UNIT_OPTIONS } from "../lib/placement";

export interface AppSettings {
  wallpaper: string;
  widgets: Record<string, boolean>;
  positions: Record<string, { x: number; y: number }>;
  unit: number;
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
  unit: 16,
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
  const storedUnit = await store.get<number>("unit");
  const unit = storedUnit != null && UNIT_OPTIONS.includes(storedUnit) ? storedUnit : DEFAULT_UNIT;
  return { wallpaper, widgets, positions, unit };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await store.set("wallpaper", settings.wallpaper);
  await store.set("widgets", settings.widgets);
  await store.set("positions", settings.positions);
  await store.set("unit", settings.unit);
  await emit("settings-changed", settings);
}
