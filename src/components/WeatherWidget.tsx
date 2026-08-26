import { useState, useEffect } from "react";
import { fetchWeather, type WeatherData } from "../lib/weather";
import type { TempUnit } from "../settings/settings-store";

interface WeatherWidgetProps {
  city?: string;
  tempUnit?: TempUnit;
}

export default function WeatherWidget({ city = "", tempUnit = "celsius" }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await fetchWeather(city, tempUnit);
        if (active) setWeather(data);
      } catch {
        // Retain previous or fallback
      }
    };

    void load();
    const interval = setInterval(load, 60 * 60 * 1000); // 1 hour (60 minutes)
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [city, tempUnit]);

  const displayTemp = weather ? `${weather.temperature}\u00B0` : "--\u00B0";
  const displayEmoji = weather?.emoji ?? "\u2601";
  const displayCity = weather?.city ?? (city || "Weather");

  return (
    <>
      <div className="flex justify-end items-start">
        <span className="font-dot text-theme-primary select-none text-widget-title">
          {displayTemp}
        </span>
      </div>
      <div className="my-auto flex items-center justify-center">
        <span
          className="font-emoji text-theme-primary select-none leading-none"
          style={{ fontSize: "calc(var(--widget-size) * 0.39)" }}
        >
          {displayEmoji}
        </span>
      </div>
      <div className="font-body text-theme-secondary tracking-wider select-none text-widget-subtitle truncate max-w-full">
        {displayCity}
      </div>
    </>
  );
}
