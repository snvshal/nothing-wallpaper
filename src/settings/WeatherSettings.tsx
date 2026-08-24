import { useState, useEffect } from "react";
import { getAutoCity, getLastAutoCity } from "../lib/weather";
import type { TempUnit } from "./settings-store";

interface WeatherSettingsProps {
  city: string;
  tempUnit: TempUnit;
  onChange: (partial: { weatherCity?: string; tempUnit?: TempUnit }) => void;
}

export default function WeatherSettings({ city, tempUnit, onChange }: WeatherSettingsProps) {
  const [localCity, setLocalCity] = useState(city);
  const [detectedCity, setDetectedCity] = useState(getLastAutoCity);

  useEffect(() => {
    setLocalCity(city);
  }, [city]);

  useEffect(() => {
    void getAutoCity().then((name) => {
      if (name) setDetectedCity(name);
    });
  }, []);

  const handleBlur = () => {
    if (localCity !== city) {
      onChange({ weatherCity: localCity });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const placeholderText = detectedCity ? `Auto (${detectedCity})` : "Auto-detect (IP location)";

  return (
    <div className="settings-section">
      <div className="settings-section-title">Weather</div>
      <div className="weather-settings-row">
        <div className="weather-input-wrapper">
          <input
            id="weather-city-input"
            name="weatherCity"
            type="text"
            autoComplete="address-level2"
            className="weather-city-input"
            value={localCity}
            onChange={(e) => setLocalCity(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            aria-label="City name for weather"
          />
          {localCity && (
            <button
              type="button"
              className="weather-clear-btn"
              onClick={() => {
                setLocalCity("");
                onChange({ weatherCity: "" });
              }}
              aria-label="Reset to auto-detect location"
            >
              &times;
            </button>
          )}
        </div>
        <div className="weather-unit-group">
          <button
            type="button"
            className={`theme-mode-btn ${tempUnit === "celsius" ? "active" : ""}`}
            onClick={() => onChange({ tempUnit: "celsius" })}
          >
            &deg;C
          </button>
          <button
            type="button"
            className={`theme-mode-btn ${tempUnit === "fahrenheit" ? "active" : ""}`}
            onClick={() => onChange({ tempUnit: "fahrenheit" })}
          >
            &deg;F
          </button>
        </div>
      </div>
    </div>
  );
}
