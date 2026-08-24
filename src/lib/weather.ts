import type { TempUnit } from "../settings/settings-store";

export interface WeatherData {
  temperature: number;
  emoji: string;
  city: string;
  weatherCode: number;
}

interface CachedWeather {
  data: WeatherData;
  timestamp: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_PREFIX = "nothing-weather:";

export function getWeatherEmoji(code: number): string {
  // WMO Weather interpretation codes (WW)
  // https://open-meteo.com/en/docs
  if (code === 0) return "\u2600"; // Clear sky
  if (code === 1 || code === 2) return "\u26C5"; // Mainly clear, partly cloudy
  if (code === 3) return "\u2601"; // Overcast
  if (code === 45 || code === 48) return "\u{1F32B}"; // Fog / depositing rime fog
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "\u{1F327}"; // Rain / Drizzle / Showers
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "\u2744"; // Snow
  if (code >= 95 && code <= 99) return "\u26A1"; // Thunderstorm
  return "\u2601"; // Default cloud
}

interface LocationCoord {
  latitude: number;
  longitude: number;
  city: string;
}

async function resolveLocation(cityQuery?: string): Promise<LocationCoord> {
  const trimmed = cityQuery?.trim();
  if (trimmed) {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmed,
    )}&count=1&language=en&format=json`;
    const res = await fetch(geoUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        return {
          latitude: item.latitude,
          longitude: item.longitude,
          city: item.name,
        };
      }
    }
  }

  // Fallback / Default: IP-based geolocation
  try {
    const res = await fetch("https://get.geojs.io/v1/ip/geo.json");
    if (res.ok) {
      const data = await res.json();
      return {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        city: data.city || "Local",
      };
    }
  } catch {
    // Continue to secondary IP fallback
  }

  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = await res.json();
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city || "Local",
      };
    }
  } catch {
    // Default coordinates if network fails completely
  }

  const detectedCity = "London";
  return {
    latitude: 51.5074,
    longitude: -0.1278,
    city: trimmed || detectedCity,
  };
}

export function getLastAutoCity(): string {
  try {
    return localStorage.getItem("nothing-weather:last-auto-city") || "";
  } catch {
    return "";
  }
}

export async function getAutoCity(): Promise<string> {
  const cached = getLastAutoCity();
  if (cached) return cached;
  try {
    const loc = await resolveLocation();
    if (loc.city && loc.city !== "Local") {
      try {
        localStorage.setItem("nothing-weather:last-auto-city", loc.city);
      } catch {
        // Ignore
      }
      return loc.city;
    }
  } catch {
    // Ignore
  }
  return "";
}

const DEFAULT_FALLBACK: WeatherData = {
  temperature: 28,
  emoji: "\u2601",
  city: "Villupuram",
  weatherCode: 3,
};

export async function fetchWeather(
  cityQuery?: string,
  tempUnit: TempUnit = "celsius",
): Promise<WeatherData> {
  const cacheKey = `${CACHE_PREFIX}${cityQuery?.trim().toLowerCase() || "auto"}:${tempUnit}`;
  let staleFallback: WeatherData | null = null;

  // Check cache in browser / memory
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed: CachedWeather = JSON.parse(cached);
      staleFallback = parsed.data;
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        return parsed.data;
      }
    }
  } catch {
    // Storage access might fail in private context
  }

  try {
    const loc = await resolveLocation(cityQuery);
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${
      loc.longitude
    }&current=temperature_2m,weather_code&temperature_unit=${
      tempUnit === "fahrenheit" ? "fahrenheit" : "celsius"
    }`;

    const res = await fetch(weatherUrl);
    if (!res.ok) {
      throw new Error(`Weather API returned ${res.status}`);
    }

    const data = await res.json();
    const current = data.current;
    const rawTemp = current?.temperature_2m ?? (tempUnit === "fahrenheit" ? 82 : 28);
    const weatherCode = current?.weather_code ?? 3;

    const result: WeatherData = {
      temperature: Math.round(rawTemp),
      emoji: getWeatherEmoji(weatherCode),
      city: loc.city,
      weatherCode,
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
      if (!cityQuery?.trim() && loc.city && loc.city !== "Local") {
        localStorage.setItem("nothing-weather:last-auto-city", loc.city);
      }
    } catch {
      // Ignore storage errors
    }

    return result;
  } catch {
    // Offline or network error: return stale cache or fallback default
    if (staleFallback) return staleFallback;
    return {
      ...DEFAULT_FALLBACK,
      city: cityQuery?.trim() || DEFAULT_FALLBACK.city,
      temperature: tempUnit === "fahrenheit" ? 82 : 28,
    };
  }
}
