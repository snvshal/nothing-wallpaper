import { useEffect, useState } from "react";
import type { ThemeMode } from "../settings/settings-store";

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme(mode: ThemeMode = "dark"): "dark" | "light" {
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(() =>
    mode === "system" ? getSystemTheme() : mode,
  );

  useEffect(() => {
    if (mode !== "system") {
      setResolvedTheme(mode);
      return;
    }

    setResolvedTheme(getSystemTheme());

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? "dark" : "light");
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  return resolvedTheme;
}
