import Link from 'next/link';
import { type Course, type Hole, holeId, holeLabel } from '@/lib/content';

interface HoleTileProps {
  course: Course;
  hole: Hole;
  emphasized?: boolean;
}

export function HoleTile({ course, hole, emphasized = false }: HoleTileProps) {
  const yardage = hole.yardages.championship;
  const id = holeId(hole);
  const subtitle = course.kind === '27' ? holeLabel(hole) : `Hole ${hole.number}`;

  return (
    <Link
      href={`/courses/${course.id}/holes/${id}/`}
      className={`group relative flex aspect-square flex-col justify-between border border-ink/8 bg-surface p-3 transition-all hover:border-forest/40 ${
        emphasized ? 'ring-1 ring-brass/50' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="font-display text-3xl leading-none text-ink">{hole.number}</span>
        {hole.is_signature && (
          <span className="h-1.5 w-1.5 rounded-full bg-brass" title="Signature hole" />
        )}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted">Par {hole.par}</p>
        <p className="text-xs font-medium text-ink/80">
          {yardage ? `${yardage} yds` : '—'}
        </p>
        {course.kind === '27' && (
          <p className="mt-0.5 text-[9px] uppercase tracking-wider text-muted/70">{subtitle}</p>
        )}
      </div>
    </Link>
  );
}
