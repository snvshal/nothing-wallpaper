import { open } from "@tauri-apps/plugin-dialog";

interface WallpaperPickerProps {
  selected: string;
  onSelect: (wallpaper: string) => void;
}

export default function WallpaperPicker({ selected, onSelect }: WallpaperPickerProps) {
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
        <div
          className={`wallpaper-thumb ${selected === "default" ? "selected" : ""}`}
          style={{ backgroundImage: "url('/background.jpg')" }}
          onClick={() => onSelect("default")}
          onKeyDown={(e) => e.key === "Enter" && onSelect("default")}
          role="button"
          tabIndex={0}
          aria-label="Default wallpaper"
        />
        <button className="wallpaper-custom-btn" onClick={handleCustom} type="button">
          Choose custom image...
        </button>
      </div>
    </div>
  );
}
