import { getCurrentWindow } from "@tauri-apps/api/window";
import appIcon from "../assets/icon.png";

export default function TitleBar() {
  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-brand" data-tauri-drag-region>
        <img src={appIcon} alt="" className="titlebar-icon" data-tauri-drag-region />
        <span className="titlebar-title" data-tauri-drag-region>
          XN WALLPAPER
        </span>
      </div>
      <div className="titlebar-actions">
        <button
          type="button"
          className="titlebar-btn"
          aria-label="Minimize"
          onClick={() => void getCurrentWindow().minimize()}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M1 5h8" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
        <button
          type="button"
          className="titlebar-btn titlebar-btn-close"
          aria-label="Close"
          onClick={() => void getCurrentWindow().close()}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
