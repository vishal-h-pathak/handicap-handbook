import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HoleMap } from '@/components/HoleMap';
import { HoleNavigator } from '@/components/HoleNavigator';
import {
  COURSE_IDS,
  type CourseId,
  type Hole,
  allHoleIds,
  getCourse,
  getHoleImage,
  parseHoleId,
} from '@/lib/content';
import { getCourseGeometry, getHoleGeometry } from '@/lib/geometry';

export const dynamicParams = false;

export function generateStaticParams() {
  return COURSE_IDS.flatMap((courseId) => {
    const course = getCourse(courseId);
    return allHoleIds(course).map((holeId) => ({ courseId, holeId }));
  });
}

interface PageProps {
  params: { courseId: string; holeId: string };
}

export default async function HolePage({ params }: PageProps) {
  const id = params.courseId as CourseId;
  if (!COURSE_IDS.includes(id)) notFound();
  const course = getCourse(id);
  const hole: Hole | null = parseHoleId(course, params.holeId);
  if (!hole) notFound();

  const isArrowhead = 'nine' in hole;
  const nine = isArrowhead ? hole.nine : undefined;

  const geometry = getHoleGeometry(id, hole.number, nine) ?? null;
  const courseGeom = getCourseGeometry(id);
  const fallbackGeom = courseGeom.holes[0]!;
  const effectiveGeom = geometry ?? fallbackGeom;

  const heroImage = await getHoleImage(id, hole.number);

  const yardageLine = [
    hole.yardages.championship ? `${hole.yardages.championship} championship` : null,
    hole.yardages.back ? `${hole.yardages.back} back` : null,
    hole.yardages.middle ? `${hole.yardages.middle} middle` : null,
    hole.yardages.forward ? `${hole.yardages.forward} forward` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const handicapLabel = hole.handicap ? `Handicap ${hole.handicap}` : null;

  return (
    <main className="min-h-dvh bg-cream pb-4">
      {/* Massive hole number header */}
      <section className="relative px-6 pt-8 sm:pt-14">
        <Link
          href={`/courses/${id}/`}
          className="absolute left-5 top-5 text-xs font-medium uppercase tracking-[0.2em] text-ink/60"
        >
          ← {course.name}
        </Link>
        <div className="mx-auto max-w-wide pt-10">
          {isArrowhead && (
            <p className="label-eyebrow">
              {hole.nine.charAt(0).toUpperCase() + hole.nine.slice(1)} nine
            </p>
          )}
          <div className="mt-2 flex items-baseline gap-6">
            <h1 className="font-display text-[7rem] font-medium leading-none tracking-tight text-ink sm:text-[9rem]">
              {hole.number}
            </h1>
            <div className="flex flex-col gap-1 pb-2">
              <p className="text-sm font-semibold uppercase tracking-wider text-brass">
                Par {hole.par}
              </p>
              {hole.name && (
                <p className="font-display text-h3 italic text-ink/70">"{hole.name}"</p>
              )}
              {handicapLabel && <p className="text-xs text-muted">{handicapLabel}</p>}
            </div>
          </div>
          {yardageLine && (
            <p className="mt-4 text-sm text-ink/70">{yardageLine}</p>
          )}
        </div>
      </section>

      {/* Map */}
      <section className="mt-10 w-full">
        <div className="relative h-[60dvh] w-full overflow-hidden bg-ink">
          <HoleMap geometry={effectiveGeom} courseName={course.name} className="h-full w-full" />
        </div>
      </section>

      {/* Description + local knowledge */}
      <section className="mx-auto mt-10 max-w-prose px-6">
        <p className="text-base leading-relaxed text-ink/85">{hole.description}</p>

        <div className="card-edge mt-8 border-l-2 border-brass p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">
            Local knowledge
          </p>
          <p className="mt-2 text-base italic leading-relaxed text-ink/85">{hole.local_knowledge}</p>
        </div>

        {hole.hazards.length > 0 && (
          <div className="mt-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              On the card
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {hole.hazards.map((h, i) => (
                <span key={i} className="chip">
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}

        {heroImage?.local_path_1280 || heroImage?.local_path ? (
          <figure className="mt-12">
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream">
              <Image
                src={heroImage.local_path_1280 ?? heroImage.local_path!}
                alt={heroImage.alt}
                fill
                sizes="(max-width: 600px) 100vw, 720px"
                className="object-cover"
              />
            </div>
            {heroImage.caption && (
              <figcaption className="mt-2 text-xs italic text-muted">
                {heroImage.caption}
              </figcaption>
            )}
          </figure>
        ) : null}
      </section>

      <HoleNavigator course={course} current={hole} />
    </main>
  );
}
