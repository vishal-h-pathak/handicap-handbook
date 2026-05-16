export interface ForecastDay {
  date: string;
  highF: number;
  lowF: number;
  weatherCode: number;
  precipChance: number;
}

export interface ForecastResult {
  days: ForecastDay[];
  fetchedAt: string;
}

const MYRTLE_BEACH = { lat: 33.69, lon: -78.89 } as const;

const OPEN_METEO_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${MYRTLE_BEACH.lat}` +
  `&longitude=${MYRTLE_BEACH.lon}` +
  '&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max' +
  '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch' +
  '&timezone=America%2FNew_York&forecast_days=7';

export async function fetchForecast(signal?: AbortSignal): Promise<ForecastResult> {
  const res = await fetch(OPEN_METEO_URL, { signal });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const json: {
    daily: {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      weather_code: number[];
      precipitation_probability_max: number[];
    };
  } = await res.json();
  const days: ForecastDay[] = json.daily.time.map((date, i) => ({
    date,
    highF: Math.round(json.daily.temperature_2m_max[i] ?? 0),
    lowF: Math.round(json.daily.temperature_2m_min[i] ?? 0),
    weatherCode: json.daily.weather_code[i] ?? 0,
    precipChance: json.daily.precipitation_probability_max[i] ?? 0,
  }));
  return { days, fetchedAt: new Date().toISOString() };
}

/** WMO weather codes → editorial summary (short label, glyph) */
export function describeWeather(code: number): { label: string; glyph: string } {
  if (code === 0) return { label: 'Clear', glyph: '☀' };
  if (code === 1 || code === 2) return { label: 'Mostly clear', glyph: '🌤' };
  if (code === 3) return { label: 'Overcast', glyph: '☁' };
  if (code === 45 || code === 48) return { label: 'Fog', glyph: '🌫' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', glyph: '🌦' };
  if (code >= 61 && code <= 65) return { label: 'Rain', glyph: '🌧' };
  if (code >= 66 && code <= 67) return { label: 'Freezing rain', glyph: '🌧' };
  if (code >= 71 && code <= 77) return { label: 'Snow', glyph: '❄' };
  if (code >= 80 && code <= 82) return { label: 'Showers', glyph: '🌦' };
  if (code >= 85 && code <= 86) return { label: 'Snow showers', glyph: '🌨' };
  if (code === 95) return { label: 'Storm', glyph: '⛈' };
  if (code >= 96 && code <= 99) return { label: 'Hailstorm', glyph: '⛈' };
  return { label: '—', glyph: '·' };
}

export function shortDayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}
