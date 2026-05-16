import arrowheadCourse from '@/content/courses/arrowhead.json';
import blackmoorCourse from '@/content/courses/blackmoor.json';
import kingsNorthCourse from '@/content/courses/kings-north.json';
import trueBlueCourse from '@/content/courses/true-blue.json';
import arrowheadImagery from '@/content/imagery/arrowhead.json';
import blackmoorImagery from '@/content/imagery/blackmoor.json';
import kingsNorthImagery from '@/content/imagery/kings-north.json';
import trueBlueImagery from '@/content/imagery/true-blue.json';
import tripLogistics from '@/content/trip/logistics.json';

export type CourseId = 'blackmoor' | 'true-blue' | 'arrowhead' | 'kings-north';
export type ArrowheadNine = 'cypress' | 'lakes' | 'waterway';

export interface Yardages {
  championship: number | null;
  back: number | null;
  middle: number | null;
  forward: number | null;
}

export interface BaseHole {
  number: number;
  par: number;
  yardages: Yardages;
  name: string | null;
  handicap: number | null;
  description: string;
  local_knowledge: string;
  hazards: string[];
  is_signature: boolean;
}

export interface ArrowheadHole extends BaseHole {
  nine: ArrowheadNine;
}

export type Hole = BaseHole | ArrowheadHole;

export interface Review {
  quote: string;
  source: string;
  author: string;
  date: string | null;
  url: string;
}

export interface Clubhouse {
  name: string;
  atmosphere: string;
  must_try: string[];
  signature_drink: string | null;
  hours: string | null;
  notes: string;
}

export interface History {
  summary: string;
  key_facts: string[];
}

interface BaseOverview {
  how_it_plays: string;
  difficulty: string;
  signature_features: string[];
  best_for: string;
}

interface ArrowheadOverview extends BaseOverview {
  character_per_nine: Record<ArrowheadNine, string>;
}

export type Overview = BaseOverview | ArrowheadOverview;

interface BaseCourse {
  id: CourseId;
  name: string;
  location: string;
  designer: string;
  year_opened: number;
  course_type: string;
  official_website: string;
  phone: string;
  address: string;
  history: History;
  overview: Overview;
  holes: Hole[];
  reviews: Review[];
  clubhouse: Clubhouse;
  rating_slope: Record<string, unknown>;
  course_flyover_urls: string[];
  hero_imagery_urls: string[];
  sources: string[];
  research_notes: string;
}

export interface Course18 extends BaseCourse {
  kind: '18';
  par: number;
  total_yardage_championship: number;
  signature_hole_numbers: number[];
  year_redesigned?: number;
}

export interface ArrowheadSignatureHole {
  nine: ArrowheadNine;
  number: number;
  why: string;
}

export interface Course27 extends BaseCourse {
  kind: '27';
  par_per_nine: Record<ArrowheadNine, number>;
  signature_holes: ArrowheadSignatureHole[];
  recommended_18_pairing: string;
  recommended_pairing_reason: string;
  holes: ArrowheadHole[];
}

export type Course = Course18 | Course27;

export interface CourseImage {
  url: string;
  alt: string;
  caption: string;
  type: 'hole' | 'aerial' | 'landscape' | 'clubhouse' | 'other';
  hole_number: number | null;
  source: string;
  source_page_url: string;
  attribution: string;
  rights_note: string;
  priority: number;
  /** Populated after the imagery pipeline runs. Local path under /public, e.g. /images/blackmoor/01-aerial.webp */
  local_path?: string;
  local_path_1280?: string;
  local_path_640?: string;
}

export interface CourseImagery {
  course_id: CourseId;
  images: CourseImage[];
}

const COURSES: Record<CourseId, Course> = {
  blackmoor: { kind: '18', ...(blackmoorCourse as Omit<Course18, 'kind'>) },
  'true-blue': { kind: '18', ...(trueBlueCourse as Omit<Course18, 'kind'>) },
  'kings-north': { kind: '18', ...(kingsNorthCourse as Omit<Course18, 'kind'>) },
  arrowhead: { kind: '27', ...(arrowheadCourse as Omit<Course27, 'kind'>) },
};

const IMAGERY: Record<CourseId, CourseImagery> = {
  blackmoor: blackmoorImagery as CourseImagery,
  'true-blue': trueBlueImagery as CourseImagery,
  'kings-north': kingsNorthImagery as CourseImagery,
  arrowhead: arrowheadImagery as CourseImagery,
};

const RESOLVED_IMAGERY_MAP: Partial<Record<CourseId, CourseImagery>> = {};

/**
 * If a course has a resolved manifest at content/imagery/<id>.resolved.json
 * (written by scripts/fetch-images.ts), prefer it over the source manifest.
 * The dynamic import is wrapped so missing files don't break the build.
 */
