import Link from 'next/link';
import { type Course, type Hole, holeId, holeLabel, siblingHoles } from '@/lib/content';

export function HoleNavigator({ course, current }: { course: Course; current: Hole }) {
  const { prev, next } = siblingHoles(course, current);
  return (
    <nav className="sticky bottom-0 z-20 border-t border-ink/8 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-wide items-stretch">
        {prev ? (
          <Link
            href={`/courses/${course.id}/holes/${holeId(prev)}/`}
            className="flex flex-1 items-center gap-3 px-5 py-4 transition-colors hover:bg-cream"
          >
            <span className="font-display text-xl text-forest">←</span>
            <span>
              <span className="block text-[10px] uppercase tracking-wider text-muted">Previous</span>
              <span className="block text-sm font-medium text-ink">{holeLabel(prev)}</span>
            </span>
          </Link>
        ) : (
          <Link
            href={`/courses/${course.id}/`}
            className="flex flex-1 items-center gap-3 px-5 py-4 transition-colors hover:bg-cream"
          >
            <span className="font-display text-xl text-forest">←</span>
            <span>
              <span className="block text-[10px] uppercase tracking-wider text-muted">Back to</span>
              <span className="block text-sm font-medium text-ink">Course</span>
            </span>
          </Link>
        )}
        <div className="w-px bg-ink/10" />
        {next ? (
          <Link
            href={`/courses/${course.id}/holes/${holeId(next)}/`}
            className="flex flex-1 items-center justify-end gap-3 px-5 py-4 text-right transition-colors hover:bg-cream"
          >
            <span>
              <span className="block text-[10px] uppercase tracking-wider text-muted">Next</span>
              <span className="block text-sm font-medium text-ink">{holeLabel(next)}</span>
            </span>
            <span className="font-display text-xl text-forest">→</span>
          </Link>
        ) : (
          <Link
            href={`/courses/${course.id}/`}
            className="flex flex-1 items-center justify-end gap-3 px-5 py-4 text-right transition-colors hover:bg-cream"
          >
            <span>
              <span className="block text-[10px] uppercase tracking-wider text-muted">End of round</span>
              <span className="block text-sm font-medium text-ink">Back to course</span>
            </span>
            <span className="font-display text-xl text-forest">↩</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
