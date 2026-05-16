import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClubhouseCard } from '@/components/ClubhouseCard';
import { HoleIndex } from '@/components/HoleIndex';
import { PullQuote } from '@/components/PullQuote';
import { SectionHeading } from '@/components/SectionHeading';
import {
  COURSE_IDS,
  type CourseId,
  getCourse,
  getHero,
  getImagery,
  getRawImagery,
} from '@/lib/content';

export const dynamicParams = false;

export function generateStaticParams() {
  return COURSE_IDS.map((courseId) => ({ courseId }));
}

interface PageProps {
  params: { courseId: string };
}

export default async function CoursePage({ params }: PageProps) {
  const id = params.courseId as CourseId;
  if (!COURSE_IDS.includes(id)) notFound();

  const course = getCourse(id);
  const hero = await getHero(id);
  const imagery = await getImagery(id);

  const clubhouseImage = imagery.images
    .filter((img) => img.type === 'clubhouse' && img.local_path)
    .sort((a, b) => a.priority - b.priority)[0] ?? null;

  // Editorial landscape — first non-aerial non-clubhouse priority-1 image, used mid-page
  const landscape =
    imagery.images
      .filter((img) => img.type === 'landscape' && img.local_path)
      .sort((a, b) => a.priority - b.priority)[0] ?? null;

  const yardageLine =
    course.kind === '18'
      ? `Par ${course.par} · ${course.total_yardage_championship.toLocaleString()} yds`
      : `27 holes · Par ${
          course.par_per_nine.cypress + course.par_per_nine.waterway
        } combo (Cypress + Waterway)`;

  // Top-2 reviews by length (proxy for substance) — most editorial of the bunch
  const featuredReviews = [...course.reviews]
    .sort((a, b) => b.quote.length - a.quote.length)
    .slice(0, 2);

  return (
    <main className="min-h-dvh bg-cream pb-24">
      {/* Hero */}
      <section className="relative h-[72dvh] w-full overflow-hidden bg-ink">
        {hero?.local_path_1280 || hero?.local_path ? (
          <Image
            src={hero.local_path_1280 ?? hero.local_path!}
            alt={hero.alt}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/5 to-black/70" />
        <Link
          href="/"
          className="absolute left-5 top-5 z-10 text-xs font-medium uppercase tracking-[0.2em] text-cream/85"
        >
          ← Handbook
        </Link>
        <div className="absolute inset-x-0 bottom-0 p-6 pb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brass">
            {course.location} · {course.designer}
          </p>
          <h1 className="mt-3 font-display text-[3rem] font-medium leading-[0.95] text-cream sm:text-[3.75rem]">
            {course.name}
          </h1>
          <p className="mt-4 text-sm text-cream/80">{yardageLine}</p>
        </div>
      </section>

      {/* History */}
      <section className="mx-auto max-w-prose px-6 py-16">
        <SectionHeading eyebrow="The history" title="Where it came from" />
        <div className="prose-editorial mt-6 text-base leading-relaxed text-ink/85">
          {course.history.summary.split(/\n+/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        <ul className="mt-10 space-y-3 border-t border-ink/10 pt-6">
          {course.history.key_facts.map((fact, i) => (
            <li key={i} className="text-sm leading-snug text-ink/75">
              <span className="mr-2 font-display text-brass">·</span>
              {fact}
            </li>
          ))}
        </ul>
      </section>

      {/* Optional landscape break */}
      {landscape ? (
        <section className="relative aspect-[16/9] w-full overflow-hidden bg-cream sm:aspect-[21/9]">
          <Image
            src={landscape.local_path_1280 ?? landscape.local_path!}
            alt={landscape.alt}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </section>
      ) : null}

      {/* How it plays */}
      <section className="mx-auto max-w-prose px-6 py-16">
        <SectionHeading eyebrow="How it plays" title="The shot you'll need" />
        <p className="mt-6 text-base leading-relaxed text-ink/85">{course.overview.how_it_plays}</p>
        <p className="mt-6 italic text-ink/70">{course.overview.difficulty}</p>
        <div className="mt-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Signature features
          </p>
          <ul className="mt-3 space-y-2">
            {course.overview.signature_features.map((f, i) => (
              <li key={i} className="text-sm leading-relaxed text-ink/85">
                <span className="mr-2 text-brass">◆</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        {'best_for' in course.overview && (
          <p className="mt-10 border-l-2 border-brass pl-4 text-sm italic text-ink/70">
            <span className="font-semibold not-italic text-ink/85">Best for: </span>
            {course.overview.best_for}
          </p>
        )}
      </section>

      {/* Hole index */}
      <section className="mx-auto max-w-wide px-6 py-10">
        <SectionHeading eyebrow="The card" title="Hole by hole" />
        {course.kind === '27' && (
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink/70">
            {course.recommended_pairing_reason}
          </p>
        )}
        <div className="mt-8">
          <HoleIndex course={course} />
        </div>
      </section>

      {/* Reviews */}
      {featuredReviews.length > 0 && (
        <section className="mx-auto max-w-prose px-6 py-16">
          <SectionHeading eyebrow="On the record" title="What players have said" />
          <div className="mt-6">
            {featuredReviews.map((r, i) => (
              <PullQuote key={i} quote={r.quote} author={r.author} source={r.source} />
            ))}
          </div>
        </section>
      )}

      {/* Clubhouse */}
      <section className="mx-auto max-w-wide px-6 py-10">
        <ClubhouseCard clubhouse={course.clubhouse} image={clubhouseImage} />
      </section>

      {/* Sources note */}
      <section className="mx-auto mt-12 max-w-prose px-6">
        <div className="rule-dotted mb-6 w-32" />
        <p className="text-xs leading-relaxed text-muted">
          Editorial drawn from {getRawImagery(id).images.length} primary and secondary sources;{' '}
          {course.sources.length} total references on file. Imagery is course-provided or editorial;
          rights for reuse should be cleared before any future commercial use.
        </p>
      </section>
    </main>
  );
}
