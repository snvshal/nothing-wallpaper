import type { TempUnit } from "../settings/settings-store";

export interface WeatherData {
  temperature: number;
  emoji: string;
  city: string;
  weatherCode: number;
  isDay?: number;
}

interface CachedWeather {
  data: WeatherData;
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour (60 minutes)
const CACHE_PREFIX = "nothing-weather:";
const KNOWN_NEW_MOON_UTC_MS = Date.UTC(2024, 0, 11, 11, 57);
const SYNODIC_MONTH_DAYS = 29.53058770576;
const MS_PER_DAY = 86_400_000;

/**
 * Calculates current normalized lunar cycle phase (0.0 = New Moon, 0.5 = Full Moon).
 */
export function getMoonPhase(date: Date = new Date()): number {
  const diffDays = (date.getTime() - KNOWN_NEW_MOON_UTC_MS) / MS_PER_DAY;
  return (
    (((diffDays % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS) /
    SYNODIC_MONTH_DAYS
  );
}

/**
 * Returns the astronomical 8-phase lunar emoji glyph for nighttime skies.
 */
export function getMoonEmoji(date: Date = new Date()): string {
  const phase = getMoonPhase(date);
  const MOON_PHASES = [
    "\u{1F311}", // 🌑 New Moon
    "\u{1F312}", // 🌒 Waxing Crescent
    "\u{1F313}", // 🌓 First Quarter
    "\u{1F314}", // 🌔 Waxing Gibbous
    "\u{1F315}", // 🌕 Full Moon
    "\u{1F316}", // 🌖 Waning Gibbous
    "\u{1F317}", // 🌗 Last Quarter
    "\u{1F318}", // 🌘 Waning Crescent
  ];
  const index = Math.floor(((phase + 0.0625) % 1) * 8);
  return MOON_PHASES[index] ?? "\u{1F315}";
}

export function getWeatherEmoji(code: number, isDay: number = 1, date: Date = new Date()): string {
  // WMO Weather interpretation codes (WW)
  // https://open-meteo.com/en/docs
  if (code === 0) {
    return isDay ? "\u2600" : getMoonEmoji(date); // Clear sky: Sun (day) or Moon phase (night)
  }
  if (code === 1 || code === 2) {
    return isDay ? "\u26C5" : getMoonEmoji(date); // Mainly clear / partly cloudy
  }
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
  city: "London",
  weatherCode: 3,
  isDay: 1,
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
    }&current=temperature_2m,weather_code,is_day&temperature_unit=${
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
    const isDay =
      typeof current?.is_day === "number"
        ? current.is_day
        : new Date().getHours() >= 6 && new Date().getHours() < 20
          ? 1
          : 0;

    const result: WeatherData = {
      temperature: Math.round(rawTemp),
      emoji: getWeatherEmoji(weatherCode, isDay),
      city: loc.city,
      weatherCode,
      isDay,
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
