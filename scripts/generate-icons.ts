/**
 * scripts/generate-icons.ts
 *
 * Generates the PWA icon set and Apple touch icons from a single SVG.
 * Design: cream background, brass flag glyph above a Fraunces "HH" monogram in forest green.
 * Outputs:
 *   public/icons/icon-192.png             (any purpose)
 *   public/icons/icon-512.png             (any purpose)
 *   public/icons/icon-192-maskable.png    (maskable, with safe-zone padding)
 *   public/icons/icon-512-maskable.png    (maskable, with safe-zone padding)
 *   public/icons/apple-touch-icon.png     (180×180)
 *   public/icons/apple-splash.png         (1170×2532 — iPhone Pro Max)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const OUT = join(process.cwd(), 'public', 'icons');

const COLORS = {
  cream: '#F5F1EA',
  forest: '#0E4D3F',
  brass: '#B7872F',
  ink: '#1F1A14',
};

// Plain icon — fills the full canvas, used for `any` purpose
function iconSvg(size: number): string {
  const fontSize = size * 0.34;
  const flagSize = size * 0.34;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${COLORS.cream}"/>
  <!-- Golf flag -->
  <g transform="translate(${size / 2}, ${size * 0.34})">
    <line x1="0" y1="-${flagSize * 0.45}" x2="0" y2="${flagSize * 0.6}" stroke="${COLORS.ink}" stroke-width="${size * 0.013}" stroke-linecap="round"/>
    <path d="M 0 -${flagSize * 0.45} L ${flagSize * 0.55} -${flagSize * 0.3} L 0 -${flagSize * 0.15} Z" fill="${COLORS.brass}"/>
  </g>
  <!-- HH monogram -->
  <text x="${size / 2}" y="${size * 0.78}" text-anchor="middle"
        font-family="'Fraunces', 'Georgia', serif" font-weight="500"
        font-size="${fontSize}" fill="${COLORS.forest}"
        letter-spacing="-0.02em">HH</text>
</svg>`;
}

// Maskable icon — must keep all content inside a circular safe zone of radius 40% of canvas.
// We use a full cream background and shrink the glyph to fit inside the safe area.
function maskableSvg(size: number): string {
  const safeScale = 0.72;
  const inner = size * safeScale;
  const offset = (size - inner) / 2;
  const innerFontSize = inner * 0.34;
  const innerFlag = inner * 0.34;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${COLORS.cream}"/>
  <g transform="translate(${offset}, ${offset})">
    <g transform="translate(${inner / 2}, ${inner * 0.34})">
      <line x1="0" y1="-${innerFlag * 0.45}" x2="0" y2="${innerFlag * 0.6}" stroke="${COLORS.ink}" stroke-width="${inner * 0.013}" stroke-linecap="round"/>
      <path d="M 0 -${innerFlag * 0.45} L ${innerFlag * 0.55} -${innerFlag * 0.3} L 0 -${innerFlag * 0.15} Z" fill="${COLORS.brass}"/>
    </g>
    <text x="${inner / 2}" y="${inner * 0.78}" text-anchor="middle"
          font-family="'Fraunces', 'Georgia', serif" font-weight="500"
          font-size="${innerFontSize}" fill="${COLORS.forest}"
          letter-spacing="-0.02em">HH</text>
  </g>
</svg>`;
}

function splashSvg(width: number, height: number): string {
  const longSide = Math.max(width, height);
  const fontSize = longSide * 0.08;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${COLORS.cream}"/>
  <g transform="translate(${width / 2}, ${height / 2 - longSide * 0.06})">
    <line x1="0" y1="-${longSide * 0.08}" x2="0" y2="${longSide * 0.1}" stroke="${COLORS.ink}" stroke-width="${longSide * 0.004}" stroke-linecap="round"/>
    <path d="M 0 -${longSide * 0.08} L ${longSide * 0.08} -${longSide * 0.055} L 0 -${longSide * 0.03} Z" fill="${COLORS.brass}"/>
  </g>
  <text x="${width / 2}" y="${height / 2 + longSide * 0.04}" text-anchor="middle"
        font-family="'Fraunces', 'Georgia', serif" font-weight="500"
        font-size="${fontSize}" fill="${COLORS.forest}"
        letter-spacing="-0.02em">Handicap Handbook</text>
</svg>`;
}

async function render(svg: string, outPath: string) {
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`✓ ${outPath}`);
}

async function main() {
  if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });
  await render(iconSvg(192), join(OUT, 'icon-192.png'));
  await render(iconSvg(512), join(OUT, 'icon-512.png'));
  await render(maskableSvg(192), join(OUT, 'icon-192-maskable.png'));
  await render(maskableSvg(512), join(OUT, 'icon-512-maskable.png'));
  await render(iconSvg(180), join(OUT, 'apple-touch-icon.png'));
  await render(splashSvg(1170, 2532), join(OUT, 'apple-splash-1170x2532.png'));
  await render(splashSvg(750, 1334), join(OUT, 'apple-splash-750x1334.png'));
  // Save the raw SVGs too for future tweaking
  await writeFile(join(OUT, 'icon.svg'), iconSvg(512));
  await writeFile(join(OUT, 'icon-maskable.svg'), maskableSvg(512));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
