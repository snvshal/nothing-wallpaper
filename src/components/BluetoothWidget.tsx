import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../lib/tauri";

interface BluetoothStatus {
  enabled: boolean;
  connected: boolean;
  device_name: string | null;
}

const getBrowserInitialStatus = (): BluetoothStatus => ({
  enabled: true,
  connected: true,
  device_name: "Nothing Ear",
});

export default function BluetoothWidget() {
  const [status, setStatus] = useState<BluetoothStatus>(getBrowserInitialStatus);
  const togglingRef = useRef(false);

  const fetchStatus = async () => {
    if (!isTauri) return;
    try {
      const res = await invoke<BluetoothStatus>("get_bluetooth_status");
      setStatus((prev) =>
        prev.enabled === res.enabled &&
        prev.connected === res.connected &&
        prev.device_name === res.device_name
          ? prev
          : res,
      );
    } catch {
      // Ignore transient failures
    }
  };

  useEffect(() => {
    if (!isTauri) return;
    void fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (togglingRef.current) return;
    togglingRef.current = true;

    if (isTauri) {
      try {
        await invoke("toggle_bluetooth");
        setTimeout(fetchStatus, 400);
      } catch {
        // Fallback handled in Rust
      }
    } else {
      setStatus((prev) => ({
        ...prev,
        enabled: !prev.enabled,
        connected: !prev.enabled,
        device_name: !prev.enabled ? "Nothing Ear" : null,
      }));
    }

    setTimeout(() => {
      togglingRef.current = false;
    }, 600);
  };

  const displayName = status.enabled ? status.device_name || "Bluetooth On" : "Bluetooth Off";

  return (
    <div
      className="w-full h-full flex items-center justify-center select-none overflow-hidden"
      title={displayName}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Toggle Bluetooth: currently ${displayName}`}
        className={`w-full h-full flex items-center justify-center cursor-pointer outline-none p-0 rounded-full active:scale-90 transition-all duration-200 ${
          status.enabled
            ? "bg-nothing-widget-red text-white"
            : "bg-transparent text-theme-secondary hover:text-theme-primary"
        }`}
        title="Toggle Bluetooth"
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
          <path d="M7 7l10 10-5 5V2l5 5L7 17" />
        </svg>
      </button>
    </div>
  );
}
