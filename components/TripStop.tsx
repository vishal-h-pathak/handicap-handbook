import Link from 'next/link';
import type { Course } from '@/lib/content';

interface TripStopProps {
  course: Course;
  day: number;
  driveFromPrev?: { miles: number; minutes: number; note: string } | null;
}

export function TripStop({ course, day, driveFromPrev }: TripStopProps) {
  return (
    <div className="relative">
      {driveFromPrev && (
        <div className="mb-6 flex items-center gap-3 pl-4 text-xs text-muted">
          <span className="h-px flex-1 bg-ink/10" />
          <span>
            {driveFromPrev.miles} mi · {driveFromPrev.minutes} min south-to-north
          </span>
          <span className="h-px flex-1 bg-ink/10" />
        </div>
      )}
      <Link
        href={`/courses/${course.id}/`}
        className="group block border-l-2 border-brass pl-5 transition-colors hover:border-forest"
      >
        <p className="label-eyebrow">Day {day}</p>
        <h3 className="mt-1 font-display text-h2 leading-tight text-ink group-hover:text-forest">
          {course.name}
        </h3>
        <p className="mt-1 text-sm text-ink/70">
          {course.designer} · {course.location}
        </p>
      </Link>
    </div>
  );
}
