import Image from 'next/image';
import type { Clubhouse, CourseImage } from '@/lib/content';

interface ClubhouseCardProps {
  clubhouse: Clubhouse;
  image: CourseImage | null;
}

export function ClubhouseCard({ clubhouse, image }: ClubhouseCardProps) {
  return (
    <section className="card-edge overflow-hidden">
      {image?.local_path_1280 || image?.local_path ? (
        <div className="relative aspect-[16/9] w-full bg-cream">
          <Image
            src={image.local_path_1280 ?? image.local_path!}
            alt={image.alt}
            fill
            sizes="(max-width: 600px) 100vw, 720px"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="p-6 sm:p-8">
        <p className="label-eyebrow">The clubhouse</p>
        <h3 className="mt-2 font-display text-h3 text-ink">{clubhouse.name}</h3>
        <p className="mt-4 text-base leading-relaxed text-ink/85">{clubhouse.atmosphere}</p>
        {clubhouse.must_try.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Must try
            </p>
            <ul className="mt-2 space-y-1.5">
              {clubhouse.must_try.map((item, i) => (
                <li key={i} className="text-sm leading-snug text-ink/85">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {clubhouse.signature_drink && (
          <p className="mt-6 italic text-ink/70">
            <span className="not-italic font-semibold text-brass">Signature pour:</span>{' '}
            {clubhouse.signature_drink}
          </p>
        )}
        {clubhouse.hours && (
          <p className="mt-6 text-xs text-muted">{clubhouse.hours}</p>
        )}
      </div>
    </section>
  );
}
