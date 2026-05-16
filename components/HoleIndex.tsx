import type { ArrowheadNine, Course, Course27 } from '@/lib/content';
import { HoleTile } from './HoleTile';

function HoleGrid18({ course }: { course: Course }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {course.holes.map((hole) => (
        <HoleTile key={hole.number} course={course} hole={hole} emphasized={hole.is_signature} />
      ))}
    </div>
  );
}

const NINE_LABEL: Record<ArrowheadNine, string> = {
  cypress: 'Cypress',
  lakes: 'Lakes',
  waterway: 'Waterway',
};

function NineRow({
  course,
  nine,
  isRecommended,
}: {
  course: Course27;
  nine: ArrowheadNine;
  isRecommended: boolean;
}) {
  const holes = course.holes.filter((h) => h.nine === nine);
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-display text-h3 text-ink">
          {NINE_LABEL[nine]}
          <span className="ml-3 text-sm font-normal text-muted">par {course.par_per_nine[nine]}</span>
        </h3>
        {isRecommended && (
          <span className="chip-brass">Visitor's pairing</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-9">
        {holes.map((hole) => (
          <HoleTile key={`${nine}-${hole.number}`} course={course} hole={hole} emphasized={hole.is_signature} />
        ))}
      </div>
    </div>
  );
}

export function HoleIndex({ course }: { course: Course }) {
  if (course.kind === '18') return <HoleGrid18 course={course} />;
  // Arrowhead — three labeled rows; Cypress + Waterway emphasized as the visitor's pairing
  return (
    <div className="space-y-10">
      <NineRow course={course} nine="cypress" isRecommended />
      <NineRow course={course} nine="waterway" isRecommended />
      <NineRow course={course} nine="lakes" isRecommended={false} />
    </div>
  );
}
