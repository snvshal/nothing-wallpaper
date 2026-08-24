import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../lib/tauri";

interface WifiStatus {
  enabled: boolean;
  connected: boolean;
  ssid: string;
  signal_level: number;
  rx_rate: string;
  tx_rate: string;
}

const getBrowserInitialStatus = (): WifiStatus => {
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  return {
    enabled: true,
    connected: online,
    ssid: online ? "Nothing-5G" : "No Internet",
    signal_level: online ? 3 : 0,
    rx_rate: online ? "4.2 MB/s" : "0 KB/s",
    tx_rate: online ? "1.1 MB/s" : "0 KB/s",
  };
};

export default function WifiWidget() {
  const [status, setStatus] = useState<WifiStatus>(getBrowserInitialStatus);
  const [toggling, setToggling] = useState(false);

  const fetchStatus = async () => {
    if (!isTauri) return;
    try {
      const res = await invoke<WifiStatus>("get_wifi_status");
      setStatus((prev) =>
        prev.enabled === res.enabled &&
        prev.connected === res.connected &&
        prev.ssid === res.ssid &&
        prev.signal_level === res.signal_level &&
        prev.rx_rate === res.rx_rate &&
        prev.tx_rate === res.tx_rate
          ? prev
          : res,
      );
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (!isTauri) {
      const handleOnline = () =>
        setStatus((prev) =>
          prev.enabled
            ? {
                ...prev,
                connected: true,
                ssid: "Nothing-5G",
                rx_rate: "4.2 MB/s",
                tx_rate: "1.1 MB/s",
                signal_level: 3,
              }
            : prev,
        );

      const handleOffline = () =>
        setStatus((prev) =>
          prev.enabled
            ? {
                ...prev,
                connected: false,
                ssid: "No Internet",
                rx_rate: "0 KB/s",
                tx_rate: "0 KB/s",
                signal_level: 0,
              }
            : prev,
        );

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Subtle dynamic simulation for live web preview
      const interval = setInterval(() => {
        setStatus((prev) => {
          if (!prev.enabled || !prev.connected) return prev;
          const rx = (3.5 + Math.random() * 2.0).toFixed(1);
          const tx = (0.8 + Math.random() * 0.7).toFixed(1);
          return { ...prev, rx_rate: `${rx} MB/s`, tx_rate: `${tx} MB/s` };
        });
      }, 3000);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        clearInterval(interval);
      };
    }

    void fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toggling) return;
    setToggling(true);

    if (isTauri) {
      try {
        await invoke("toggle_wifi");
        setTimeout(fetchStatus, 500);
      } catch {
        // Ignore
      }
    } else {
      // Interactive toggle in browser preview
      setStatus((prev) => {
        const nextEnabled = !prev.enabled;
        const online = typeof navigator !== "undefined" ? navigator.onLine : true;
        return {
          enabled: nextEnabled,
          connected: nextEnabled && online,
          ssid: nextEnabled ? (online ? "Nothing-5G" : "No Internet") : "Wi-Fi Off",
          signal_level: nextEnabled && online ? 3 : 0,
          rx_rate: nextEnabled && online ? "4.2 MB/s" : "0 KB/s",
          tx_rate: nextEnabled && online ? "1.1 MB/s" : "0 KB/s",
        };
      });
    }

    setTimeout(() => setToggling(false), 600);
  };

  const isOnline = status.enabled && status.connected;
  const displayName = isOnline ? status.ssid : status.enabled ? "No Internet" : "Wi-Fi Off";

  return (
    <div
      className="w-full h-full flex items-center select-none overflow-hidden"
      style={{
        paddingLeft: "calc(var(--unit) * 0.75)",
        paddingRight: "calc(var(--unit) * 0.75)",
        gap: "calc(var(--unit) * 0.5)",
      }}
      title={isOnline ? `${status.ssid} (↓ ${status.rx_rate} ↑ ${status.tx_rate})` : displayName}
    >
      {/* Quick-Toggle Icon Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Toggle Wi-Fi: currently ${displayName}`}
        className="flex-shrink-0 cursor-pointer outline-none bg-transparent p-0 flex items-center justify-center rounded-full"
        title="Toggle Wi-Fi"
      >
        <svg
          className={`transition-colors duration-200 ${
            isOnline ? "text-nothing-widget-red" : "text-theme-muted"
          }`}
          style={{
            width: "calc(var(--unit) * 1.35)",
            height: "calc(var(--unit) * 1.35)",
          }}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          {status.enabled ? (
            /* Single Fully Filled Solid Cone (Refined ~75° Subtle Spread) */
            <path d="M12 20.8L2.8 8.2A14.8 14.8 0 0 1 21.2 8.2L12 20.8Z" />
          ) : (
            <>
              {/* Fully Filled Cone with Diagonal Slash when Off */}
              <path d="M12 20.8L2.8 8.2A14.8 14.8 0 0 1 21.2 8.2L12 20.8Z" opacity="0.3" />
              <line
                x1="2"
                y1="2"
                x2="22"
                y2="22"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>
      </button>

      {/* Info Column (Draggable surface) */}
      <div className="flex flex-col items-start min-w-0 flex-1 overflow-hidden text-left pointer-events-none">
        <span
          className="font-body text-theme-primary font-medium leading-tight truncate w-full block"
          style={{ fontSize: "calc(var(--unit) * 0.65)" }}
        >
          {displayName}
        </span>
        <span
          className="font-dot text-theme-secondary tracking-tight leading-tight truncate w-full block"
          style={{
            fontSize: "calc(var(--unit) * 0.52)",
            marginTop: "calc(var(--unit) * 0.1)",
          }}
        >
          {isOnline ? `\u2193 ${status.rx_rate}  \u2191 ${status.tx_rate}` : "Disconnected"}
        </span>
      </div>
    </div>
  );
}
