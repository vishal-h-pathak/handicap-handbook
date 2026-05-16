import arrowheadGeom from '@/content/geometry/arrowhead.json';
import blackmoorGeom from '@/content/geometry/blackmoor.json';
import kingsNorthGeom from '@/content/geometry/kings-north.json';
import trueBlueGeom from '@/content/geometry/true-blue.json';
import type { CourseId } from './content';

export type LatLon = [number, number];

export interface HoleGeometry {
  number: number;
  nine?: 'cypress' | 'lakes' | 'waterway';
  tee: LatLon;
  green: LatLon;
  bbox: [LatLon, LatLon];
  is_placeholder: boolean;
}

export interface CourseGeometry {
  course_id: CourseId;
  center: LatLon;
  zoom: number;
  generated_at: string;
  holes: HoleGeometry[];
  research_notes: string;
}

const GEOMETRY: Record<CourseId, CourseGeometry> = {
  blackmoor: blackmoorGeom as CourseGeometry,
  arrowhead: arrowheadGeom as CourseGeometry,
  'true-blue': trueBlueGeom as CourseGeometry,
  'kings-north': kingsNorthGeom as CourseGeometry,
};

export function getCourseGeometry(id: CourseId): CourseGeometry {
  return GEOMETRY[id];
}

export function getHoleGeometry(
  id: CourseId,
  number: number,
  nine?: HoleGeometry['nine'],
): HoleGeometry | null {
  const geom = GEOMETRY[id];
  if (nine) return geom.holes.find((h) => h.number === number && h.nine === nine) ?? null;
  return geom.holes.find((h) => h.number === number) ?? null;
}
