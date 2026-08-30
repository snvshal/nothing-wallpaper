import type { ThemeMode, SurfaceStyle } from "./settings-store";

interface ThemePickerProps {
  theme: ThemeMode;
  surfaceStyle: SurfaceStyle;
  glassOpacity: number;
  onSelectTheme: (theme: ThemeMode) => void;
  onSelectSurface: (surface: SurfaceStyle) => void;
  onChangeGlassOpacity: (opacity: number) => void;
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
  glassOpacity,
  onSelectTheme,
  onSelectSurface,
  onChangeGlassOpacity,
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
        {surfaceStyle === "glass" && (
          <div className="glass-opacity-control">
            <div className="glass-opacity-header">
              <span className="glass-opacity-label">Frosted Opacity</span>
              <span className="glass-opacity-value">{glassOpacity}%</span>
            </div>
            <div className="glass-opacity-slider-wrap">
              <span className="glass-opacity-bound">10%</span>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={glassOpacity}
                aria-label="Frosted Glass Opacity"
                className="glass-opacity-slider"
                style={
                  {
                    "--slider-fill": `${Math.round(((glassOpacity - 10) / (80 - 10)) * 100)}%`,
                  } as React.CSSProperties
                }
                onChange={(e) => onChangeGlassOpacity(Number(e.target.value))}
              />
              <span className="glass-opacity-bound">80%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
