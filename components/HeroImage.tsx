import Image from 'next/image';

interface HeroImageProps {
  src: string;
  alt: string;
  caption?: string | null;
  credit?: string | null;
  aspect?: 'video' | 'portrait' | 'square' | 'tall';
  priority?: boolean;
  className?: string;
}

const ASPECT_CLASS: Record<NonNullable<HeroImageProps['aspect']>, string> = {
  video: 'aspect-video',
  portrait: 'aspect-[4/5]',
  square: 'aspect-square',
  tall: 'aspect-[3/4]',
};

export function HeroImage({
  src,
  alt,
  caption,
  credit,
  aspect = 'video',
  priority = false,
  className = '',
}: HeroImageProps) {
  return (
    <figure className={className}>
      <div className={`relative w-full overflow-hidden ${ASPECT_CLASS[aspect]}`}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          priority={priority}
          className="object-cover"
        />
      </div>
      {(caption || credit) && (
        <figcaption className="mt-2 px-4 text-xs text-muted">
          {caption}
          {credit && <span className="ml-2 italic">— {credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}
