'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';
import type { HoleGeometry } from '@/lib/geometry';

interface HoleMapProps {
  geometry: HoleGeometry;
  courseName: string;
  className?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function isTokenConfigured(token: string | undefined): boolean {
  return Boolean(token && !token.includes('replace-me'));
}

export function HoleMap({ geometry, courseName, className = '' }: HoleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlayRect, setOverlayRect] = useState<DOMRect | null>(null);
  const [showLocalKnowledge, setShowLocalKnowledge] = useState(false);

  useEffect(() => {
    if (!isTokenConfigured(MAPBOX_TOKEN)) {
      setError('no-token');
      return;
    }
    if (!mapContainerRef.current) return;

    let cancelled = false;
    let map: unknown = null;

    (async () => {
      try {
        // Dynamic import keeps mapbox-gl out of the initial bundle
        const mod = await import('mapbox-gl');
        if (cancelled) return;

        const mapboxgl = mod.default;
        mapboxgl.accessToken = MAPBOX_TOKEN!;

        const [teeLat, teeLon] = geometry.tee;
        const [greenLat, greenLon] = geometry.green;
        const centerLon = (teeLon + greenLon) / 2;
        const centerLat = (teeLat + greenLat) / 2;

        map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/satellite-v9',
          center: [centerLon, centerLat],
          zoom: 17,
          attributionControl: false,
          interactive: true,
          dragRotate: false,
          pitchWithRotate: false,
        });
        mapRef.current = map;

        (map as { on: (ev: string, fn: () => void) => void }).on('load', () => {
          if (cancelled) return;

          // Fit to bbox of tee + green with some padding
          (map as {
            fitBounds: (b: [[number, number], [number, number]], opts: object) => void;
          }).fitBounds(
            [
              [Math.min(teeLon, greenLon) - 0.0006, Math.min(teeLat, greenLat) - 0.0006],
              [Math.max(teeLon, greenLon) + 0.0006, Math.max(teeLat, greenLat) + 0.0006],
            ],
            { padding: 40, animate: false, maxZoom: 18 },
          );

          // Refresh overlay bounding rect for SVG positioning
          if (mapContainerRef.current) {
            setOverlayRect(mapContainerRef.current.getBoundingClientRect());
          }
        });

        const updateRect = () => {
          if (mapContainerRef.current) {
            setOverlayRect(mapContainerRef.current.getBoundingClientRect());
          }
        };
        window.addEventListener('resize', updateRect);
        (map as { on: (ev: string, fn: () => void) => void }).on('move', updateRect);
      } catch (e) {
        if (!cancelled) {
          console.error('Mapbox load error', e);
          setError('load-failed');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  }, [geometry]);

  // Project tee & green to pixel positions inside the container, for SVG overlay
  const teeProjected = useProjectedPoint(mapRef, geometry.tee);
  const greenProjected = useProjectedPoint(mapRef, geometry.green);

  if (error === 'no-token') {
    return (
      <div className={`relative ${className}`}>
        <div className="flex h-full w-full flex-col items-center justify-center bg-forest/8 px-6 py-12 text-center">
          <p className="label-eyebrow">Map view</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink/70">
            Add a Mapbox token to <code className="rounded bg-cream px-1.5 py-0.5">NEXT_PUBLIC_MAPBOX_TOKEN</code>{' '}
            to see the satellite hole view.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapContainerRef}
        className="h-full w-full bg-ink"
        role="img"
        aria-label={`Satellite map of ${courseName} hole ${geometry.number}`}
      />
      {/* SVG overlay — drawn relative to the container, recalculated on map move */}
      {overlayRect && teeProjected && greenProjected && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${overlayRect.width} ${overlayRect.height}`}
          preserveAspectRatio="none"
        >
          {/* Centerline tee → green */}
          <line
            x1={teeProjected.x}
            y1={teeProjected.y}
            x2={greenProjected.x}
            y2={greenProjected.y}
            stroke="#F5F1EA"
            strokeWidth="2"
            strokeDasharray="5 6"
            opacity="0.85"
          />
          {/* Tee marker */}
          <g transform={`translate(${teeProjected.x}, ${teeProjected.y})`}>
            <circle r="9" fill="#B7872F" stroke="#F5F1EA" strokeWidth="2" />
            <text y="4" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1F1A14">
              T
            </text>
          </g>
          {/* Green marker */}
          <g transform={`translate(${greenProjected.x}, ${greenProjected.y})`}>
            <circle r="9" fill="#0E4D3F" stroke="#F5F1EA" strokeWidth="2" />
            <text y="4" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#F5F1EA">
              G
            </text>
          </g>
        </svg>
      )}
      {geometry.is_placeholder && (
        <div className="absolute right-3 top-3 rounded-chip border border-cream/40 bg-ink/60 px-2.5 py-1 text-[10px] uppercase tracking-wider text-cream/80">
          Approx. location
        </div>
      )}
      {/* Bottom sheet trigger for local knowledge — wired up by parent */}
      {showLocalKnowledge && (
        <button
          className="absolute bottom-3 right-3 rounded-chip border border-brass bg-cream px-3 py-1 text-xs font-medium text-forest shadow-card"
          onClick={() => setShowLocalKnowledge(false)}
        >
          Hide
        </button>
      )}
    </div>
  );
}

/** Hook: keep a screen-space projection of a [lat, lon] in sync with map movement. */
function useProjectedPoint(
  mapRef: React.MutableRefObject<unknown>,
  latLon: [number, number],
): { x: number; y: number } | null {
  const [pt, setPt] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) {
      // Try to recompute once map is set
      const id = setTimeout(() => {
        const m2 = mapRef.current;
        if (m2) {
          const projected = (m2 as { project: (ll: [number, number]) => { x: number; y: number } }).project([
            latLon[1],
            latLon[0],
          ]);
          setPt(projected);
        }
      }, 200);
      return () => clearTimeout(id);
    }

    const update = () => {
      const projected = (m as { project: (ll: [number, number]) => { x: number; y: number } }).project([
        latLon[1],
        latLon[0],
      ]);
      setPt(projected);
    };
    update();

    const mapWithOn = m as { on: (ev: string, fn: () => void) => void; off?: (ev: string, fn: () => void) => void };
    mapWithOn.on('move', update);
    mapWithOn.on('zoom', update);
    return () => {
      mapWithOn.off?.('move', update);
      mapWithOn.off?.('zoom', update);
    };
  }, [mapRef, latLon]);

  return pt;
}
