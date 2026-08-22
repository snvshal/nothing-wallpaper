import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { DEFAULT_WALLPAPER_URL } from "../lib/constants";

interface WallpaperPickerProps {
  selected: string;
  onSelect: (wallpaper: string) => void;
}

export default function WallpaperPicker({ selected, onSelect }: WallpaperPickerProps) {
  const isCustom = selected !== "default" && selected !== "system";

  const handleCustom = async () => {
    const path = await open({
      multiple: false,
      filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp"] }],
    });
    if (path) {
      onSelect(path as string);
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title">Wallpaper</div>
      <div className="wallpaper-grid">
        {isCustom ? (
          <div
            className="wallpaper-thumb selected"
            style={{ backgroundImage: `url('${convertFileSrc(selected)}')` }}
            role="img"
            aria-label="Current custom wallpaper"
          />
        ) : selected === "system" ? (
          <div
            className="wallpaper-thumb selected wallpaper-thumb-system"
            aria-label="System wallpaper"
          >
            <span>SYSTEM</span>
          </div>
        ) : (
          <div
            className="wallpaper-thumb selected"
            style={{ backgroundImage: `url('${DEFAULT_WALLPAPER_URL}')` }}
            role="img"
            aria-label="Current default wallpaper"
          />
        )}
        <div className="wallpaper-controls">
          <button
            className={`wallpaper-mode-btn ${selected === "default" ? "active" : ""}`}
            onClick={() => onSelect("default")}
            type="button"
          >
            Default
          </button>
          <button
            className={`wallpaper-mode-btn ${selected === "system" ? "active" : ""}`}
            onClick={() => onSelect("system")}
            type="button"
          >
            System
          </button>
          <button
            className={`wallpaper-mode-btn ${isCustom ? "active" : ""}`}
            onClick={handleCustom}
            type="button"
          >
            Choose custom image...
          </button>
        </div>
      </div>
      {isCustom && <div className="wallpaper-current">{selected.split(/[\\/]/).pop()}</div>}
    </div>
  );
}
