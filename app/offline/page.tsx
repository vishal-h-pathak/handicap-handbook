export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-wide flex-col items-center justify-center px-6 text-center">
      <p className="label-eyebrow">offline</p>
      <h1 className="mt-4 font-display text-h1">No signal on this hole.</h1>
      <p className="mt-6 max-w-prose text-body text-ink/70">
        The handbook is loaded on your phone — the rest of the book is right where you left it. Walk
        a few yards and try again, or tap back to a course you’ve already opened.
      </p>
    </main>
  );
}
