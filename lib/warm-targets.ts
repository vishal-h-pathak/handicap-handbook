import arrowheadImagery from '@/content/imagery/arrowhead.resolved.json';
import blackmoorImagery from '@/content/imagery/blackmoor.resolved.json';
import kingsNorthImagery from '@/content/imagery/kings-north.resolved.json';
import trueBlueImagery from '@/content/imagery/true-blue.resolved.json';
import { COURSE_IDS, type Course, type CourseImage, getCourse, holeId } from './content';

interface ResolvedManifest {
  images: Array<CourseImage & { local_path?: string; local_path_1280?: string; local_path_640?: string }>;
}

const IMAGERY: Record<string, ResolvedManifest> = {
  blackmoor: blackmoorImagery as ResolvedManifest,
  'true-blue': trueBlueImagery as ResolvedManifest,
  arrowhead: arrowheadImagery as ResolvedManifest,
  'kings-north': kingsNorthImagery as ResolvedManifest,
};

/**
 * The list of URLs the home page eagerly fetches on first load to seed the
 * service worker's runtime cache. Designed for an "install at home with WiFi,
 * use on the course offline" pattern.
 */
export function buildWarmupList(): { routes: string[]; images: string[] } {
  const routes: string[] = ['/', '/trip/'];

  for (const id of COURSE_IDS) {
    routes.push(`/courses/${id}/`);
    const course = getCourse(id) as Course;
    for (const hole of course.holes) {
      routes.push(`/courses/${id}/holes/${holeId(hole)}/`);
    }
  }

  const images: string[] = [];
  for (const id of COURSE_IDS) {
    const manifest = IMAGERY[id];
    if (!manifest) continue;
    for (const img of manifest.images) {
      const candidates = [img.local_path_640, img.local_path_1280, img.local_path];
      for (const c of candidates) {
        if (c && !images.includes(c)) images.push(c);
      }
    }
  }

  return { routes, images };
}
