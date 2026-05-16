interface PullQuoteProps {
  quote: string;
  author?: string | null;
  source?: string | null;
}

export function PullQuote({ quote, author, source }: PullQuoteProps) {
  return (
    <figure className="my-12 border-l-2 border-brass pl-6">
      <blockquote className="font-display text-2xl italic leading-snug text-ink">
        &ldquo;{quote}&rdquo;
      </blockquote>
      {(author || source) && (
        <figcaption className="mt-4 text-sm text-muted">
          {author && <span className="font-medium text-ink/70">{author}</span>}
          {author && source && <span className="mx-2 text-muted/60">·</span>}
          {source && <span className="italic">{source}</span>}
        </figcaption>
      )}
    </figure>
  );
}
