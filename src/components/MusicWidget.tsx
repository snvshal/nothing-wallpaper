import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../lib/tauri";

interface MediaStatus {
  is_playing: boolean;
  title: string;
  artist: string;
  album: string;
  cover_base64?: string;
}

const MOCK_TRACKS = [
  { title: "I Am A God", artist: "Kanye West", album: "YEEZUS" },
  { title: "Blinding Lights", artist: "The Weeknd", album: "After Hours" },
  { title: "Starboy", artist: "The Weeknd", album: "Starboy" },
  { title: "Sicko Mode", artist: "Travis Scott", album: "Astroworld" },
];

const IDLE_MEDIA: MediaStatus = {
  is_playing: false,
  title: "Nothing Playing",
  artist: "Idle",
  album: "",
  cover_base64: "",
};

export default function MusicWidget() {
  const [media, setMedia] = useState<MediaStatus>(IDLE_MEDIA);
  const mockIndex = useRef(0);

  const fetchStatus = useCallback(async () => {
    if (!isTauri) return;
    try {
      const res = await invoke<MediaStatus>("get_media_status");
      setMedia((prev) =>
        prev.is_playing === res.is_playing &&
        prev.title === res.title &&
        prev.artist === res.artist &&
        prev.album === res.album &&
        prev.cover_base64 === res.cover_base64
          ? prev
          : res,
      );
    } catch {
      // Retain state on transient error
    }
  }, []);

  useEffect(() => {
    if (!isTauri) {
      // Browser preview: interactive mock simulation
      const interval = setInterval(() => {
        setMedia((prev) => {
          if (!prev.is_playing) return prev;
          return { ...prev };
        });
      }, 3000);
      return () => clearInterval(interval);
    }

    void fetchStatus();
    const interval = setInterval(fetchStatus, 800);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTauri) {
      try {
        await invoke("toggle_media_playback");
        setTimeout(fetchStatus, 250);
      } catch {
        // Ignore
      }
    } else {
      setMedia((prev) => {
        if (prev.is_playing) {
          return IDLE_MEDIA;
        }
        const track = MOCK_TRACKS[mockIndex.current % MOCK_TRACKS.length];
        mockIndex.current += 1;
        return { ...track, is_playing: true, cover_base64: "" };
      });
    }
  };

  const handleNext = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTauri) {
      try {
        await invoke("seek_media", { deltaSeconds: 5 });
        setTimeout(fetchStatus, 300);
      } catch {
        // Ignore
      }
    } else {
      setMedia((prev) => {
        if (!prev.is_playing) return prev;
        const track = MOCK_TRACKS[mockIndex.current % MOCK_TRACKS.length];
        mockIndex.current += 1;
        return { ...track, is_playing: true, cover_base64: "" };
      });
    }
  };

  const handlePrev = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTauri) {
      try {
        await invoke("seek_media", { deltaSeconds: -5 });
        setTimeout(fetchStatus, 300);
      } catch {
        // Ignore
      }
    } else {
      setMedia((prev) => {
        if (!prev.is_playing) return prev;
        mockIndex.current = (mockIndex.current + MOCK_TRACKS.length - 2) % MOCK_TRACKS.length;
        const track = MOCK_TRACKS[mockIndex.current];
        mockIndex.current += 1;
        return { ...track, is_playing: true, cover_base64: "" };
      });
    }
  };

  const hasActiveMedia =
    media.is_playing || (media.title !== "Nothing Playing" && media.title !== "");

  return (
    <div className="w-full h-full flex items-center justify-between select-none overflow-hidden gap-4">
      {/* Left Column: Contained Full-Size Standalone CD with Floating Tangent Red Pill */}
      <div
        className="relative h-full flex items-center justify-end flex-shrink-0"
        style={{ width: "calc(var(--unit) * 7.80)" }}
      >
        {/* Simple Capsule Stylus Needle (Exact 8px Gap at 150° Tangent with rotate(30deg)) */}
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            top: "calc(var(--unit) * 0.50)",
            left: "calc(var(--unit) * 0.44)",
            transform: "rotate(30deg)",
            transformOrigin: "center",
          }}
        >
          <div
            className="rounded-full bg-nothing-widget-red"
            style={{
              width: "calc(var(--unit) * 0.42)",
              height: "calc(var(--unit) * 1.8)",
            }}
          />
        </div>

        {/* Spinning Metallic CD Disc (Full Height, Shifted Right with True Center Cutout Hole) */}
        <div
          className={`relative rounded-full flex items-center justify-center flex-shrink-0 aspect-square h-full ${
            media.is_playing ? "animate-[spin_6s_linear_infinite]" : ""
          }`}
          style={{
            background: "var(--theme-cd-disc)",
            border: "1px solid var(--theme-cd-border)",
            maskImage: "radial-gradient(circle, transparent 5.4%, black 5.6%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 5.4%, black 5.6%)",
          }}
        >
          {/* Center Spindle Ring */}
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: "30%",
              height: "30%",
              background: "var(--theme-cd-hub)",
              border: "1px solid var(--theme-cd-border)",
            }}
          >
            {/* Center Spindle Hole Rim */}
            <div
              className="rounded-full border border-widget-subtle"
              style={{
                width: "36%",
                height: "36%",
              }}
            />
          </div>
        </div>
      </div>

      {/* Right Column: Symmetrical Centered Stack (Cover, Track Info, Clean Vector Controls) */}
      <div className="flex-1 h-full flex flex-col items-center justify-between min-w-0 overflow-hidden text-center">
        {/* Top: Square Album Cover Art */}
        <div
          className="rounded-none border border-widget-subtle overflow-hidden flex-shrink-0 bg-widget-surface flex items-center justify-center"
          style={{
            width: "calc(var(--unit) * 3.0)",
            height: "calc(var(--unit) * 3.0)",
          }}
        >
          {media.cover_base64 ? (
            <img
              src={media.cover_base64}
              alt="Album Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-widget-surface p-1">
              <span
                className="font-dot text-theme-muted leading-none font-bold"
                style={{ fontSize: "calc(var(--unit) * 0.85)" }}
              >
                (•)
              </span>
            </div>
          )}
        </div>

        {/* Middle: Clean Track & Artist Metadata */}
        <div className="flex flex-col items-center justify-center min-w-0 w-full px-1 overflow-hidden pointer-events-none my-auto">
          <span
            className="font-body text-theme-primary font-medium tracking-tight truncate w-full block text-center leading-tight"
            style={{ fontSize: "calc(var(--unit) * 0.65)" }}
            title={media.title}
          >
            {media.title}
          </span>
          <span
            className="font-dot text-theme-muted tracking-tight truncate w-full block text-center leading-tight mt-0.5"
            style={{ fontSize: "calc(var(--unit) * 0.50)" }}
            title={media.artist}
          >
            {media.artist}
          </span>
        </div>

        {/* Bottom: 3 Clean Borderless Vector Controls (No Circle Borders) */}
        <div
          className="flex items-center justify-center pointer-events-auto flex-shrink-0"
          style={{ gap: "calc(var(--unit) * 0.8)" }}
        >
          {/* Previous Track: Lightly Merged Double Arrow */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={!hasActiveMedia}
            aria-label="Previous Track"
            className="p-0 border-none bg-transparent outline-none cursor-pointer text-theme-primary hover:text-nothing-widget-red active:scale-90 transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center"
            title="Previous Track"
            style={{
              width: "calc(var(--unit) * 1.15)",
              height: "calc(var(--unit) * 1.15)",
            }}
          >
            <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 5L3.5 12l8.5 7V5zm6.5 0L10 12l8.5 7V5z" />
            </svg>
          </button>

          {/* Play / Pause Toggle: Pure Vector Path Morphing Transition */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={!hasActiveMedia}
            aria-label={media.is_playing ? "Pause" : "Play"}
            className={`p-0 border-none bg-transparent outline-none cursor-pointer active:scale-90 transition-colors duration-200 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center ${
              media.is_playing
                ? "text-nothing-widget-red"
                : "text-theme-primary hover:text-nothing-widget-red"
            }`}
            title={media.is_playing ? "Pause" : "Play"}
            style={{
              width: "calc(var(--unit) * 1.15)",
              height: "calc(var(--unit) * 1.15)",
            }}
          >
            <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
              <path
                className="transition-all duration-300 ease-in-out"
                style={{
                  transitionProperty: "d, fill",
                  transitionDuration: "250ms",
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                d={
                  media.is_playing
                    ? "M6 5 L9.5 5 L9.5 19 L6 19 Z M14.5 5 L18 5 L18 19 L14.5 19 Z"
                    : "M7 5 L12 8 L12 16 L7 19 Z M12 8 L19 12 L19 12 L12 16 Z"
                }
              />
            </svg>
          </button>

          {/* Next Track: Lightly Merged Double Arrow */}
          <button
            type="button"
            onClick={handleNext}
            disabled={!hasActiveMedia}
            aria-label="Next Track"
            className="p-0 border-none bg-transparent outline-none cursor-pointer text-theme-primary hover:text-nothing-widget-red active:scale-90 transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center"
            title="Next Track"
            style={{
              width: "calc(var(--unit) * 1.15)",
              height: "calc(var(--unit) * 1.15)",
            }}
          >
            <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.5 5L14 12 5.5 19V5zm6.5 0L20.5 12 12 19V5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
