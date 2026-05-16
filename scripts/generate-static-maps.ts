/**
 * scripts/generate-static-maps.ts
 *
 * Pre-renders a static satellite image for every hole at build time, using
 * Mapbox's Static Images API. These act as offline fallbacks for the HoleMap
 * component when Mapbox GL JS fails to load (no signal, blocked by Safari, etc).
 *
 * Requires MAPBOX_TOKEN in the environment. Skipped silently if not set.
 *
 * Outputs to public/images/<courseId>/holes/<holeId>-map.png at 800×600.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import arrowheadGeom from '../content/geometry/arrowhead.json';
import blackmoorGeom from '../content/geometry/blackmoor.json';
import kingsNorthGeom from '../content/geometry/kings-north.json';
import trueBlueGeom from '../content/geometry/true-blue.json';

const TOKEN = process.env.MAPBOX_TOKEN;

interface HoleGeom {
  number: number;
  nine?: 'cypress' | 'lakes' | 'waterway';
  tee: [number, number];
  green: [number, number];
}
interface CourseGeom {
  course_id: string;
  holes: HoleGeom[];
}

const GEOMETRIES: CourseGeom[] = [
  blackmoorGeom as CourseGeom,
  trueBlueGeom as CourseGeom,
  arrowheadGeom as CourseGeom,
  kingsNorthGeom as CourseGeom,
];

function holeFileId(h: HoleGeom): string {
  return h.nine ? `${h.nine}-${h.number}` : String(h.number);
}

/**
 * Build a Mapbox Static Images API URL centered between tee and green.
 * Format: /styles/v1/{username}/{style_id}/static/{lon},{lat},{zoom}/{width}x{height}
 */
function buildStaticUrl(h: HoleGeom, w: number, h2: number): string {
  const [teeLat, teeLon] = h.tee;
  const [greenLat, greenLon] = h.green;
  const cLon = (teeLon + greenLon) / 2;
  const cLat = (teeLat + greenLat) / 2;
  const zoom = 17.4;
  // Two pin markers — brass for the tee, forest for the green
  const teeMarker = `pin-s-t+B7872F(${teeLon},${teeLat})`;
  const greenMarker = `pin-s-g+0E4D3F(${greenLon},${greenLat})`;
  return (
    `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/` +
    `${teeMarker},${greenMarker}/${cLon},${cLat},${zoom}/${w}x${h2}@2x` +
    `?access_token=${TOKEN}`
  );
}

async function main() {
  if (!TOKEN || TOKEN.includes('replace-me')) {
    console.log('MAPBOX_TOKEN not set — skipping static map generation.');
    console.log('Drop a token in .env.local and re-run `pnpm static-maps` when ready.');
    return;
  }

  let total = 0;
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const geom of GEOMETRIES) {
    const dir = join(process.cwd(), 'public', 'images', geom.course_id, 'holes');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    for (const hole of geom.holes) {
      total++;
      const fileId = holeFileId(hole);
      const outPath = join(dir, `${fileId}-map.png`);
      if (existsSync(outPath)) {
        skipped++;
        continue;
      }
      const url = buildStaticUrl(hole, 800, 600);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        await writeFile(outPath, buf);
        downloaded++;
        console.log(`  ✓ ${geom.course_id}/${fileId}-map.png (${(buf.length / 1024).toFixed(0)} KB)`);
        // Gentle delay to stay under Mapbox's free-tier rate limit (50k/month, ~60/s burst)
        await new Promise((r) => setTimeout(r, 80));
      } catch (e) {
        failed++;
        console.log(`  ✗ ${geom.course_id}/${fileId}-map.png: ${(e as Error).message}`);
      }
    }
  }
  console.log(`\nDone. ${downloaded} downloaded, ${skipped} already existed, ${failed} failed, ${total} total.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
