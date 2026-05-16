/**
 * scripts/extract-hole-geometry.ts
 *
 * Generates content/geometry/<id>.json with approximate tee + green coordinates
 * per hole. For V1 this uses course-center coordinates as fallback for every
 * hole, with a small deterministic offset based on hole number so the map
 * pans slightly per hole and feels alive. Per-hole geometry can be refined
 * manually later by editing the output JSONs.
 *
 * Course centers are approximate — derived from published street addresses.
 * Refine by clicking a course in Mapbox / Google Maps and updating these values.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import arrowheadCourse from '../content/courses/arrowhead.json';
import blackmoorCourse from '../content/courses/blackmoor.json';
import kingsNorthCourse from '../content/courses/kings-north.json';
import trueBlueCourse from '../content/courses/true-blue.json';

type CourseId = 'blackmoor' | 'true-blue' | 'arrowhead' | 'kings-north';

interface HoleGeom {
  number: number;
  nine?: 'cypress' | 'lakes' | 'waterway';
  tee: [number, number];   // [lat, lon]
  green: [number, number];
  bbox: [[number, number], [number, number]];
  is_placeholder: boolean;
}

interface CourseGeometry {
  course_id: CourseId;
  center: [number, number];
  zoom: number;
  generated_at: string;
  holes: HoleGeom[];
  research_notes: string;
}

// Approximate course centers (lat, lon). Verified against street addresses;
// refine by adjusting in this file or directly in the generated JSON.
const COURSE_CENTERS: Record<CourseId, { lat: number; lon: number; zoom: number; note: string }> = {
  blackmoor: {
    lat: 33.5494,
    lon: -79.0319,
    zoom: 15,
    note: '6100 Longwood Drive, Murrells Inlet, SC 29576',
  },
  arrowhead: {
    lat: 33.7188,
    lon: -78.962,
    zoom: 15,
    note: '1201 Burcale Rd, Myrtle Beach, SC 29577',
  },
  'true-blue': {
    lat: 33.4615,
    lon: -79.114,
    zoom: 15,
    note: '900 Blue Stem Dr, Pawleys Island, SC 29585',
  },
  'kings-north': {
    lat: 33.743,
    lon: -79.053,
    zoom: 15,
    note: '4900 National Dr, Myrtle Beach, SC 29579 (Myrtle Beach National)',
  },
};

const COURSE_DATA: Record<CourseId, { holes: Array<{ number: number; nine?: string }> }> = {
  blackmoor: blackmoorCourse,
  'true-blue': trueBlueCourse,
  'arrowhead': arrowheadCourse,
  'kings-north': kingsNorthCourse,
};

/**
 * Spread holes in a small circle around the course center so the map view
 * pans per hole rather than every hole landing in the same spot.
 * ~0.003° in lat is ~330m — large enough to be visible but small enough
 * to still show the whole course property at zoom 15.
 */
function placeholderHole(centerLat: number, centerLon: number, idx: number, total: number): Pick<HoleGeom, 'tee' | 'green' | 'bbox'> {
  const angle = (idx / total) * Math.PI * 2;
  const radius = 0.003;
  const teeLat = centerLat + Math.sin(angle) * radius;
  const teeLon = centerLon + Math.cos(angle) * radius;
  // Place the green ~120m away in the inward direction
  const greenLat = centerLat + Math.sin(angle) * (radius * 0.6);
  const greenLon = centerLon + Math.cos(angle) * (radius * 0.6);
  const minLat = Math.min(teeLat, greenLat) - 0.0008;
  const maxLat = Math.max(teeLat, greenLat) + 0.0008;
  const minLon = Math.min(teeLon, greenLon) - 0.0008;
  const maxLon = Math.max(teeLon, greenLon) + 0.0008;
  return {
    tee: [teeLat, teeLon],
    green: [greenLat, greenLon],
    bbox: [
      [minLat, minLon],
      [maxLat, maxLon],
    ],
  };
}

async function generateForCourse(id: CourseId) {
  const center = COURSE_CENTERS[id];
  const source = COURSE_DATA[id];
  const total = source.holes.length;
  const holes: HoleGeom[] = source.holes.map((h, idx) => {
    const placeholder = placeholderHole(center.lat, center.lon, idx, total);
    return {
      number: h.number,
      ...(h.nine ? { nine: h.nine as HoleGeom['nine'] } : {}),
      tee: placeholder.tee,
      green: placeholder.green,
      bbox: placeholder.bbox,
      is_placeholder: true,
    };
  });

  const geometry: CourseGeometry = {
    course_id: id,
    center: [center.lat, center.lon],
    zoom: center.zoom,
    generated_at: new Date().toISOString(),
    holes,
    research_notes: `Course center derived from street address (${center.note}). Per-hole tee/green coordinates are placeholder — distributed in a circle around the center so each hole has a distinct map view. Refine manually by clicking the tee and green of each hole in Mapbox or Google Maps and updating the corresponding entry's tee and green arrays. The map component will use exact coordinates as soon as you supply them; until then, the view stays scoped to the course property.`,
  };

  const dir = join(process.cwd(), 'content', 'geometry');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  const outPath = join(dir, `${id}.json`);
  await writeFile(outPath, JSON.stringify(geometry, null, 2));
  console.log(`✓ ${id}: ${holes.length} holes (all placeholder, centered around ${center.lat.toFixed(4)}, ${center.lon.toFixed(4)})`);
}

async function main() {
  console.log('—— Generating hole geometry ——');
  for (const id of Object.keys(COURSE_CENTERS) as CourseId[]) {
    await generateForCourse(id);
  }
  console.log('\nDone. Edit content/geometry/*.json to refine per-hole tee/green coordinates.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
