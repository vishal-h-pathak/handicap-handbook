import Link from 'next/link';
import { SectionHeading } from '@/components/SectionHeading';
import { TripStop } from '@/components/TripStop';
import { WeatherStrip } from '@/components/WeatherStrip';
import { getOrderedCourses, getTrip } from '@/lib/content';

function driveKey(fromId: string, toId: string): string {
  const from = fromId.replace('-', '_');
  const to = toId.replace('-', '_');
  return `${from}_to_${to}`;
}

export default function TripPage() {
  const trip = getTrip();
  const courses = getOrderedCourses();

  return (
    <main className="min-h-dvh bg-cream pb-24">
      <section className="mx-auto max-w-wide px-6 pt-12 sm:pt-20">
        <Link
          href="/"
          className="text-xs font-medium uppercase tracking-[0.2em] text-ink/60"
        >
          ← Handbook
        </Link>
        <p className="label-eyebrow mt-10">Logistics</p>
        <h1 className="mt-3 font-display text-[2.5rem] font-medium leading-[1.05] text-ink sm:text-[3.25rem]">
          The trip, in order.
        </h1>
        <p className="mt-6 max-w-prose text-base leading-relaxed text-ink/80">
          {trip.suggested_play_order.reasoning}
        </p>
      </section>

      {/* Play order */}
      <section className="mx-auto mt-16 max-w-wide px-6">
        <SectionHeading eyebrow="The route" title="South to north" />
        <div className="mt-10 space-y-8">
          {courses.map((course, idx) => {
            const prev = idx > 0 ? courses[idx - 1] : null;
            const matrix = trip.drive_times_matrix;
            const drive = prev
              ? (matrix[driveKey(prev.id, course.id)] || matrix[driveKey(course.id, prev.id)]) ?? null
              : null;
            return (
              <TripStop key={course.id} course={course} day={idx + 1} driveFromPrev={drive} />
            );
          })}
        </div>
      </section>

      {/* Weather */}
      <section className="mx-auto mt-20 max-w-wide px-6">
        <SectionHeading eyebrow="Sky" title="The week ahead" />
        <p className="mt-3 text-sm text-ink/70">
          Live forecast for Myrtle Beach, refreshed when you have signal.
        </p>
        <div className="mt-6">
          <WeatherStrip context={trip.weather_context.typical_late_may} />
        </div>
      </section>

      {/* Lodging */}
      <section className="mx-auto mt-20 max-w-wide px-6">
        <SectionHeading eyebrow="Where to sleep" title="Lodging" />
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {trip.lodging_recommendations.slice(0, 4).map((l) => (
            <article key={l.name} className="card-edge p-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brass">
                {l.area}
              </p>
              <h3 className="mt-2 font-display text-h3 text-ink">{l.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/80">{l.why}</p>
              <p className="mt-4 text-xs text-muted">{l.approx_price_per_night_usd}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Dining */}
      <section className="mx-auto mt-20 max-w-wide px-6">
        <SectionHeading eyebrow="Eat" title="Off-course dining" />
        <ul className="mt-8 space-y-8">
          {trip.off_course_dining.map((d) => (
            <li key={d.name} className="border-t border-ink/10 pt-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-h3 text-ink">{d.name}</h3>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted">
                  {d.area}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink/80">{d.why}</p>
              <p className="mt-3 text-sm italic text-brass">Order: {d.must_try}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Practice */}
      <section className="mx-auto mt-20 max-w-wide px-6">
        <SectionHeading eyebrow="Tune up" title="Practice ranges" />
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {trip.practice_facilities.map((p) => (
            <article key={p.name} className="card-edge p-5">
              <h3 className="font-display text-h3 text-ink">{p.name}</h3>
              <p className="mt-1 text-xs text-muted">{p.location}</p>
              <p className="mt-3 text-sm leading-relaxed text-ink/80">{p.notes}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Tips */}
      <section className="mx-auto mt-20 max-w-prose px-6">
        <SectionHeading eyebrow="House rules" title="Tips that will save you" />
        <ol className="mt-8 space-y-5 text-base leading-relaxed text-ink/85">
          {trip.trip_tips.map((tip, i) => (
            <li key={i} className="grid grid-cols-[2rem_1fr] gap-4">
              <span className="font-display text-xl leading-snug text-brass">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{tip}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mx-auto mt-24 max-w-wide px-6 text-center">
        <div className="rule-dotted mx-auto mb-6 w-32" />
        <p className="font-display text-sm italic text-muted">{trip.trip_window}</p>
      </footer>
    </main>
  );
}
