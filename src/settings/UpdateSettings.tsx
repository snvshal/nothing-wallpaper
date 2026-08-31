import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { isTauri } from "../lib/tauri";

type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "error";

export default function UpdateSettings() {
  const [appVersion, setAppVersion] = useState("0.1.0");
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [updateInfo, setUpdateInfo] = useState<Update | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (isTauri) {
      import("@tauri-apps/api/app")
        .then((m) => m.getVersion())
        .then((v) => {
          if (v) setAppVersion(v);
        })
        .catch(() => {});
    }
  }, []);

  const checkForUpdates = async () => {
    setStatus("checking");
    setErrorMessage("");

    if (!isTauri) {
      setTimeout(() => {
        setStatus("up-to-date");
      }, 800);
      return;
    }

    try {
      const update = await check();
      if (update) {
        setUpdateInfo(update);
        setStatus("available");
      } else {
        setStatus("up-to-date");
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
      setErrorMessage(err instanceof Error ? err.message : "Check failed");
      setStatus("error");
    }
  };

  const installUpdate = async () => {
    if (!updateInfo || !isTauri) return;

    try {
      setStatus("downloading");
      setProgress(0);

      let downloaded = 0;
      let total = 0;

      await updateInfo.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) {
            setProgress(Math.min(100, Math.round((downloaded / total) * 100)));
          }
        } else if (event.event === "Finished") {
          setProgress(100);
        }
      });

      setStatus("ready");
      await relaunch();
    } catch (err) {
      console.error("Failed to install update:", err);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : (err as { message?: string })?.message || "Installation failed";
      setErrorMessage(msg);
      setStatus("error");
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title">Updates</div>
      <div className="update-card">
        <div className="update-info">
          <div className="update-version">XN Wallpaper v{appVersion}</div>
          <div className="update-status-label">
            {status === "idle" && "Check for new releases & features"}
            {status === "checking" && "Checking for updates..."}
            {status === "up-to-date" && "You're on the latest version"}
            {status === "available" && `New version v${updateInfo?.version} available`}
            {status === "downloading" && `Downloading update: ${progress}%`}
            {status === "ready" && "Update installed. Restarting..."}
            {status === "error" && (errorMessage || "Unable to check updates")}
          </div>
        </div>

        <div className="update-actions">
          {status === "available" ? (
            <button
              type="button"
              className="theme-mode-btn active"
              onClick={installUpdate}
              aria-label="Download and install update"
            >
              Update Now
            </button>
          ) : status === "ready" ? (
            <button
              type="button"
              className="theme-mode-btn active"
              onClick={() => void relaunch()}
              aria-label="Restart application"
            >
              Restart
            </button>
          ) : (
            <button
              type="button"
              className="theme-mode-btn"
              disabled={status === "checking" || status === "downloading"}
              onClick={checkForUpdates}
              aria-label="Check for software updates"
            >
              {status === "checking"
                ? "Checking..."
                : status === "downloading"
                  ? "Downloading..."
                  : "Check for Updates"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
