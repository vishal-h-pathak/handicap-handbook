interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  className?: string;
  as?: 'h2' | 'h3';
}

export function SectionHeading({ eyebrow, title, className = '', as = 'h2' }: SectionHeadingProps) {
  const HeadingTag = as;
  const sizeClass = as === 'h2' ? 'text-h2' : 'text-h3';
  return (
    <div className={className}>
      {eyebrow && <p className="label-eyebrow">{eyebrow}</p>}
      <HeadingTag className={`mt-2 font-display ${sizeClass}`}>{title}</HeadingTag>
    </div>
  );
}
