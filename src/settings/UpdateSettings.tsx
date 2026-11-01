import { useCallback, useEffect, useRef, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { isTauri } from "../lib/tauri";
import { isNetworkError, isOffline, toErrorMessage, withTimeout } from "../lib/updater";

type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "offline"
  | "error";

const CHECK_TIMEOUT_MS = 12_000;
const OFFLINE_MESSAGE = "You're offline. Connect to the internet to check for updates.";
const UNREACHABLE_MESSAGE =
  "Couldn't reach the update server. Check your connection and try again.";

export default function UpdateSettings() {
  const [appVersion, setAppVersion] = useState("0.1.0");
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [updateInfo, setUpdateInfo] = useState<Update | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const statusRef = useRef<UpdateStatus>("idle");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

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

  useEffect(() => {
    if (isOffline()) {
      setErrorMessage(OFFLINE_MESSAGE);
      setStatus("offline");
    }
  }, []);

  const checkForUpdates = useCallback(async () => {
    setErrorMessage("");

    if (isOffline()) {
      setErrorMessage(OFFLINE_MESSAGE);
      setStatus("offline");
      return;
    }

    setStatus("checking");

    if (!isTauri) {
      setTimeout(() => {
        setStatus("up-to-date");
      }, 800);
      return;
    }

    try {
      const update = await withTimeout(check(), CHECK_TIMEOUT_MS);
      if (update) {
        setUpdateInfo(update);
        setStatus("available");
      } else {
        setStatus("up-to-date");
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
      if (isOffline() || isNetworkError(err)) {
        setErrorMessage(isOffline() ? OFFLINE_MESSAGE : UNREACHABLE_MESSAGE);
        setStatus("offline");
      } else {
        setErrorMessage(toErrorMessage(err, "Check failed"));
        setStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    const handleOffline = () => {
      if (
        statusRef.current === "available" ||
        statusRef.current === "downloading" ||
        statusRef.current === "ready"
      ) {
        return;
      }
      setErrorMessage(OFFLINE_MESSAGE);
      setStatus("offline");
    };
    const handleOnline = () => {
      if (statusRef.current === "offline") void checkForUpdates();
    };
    const handleFocus = () => {
      if (statusRef.current === "offline" && !isOffline()) void checkForUpdates();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") handleFocus();
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkForUpdates]);

  const installUpdate = async () => {
    if (!updateInfo || !isTauri) return;

    if (isOffline()) {
      setErrorMessage(OFFLINE_MESSAGE);
      setStatus("offline");
      return;
    }

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
      if (isOffline() || isNetworkError(err)) {
        setErrorMessage(isOffline() ? OFFLINE_MESSAGE : UNREACHABLE_MESSAGE);
        setStatus("offline");
      } else {
        setErrorMessage(toErrorMessage(err, "Installation failed"));
        setStatus("error");
      }
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
            {status === "offline" && (errorMessage || OFFLINE_MESSAGE)}
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
                  : status === "offline"
                    ? "Retry"
                    : "Check for Updates"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
