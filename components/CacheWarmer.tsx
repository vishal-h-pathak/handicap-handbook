'use client';

import { useEffect, useState } from 'react';

interface CacheWarmerProps {
  routes: string[];
  images: string[];
}

const CONCURRENCY = 4;

async function withConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
  concurrency: number,
  onProgress: (done: number) => void,
): Promise<void> {
  let cursor = 0;
  let done = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      try {
        await fn(items[idx]!);
      } catch {
        /* ignore individual failures */
      }
      done++;
      onProgress(done);
    }
  });
  await Promise.all(workers);
}

export function CacheWarmer({ routes, images }: CacheWarmerProps) {
  const [status, setStatus] = useState<'idle' | 'warming' | 'ready'>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Only run once per browser
    const KEY = 'hh-cache-warmed-v1';
    if (window.localStorage.getItem(KEY) === '1') {
      setStatus('ready');
      return;
    }

    let cancelled = false;

    const start = async () => {
      // Wait for the SW to be controlling the page
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (!reg || cancelled) return;

      setStatus('warming');
      const all: { url: string; init?: RequestInit }[] = [
        ...routes.map((url) => ({ url })),
        ...images.map((url) => ({ url, init: { mode: 'no-cors' as const } })),
      ];

      await withConcurrency(
        all,
        async ({ url, init }) => {
          await fetch(url, init);
        },
        CONCURRENCY,
        (done) => {
          if (!cancelled) {
            setProgress(Math.round((done / all.length) * 100));
          }
        },
      );

      if (!cancelled) {
        window.localStorage.setItem(KEY, '1');
        setStatus('ready');
      }
    };

    // Delay so we don't fight the page's initial paint
    const t = setTimeout(start, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [routes, images]);

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-30 -translate-x-1/2">
      {status === 'warming' && (
        <div className="rounded-chip border border-ink/10 bg-surface/95 px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink/70 shadow-card">
          <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brass" />
          Caching for offline · {progress}%
        </div>
      )}
      {status === 'ready' && progress > 0 && (
        <div className="rounded-chip border border-forest/30 bg-cream/95 px-3 py-1.5 text-[10px] uppercase tracking-wider text-forest shadow-card">
          ✓ Offline-ready
        </div>
      )}
    </div>
  );
}
