import Image from 'next/image';
import Link from 'next/link';
import type { Course, CourseImage } from '@/lib/content';

interface CourseCardProps {
  course: Course;
  hero: CourseImage | null;
  index: number;
}

export function CourseCard({ course, hero, index }: CourseCardProps) {
  const day = index + 1;
  const subtitle =
    course.kind === '27'
      ? `${course.designer} · ${course.course_type.split('—')[0]?.trim() ?? course.course_type}`
      : `${course.designer} · ${course.location}`;

  return (
    <Link
      href={`/courses/${course.id}/`}
      className="group block w-full overflow-hidden bg-surface shadow-card transition-shadow hover:shadow-lift"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-cream">
        {hero?.local_path_1280 || hero?.local_path ? (
          <Image
            src={hero.local_path_1280 ?? hero.local_path!}
            alt={hero.alt}
            fill
            sizes="(max-width: 600px) 100vw, 600px"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-forest/5 text-muted">
            No image
          </div>
        )}
        {/* Bottom-gradient overlay for the title */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent p-6 pt-24">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cream/80">
            Day {day} · {course.location}
          </p>
          <h2 className="mt-2 font-display text-[2.25rem] font-medium leading-[1.05] text-cream">
            {course.name}
          </h2>
          <p className="mt-2 text-sm text-cream/85">{subtitle}</p>
        </div>
      </div>
    </Link>
  );
}
