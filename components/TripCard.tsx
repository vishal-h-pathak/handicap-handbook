import Link from 'next/link';

export function TripCard() {
  return (
    <Link
      href="/trip/"
      className="card-edge group flex items-center justify-between gap-6 p-6 transition-shadow hover:shadow-lift"
    >
      <div>
        <p className="label-eyebrow">The logistics</p>
        <p className="mt-2 font-display text-h3 leading-snug">
          Where to stay, eat, and the order that makes the trip work.
        </p>
      </div>
      <span className="shrink-0 font-display text-3xl text-forest transition-transform group-hover:translate-x-1">
        →
      </span>
    </Link>
  );
}
