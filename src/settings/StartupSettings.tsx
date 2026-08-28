import { useEffect, useState } from "react";
import { disable, enable } from "@tauri-apps/plugin-autostart";
import { isTauri } from "../lib/tauri";
import { ensureDefaultAutostart, setValue } from "./settings-store";

export default function StartupSettings() {
  const [autostart, setAutostart] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isTauri) {
      setLoading(false);
      return;
    }

    ensureDefaultAutostart()
      .then((enabled) => {
        setAutostart(enabled);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to check autostart status:", err);
        setLoading(false);
      });
  }, []);

  const toggle = async () => {
    if (loading) return;
    const next = !autostart;
    setAutostart(next);

    if (!isTauri) return;

    try {
      if (next) {
        await enable();
      } else {
        await disable();
      }
      await setValue("autostart_configured", true);
    } catch (err) {
      console.error("Failed to update autostart setting:", err);
      // Revert on error
      setAutostart(!next);
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title">System</div>
      <div className="widget-row">
        <span className="widget-label" id="startup-toggle-label">
          Launch on Startup
        </span>
        <label className="toggle">
          <input
            id="startup-toggle"
            name="startup-toggle"
            type="checkbox"
            checked={autostart}
            disabled={loading}
            onChange={toggle}
            aria-labelledby="startup-toggle-label"
          />
          <span className="toggle-track" />
          <span className="toggle-thumb" />
        </label>
      </div>
    </div>
  );
}
