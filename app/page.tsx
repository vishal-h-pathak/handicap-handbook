import Image from 'next/image';
import { CacheWarmer } from '@/components/CacheWarmer';
import { CourseCard } from '@/components/CourseCard';
import { TripCard } from '@/components/TripCard';
import { getHero, getOrderedCourses } from '@/lib/content';
import { buildWarmupList } from '@/lib/warm-targets';

export default async function HomePage() {
  const courses = getOrderedCourses();
  const heroes = await Promise.all(courses.map((c) => getHero(c.id)));
  const warm = buildWarmupList();

  // The first course in the sequence (Blackmoor) has the best landscape — use it as the home hero.
  const homeHero = heroes[0];

  return (
    <main className="min-h-dvh bg-cream pb-24">
      <section className="relative h-[78dvh] w-full overflow-hidden bg-ink">
        {homeHero?.local_path_1280 || homeHero?.local_path ? (
          <Image
            src={homeHero.local_path_1280 ?? homeHero.local_path!}
            alt={homeHero.alt}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70" />
        <div className="absolute inset-x-0 bottom-0 p-6 pb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brass">
            A four-course gift · May 22 – 25, 2026
          </p>
          <h1 className="mt-3 font-display text-[3.25rem] font-medium leading-[0.95] text-cream sm:text-[4rem]">
            Handicap
            <br />
            Handbook
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-cream/85">
            Four Myrtle Beach courses, one weekend. A book to carry on the cart — designed for the
            walk from the parking lot to the first tee.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-wide px-6 py-16">
        <p className="label-eyebrow">The trip</p>
        <h2 className="mt-3 max-w-prose font-display text-h2 leading-tight text-ink">
          Played south-to-north, the four rounds tell their own story —{' '}
          <em className="italic text-forest">a Gary Player tightrope, two coastal Strantz fever
          dreams,</em>{' '}
          and Palmer&rsquo;s thunderclap on the way home.
        </h2>
      </section>

      <section className="mx-auto max-w-wide space-y-12 px-6">
        {courses.map((course, idx) => (
          <CourseCard key={course.id} course={course} hero={heroes[idx] ?? null} index={idx} />
        ))}
      </section>

      <section className="mx-auto mt-16 max-w-wide px-6">
        <TripCard />
      </section>

      <footer className="mx-auto mt-24 max-w-wide px-6 text-center">
        <div className="rule-dotted mx-auto mb-6 w-32" />
        <p className="font-display text-sm italic text-muted">
          Handmade for your trip. Carry it on the cart.
        </p>
      </footer>

      <CacheWarmer routes={warm.routes} images={warm.images} />
    </main>
  );
}
