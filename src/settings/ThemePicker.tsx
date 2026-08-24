import type { ThemeMode } from "./settings-store";

interface ThemePickerProps {
  theme: ThemeMode;
  onSelect: (theme: ThemeMode) => void;
}

const THEME_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "system", label: "System" },
];

export default function ThemePicker({ theme, onSelect }: ThemePickerProps) {
  return (
    <div className="settings-section">
      <div className="settings-section-title">Theme</div>
      <div className="theme-grid">
        {THEME_OPTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`theme-mode-btn ${theme === id ? "active" : ""}`}
            onClick={() => onSelect(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