async function tryLoadResolved(id: CourseId): Promise<CourseImagery | null> {
  if (RESOLVED_IMAGERY_MAP[id]) return RESOLVED_IMAGERY_MAP[id]!;
  try {
    const mod = await import(`@/content/imagery/${id}.resolved.json`);
    const data = (mod.default ?? mod) as CourseImagery;
    RESOLVED_IMAGERY_MAP[id] = data;
    return data;
  } catch {
    return null;
  }
}

export const COURSE_IDS: CourseId[] = ['blackmoor', 'true-blue', 'arrowhead', 'kings-north'];

export function getAllCourses(): Course[] {
  return COURSE_IDS.map((id) => COURSES[id]);
}

export function getCourse(id: CourseId): Course {
  return COURSES[id];
}

export function getOrderedCourses(): Course[] {
  const sequence = tripLogistics.suggested_play_order.recommended_sequence as CourseId[];
  return sequence.map((id) => COURSES[id]);
}

/**
 * Hole ID encoding:
 *  - 18-hole courses: "1" through "18"
 *  - Arrowhead: "cypress-1" through "waterway-9"
 */
export function holeId(hole: Hole): string {
  if ('nine' in hole) return `${hole.nine}-${hole.number}`;
  return String(hole.number);
}

export function parseHoleId(course: Course, id: string): Hole | null {
  if (course.kind === '27') {
    const m = id.match(/^(cypress|lakes|waterway)-(\d{1,2})$/);
    if (!m) return null;
    const nine = m[1] as ArrowheadNine;
    const number = Number(m[2]);
    return course.holes.find((h) => h.nine === nine && h.number === number) ?? null;
  }
  const n = Number(id);
  if (!Number.isInteger(n)) return null;
  return course.holes.find((h) => h.number === n) ?? null;
}

export function allHoleIds(course: Course): string[] {
  return course.holes.map(holeId);
}

export function getHole(courseId: CourseId, id: string): Hole | null {
  return parseHoleId(getCourse(courseId), id);
}

export function siblingHoles(course: Course, current: Hole): { prev: Hole | null; next: Hole | null } {
  const list = course.holes;
  const idx = list.findIndex((h) => holeId(h) === holeId(current));
  return {
    prev: idx > 0 ? list[idx - 1]! : null,
    next: idx >= 0 && idx < list.length - 1 ? list[idx + 1]! : null,
  };
}

/** Display label for a hole, e.g. "Hole 4" or "Cypress 4". */
export function holeLabel(hole: Hole): string {
  if ('nine' in hole) {
    return `${hole.nine.charAt(0).toUpperCase()}${hole.nine.slice(1)} ${hole.number}`;
  }
  return `Hole ${hole.number}`;
}

export async function getImagery(courseId: CourseId): Promise<CourseImagery> {
  const resolved = await tryLoadResolved(courseId);
  return resolved ?? IMAGERY[courseId];
}

export function getRawImagery(courseId: CourseId): CourseImagery {
  return IMAGERY[courseId];
}

/** Best hero image for a course: highest-priority aerial, or fallback to first image. */
export async function getHero(courseId: CourseId): Promise<CourseImage | null> {
  const imagery = await getImagery(courseId);
  const byPriority = [...imagery.images].sort((a, b) => a.priority - b.priority);
  const aerial = byPriority.find((img) => img.type === 'aerial');
  return aerial ?? byPriority[0] ?? null;
}

/** Best image for a specific hole. */
export async function getHoleImage(courseId: CourseId, holeNumber: number): Promise<CourseImage | null> {
  const imagery = await getImagery(courseId);
  const candidates = imagery.images
    .filter((img) => img.type === 'hole' && img.hole_number === holeNumber)
    .sort((a, b) => a.priority - b.priority);
  return candidates[0] ?? null;
}

export function getTrip() {
  return tripLogistics as unknown as TripLogistics;
}

export interface TripLogistics {
  trip_window: string;
  drive_times_matrix: Record<string, { miles: number; minutes: number; note: string }>;
  suggested_play_order: { recommended_sequence: CourseId[]; reasoning: string };
  weather_context: {
    typical_late_may: string;
    what_to_pack: string[];
    note: string;
  };
  lodging_recommendations: Array<{
    name: string;
    type: string;
    area: string;
    why: string;
    approx_price_per_night_usd: string;
  }>;
  practice_facilities: Array<{ name: string; type: string; location: string; notes: string }>;
  off_course_dining: Array<{
    name: string;
    area: string;
    cuisine: string;
    must_try: string;
    why: string;
  }>;
  airport_info: {
    primary: string;
    distance_to_each_course_min: Record<CourseId, number>;
    notes: string;
  };
  trip_tips: string[];
  sources: string[];
  research_notes: string;
}
