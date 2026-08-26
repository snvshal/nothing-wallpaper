import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../lib/tauri";

interface AudioVolumeInfo {
  muted: boolean;
  volume: number;
}

const getBrowserInitialStatus = (): AudioVolumeInfo => ({
  muted: false,
  volume: 0.75,
});

export default function VolumeWidget() {
  const [status, setStatus] = useState<AudioVolumeInfo>(getBrowserInitialStatus);
  const togglingRef = useRef(false);

  const fetchStatus = async () => {
    if (!isTauri) return;
    try {
      const res = await invoke<AudioVolumeInfo>("get_audio_volume");
      setStatus((prev) => (prev.muted === res.muted && prev.volume === res.volume ? prev : res));
    } catch {
      // Ignore transient failures
    }
  };

  useEffect(() => {
    if (!isTauri) return;
    void fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (togglingRef.current) return;
    togglingRef.current = true;

    // Optimistic instant tactile feedback
    setStatus((prev) => ({
      ...prev,
      muted: !prev.muted,
    }));

    if (isTauri) {
      try {
        await invoke("toggle_audio_mute");
        setTimeout(fetchStatus, 200);
      } catch {
        void fetchStatus();
      }
    }

    setTimeout(() => {
      togglingRef.current = false;
    }, 500);
  };

  const displayName = status.muted ? "Audio Muted" : `Volume ${Math.round(status.volume * 100)}%`;

  return (
    <div
      className="w-full h-full flex items-center justify-center select-none overflow-hidden"
      title={displayName}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Toggle Mute: currently ${displayName}`}
        className={`w-full h-full flex items-center justify-center cursor-pointer outline-none p-0 rounded-full active:scale-90 transition-all duration-200 ${
          status.muted
            ? "bg-nothing-widget-red text-white"
            : "bg-transparent text-theme-secondary hover:text-theme-primary"
        }`}
        title="Toggle Audio Mute"
      >
        <svg
          style={{
            width: "calc(var(--unit) * 1.5)",
            height: "calc(var(--unit) * 1.5)",
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {status.muted ? (
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="22" y1="9" x2="16" y2="15" />
              <line x1="16" y1="9" x2="22" y2="15" />
            </>
          ) : (
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
