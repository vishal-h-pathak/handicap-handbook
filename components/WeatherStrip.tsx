'use client';

import { useEffect, useState } from 'react';
import {
  type ForecastResult,
  describeWeather,
  fetchForecast,
  shortDayLabel,
} from '@/lib/weather';

export function WeatherStrip({ context }: { context: string }) {
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchForecast(ctrl.signal)
      .then(setForecast)
      .catch((e: unknown) => {
        if ((e as { name?: string }).name !== 'AbortError') {
          setError((e as Error).message);
        }
      });
    return () => ctrl.abort();
  }, []);

  return (
    <div>
      {error && (
        <p className="text-xs text-muted">Weather unavailable offline — try once you have signal.</p>
      )}

      {!forecast && !error && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-24 w-16 shrink-0 animate-pulse rounded-card bg-ink/5"
              aria-hidden
            />
          ))}
        </div>
      )}

      {forecast && (
        <div className="-mx-1 flex gap-2 overflow-x-auto pb-2">
          {forecast.days.map((day) => {
            const { label, glyph } = describeWeather(day.weatherCode);
            const isTripDay = isWithinTrip(day.date);
            return (
              <div
                key={day.date}
                className={`flex h-28 w-16 shrink-0 flex-col items-center justify-between rounded-card border px-2 py-3 text-center ${
                  isTripDay ? 'border-brass bg-brass/8' : 'border-ink/10 bg-surface'
                }`}
                title={label}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink/70">
                  {shortDayLabel(day.date)}
                </span>
                <span aria-hidden className="text-2xl leading-none">
                  {glyph}
                </span>
                <span className="font-display text-sm leading-none text-ink">
                  {day.highF}°
                  <span className="text-muted">/{day.lowF}°</span>
                </span>
                <span className="text-[10px] leading-none text-muted">
                  {day.precipChance > 10 ? `${day.precipChance}%` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 max-w-prose text-xs italic leading-relaxed text-muted">{context}</p>
    </div>
  );
}

const TRIP_START = '2026-05-22';
const TRIP_END = '2026-05-25';
function isWithinTrip(date: string): boolean {
  return date >= TRIP_START && date <= TRIP_END;
}
