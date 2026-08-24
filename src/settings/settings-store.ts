import { LazyStore } from "@tauri-apps/plugin-store";
import { emit } from "@tauri-apps/api/event";
import { DEFAULT_UNIT, UNIT_OPTIONS } from "../lib/placement";
import { isTauri } from "../lib/tauri";

export type ThemeMode = "dark" | "light" | "system";
export type TempUnit = "celsius" | "fahrenheit";

export interface AppSettings {
  wallpaper: string;
  widgets: Record<string, boolean>;
  positions: Record<string, { x: number; y: number }>;
  unit: number;
  theme: ThemeMode;
  weatherCity: string;
  tempUnit: TempUnit;
}

const DEFAULTS: AppSettings = {
  wallpaper: "default",
  widgets: {
    clock: true,
    calendar: true,
    weather: true,
    ram: true,
    wifi: true,
  },
  positions: {},
  unit: 16,
  theme: "dark",
  weatherCity: "",
  tempUnit: "celsius",
};

const tauriStore = isTauri
  ? new LazyStore("settings.json", {
      defaults: DEFAULTS as unknown as Record<string, unknown>,
      autoSave: true,
    })
  : null;

// Plain-browser fallback (`bun run dev` outside Tauri): mirror settings into
// localStorage so the preview keeps positions and choices across reloads.
// localStorage can throw (privacy mode, disabled); memory keeps the session
// working without persistence.
const memoryFallback: Record<string, unknown> = {};
const FALLBACK_PREFIX = "nothing-wallpaper:";

function storageAvailable(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

async function getValue<T>(key: string): Promise<T | null> {
  if (tauriStore) return (await tauriStore.get<T>(key)) ?? null;
  if (!storageAvailable()) return (memoryFallback[key] as T) ?? null;
  const raw = localStorage.getItem(FALLBACK_PREFIX + key);
  return raw == null ? null : (JSON.parse(raw) as T);
}

async function setValue(key: string, value: unknown): Promise<void> {
  if (tauriStore) {
    await tauriStore.set(key, value);
    return;
  }
  memoryFallback[key] = value;
  if (storageAvailable()) {
    localStorage.setItem(FALLBACK_PREFIX + key, JSON.stringify(value));
  }
}

export async function loadSettings(): Promise<AppSettings> {
  const wallpaper = (await getValue<string>("wallpaper")) ?? DEFAULTS.wallpaper;
  const storedWidgets = await getValue<Record<string, boolean>>("widgets");
  const widgets = { ...DEFAULTS.widgets, ...storedWidgets };
  const positions =
    (await getValue<Record<string, { x: number; y: number }>>("positions")) ?? DEFAULTS.positions;
  const storedUnit = await getValue<number>("unit");
  const unit = storedUnit != null && UNIT_OPTIONS.includes(storedUnit) ? storedUnit : DEFAULT_UNIT;
  const storedTheme = await getValue<ThemeMode>("theme");
  const theme =
    storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
      ? storedTheme
      : DEFAULTS.theme;
  const weatherCity = (await getValue<string>("weatherCity")) ?? DEFAULTS.weatherCity;
  const storedTempUnit = await getValue<TempUnit>("tempUnit");
  const tempUnit =
    storedTempUnit === "celsius" || storedTempUnit === "fahrenheit"
      ? storedTempUnit
      : DEFAULTS.tempUnit;
  return { wallpaper, widgets, positions, unit, theme, weatherCity, tempUnit };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await setValue("wallpaper", settings.wallpaper);
  await setValue("widgets", settings.widgets);
  await setValue("positions", settings.positions);
  await setValue("unit", settings.unit);
  await setValue("theme", settings.theme);
  await setValue("weatherCity", settings.weatherCity);
  await setValue("tempUnit", settings.tempUnit);
  if (isTauri) await emit("settings-changed", settings);
}
