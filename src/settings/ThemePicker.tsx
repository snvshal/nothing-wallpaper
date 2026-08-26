import type { ThemeMode, SurfaceStyle } from "./settings-store";

interface ThemePickerProps {
  theme: ThemeMode;
  surfaceStyle: SurfaceStyle;
  onSelectTheme: (theme: ThemeMode) => void;
  onSelectSurface: (surface: SurfaceStyle) => void;
}

const THEME_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "system", label: "System" },
];

const SURFACE_OPTIONS: { id: SurfaceStyle; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "glass", label: "Frosted Glass" },
];

export default function ThemePicker({
  theme,
  surfaceStyle,
  onSelectTheme,
  onSelectSurface,
}: ThemePickerProps) {
  return (
    <div className="settings-section">
      <div className="settings-section-title">Theme</div>
      <div className="theme-grid">
        {THEME_OPTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`theme-mode-btn ${theme === id ? "active" : ""}`}
            onClick={() => onSelectTheme(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: "14px" }}>
        <div
          className="settings-section-title"
          style={{ fontSize: "11px", opacity: 0.75, marginBottom: "8px" }}
        >
          Widget Surface
        </div>
        <div className="theme-grid">
          {SURFACE_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`theme-mode-btn ${surfaceStyle === id ? "active" : ""}`}
              onClick={() => onSelectSurface(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
