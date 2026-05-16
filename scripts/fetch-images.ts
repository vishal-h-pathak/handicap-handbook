/**
 * scripts/fetch-images.ts
 *
 * Reads content/imagery/<id>.json for each course, resolves each entry to a real
 * image URL (direct download for CDN URLs; HTML scraping with Cheerio for
 * source-page URLs), downloads originals into public/images/<id>/, generates
 * 1280px and 640px webp variants with sharp, and writes a resolved manifest at
 * content/imagery/<id>.resolved.json with local paths.
 *
 * Idempotent: existing files are skipped.
 *
 * If any course resolves under the threshold, the script exits non-zero with a
 * loud per-course summary so a human can intervene before downstream work.
 */
import { load as loadHtml } from 'cheerio';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { type Browser, chromium } from 'playwright';
import sharp from 'sharp';

const COURSES = ['blackmoor', 'true-blue', 'arrowhead', 'kings-north'] as const;
type CourseId = (typeof COURSES)[number];

const ROOT = process.cwd();
const PUBLIC_IMG = join(ROOT, 'public', 'images');
const CONTENT_IMG = join(ROOT, 'content', 'imagery');

const MIN_RESOLUTION_PERCENT = 70;
const USER_AGENT =
  'HandicapHandbookBot/0.1 (personal golf-trip companion; vshlpthk1@gmail.com)';
const FETCH_TIMEOUT_MS = 20_000;
const DELAY_BETWEEN_FETCHES_MS = 250;
/** Reject if both dimensions are below this AND it's not a portrait hole-card. */
const MIN_IMAGE_DIMENSION = 400;
/** Portrait scorecard/hole-card exception: tall but narrow images can be real content. */
const PORTRAIT_MIN_HEIGHT = 380;
const PORTRAIT_MIN_WIDTH = 250;
const MIN_IMAGE_BYTES = 15_000;

const LOGO_BLACKLIST = [
  '/logo',
  '-logo',
  '_logo',
  'logo-',
  'logo_',
  'logo.',
  '/icon',
  '-icon',
  '_icon',
  '/menu',
  '/header',
  '-header',
  '/flag.',
  '/favicon',
  'sprite',
  'placeholder',
  '/avatars/',
  'wp-content/themes/',
  '-cropped',
  'cropped-',
];

const CONTENT_KEYWORDS = ['hole', 'aerial', 'course', 'tour', 'gallery', 'green', 'fairway', 'view'];

interface SourceImage {
  url: string;
  alt: string;
  caption: string;
  type: 'hole' | 'aerial' | 'landscape' | 'clubhouse' | 'other';
  hole_number: number | null;
  source: string;
  source_page_url: string;
  attribution: string;
  rights_note: string;
  priority: number;
}

interface ResolvedImage extends SourceImage {
  /** Direct image URL we eventually downloaded from (may equal `url` or be extracted from source page). */
  resolved_url: string | null;
  /** Public path of the original download (e.g. /images/blackmoor/01-hole-14.jpeg). */
  local_path: string | null;
  /** 1280px webp variant. */
  local_path_1280: string | null;
  /** 640px webp variant. */
  local_path_640: string | null;
  resolution_status: 'direct' | 'scraped' | 'failed' | 'skipped-noext';
  resolution_note: string;
}

interface SourceManifest {
  course_id: CourseId;
  images: SourceImage[];
}

interface ResolvedManifest {
  course_id: CourseId;
  generated_at: string;
  images: ResolvedImage[];
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function looksLikeDirectImage(url: string): boolean {
  const lower = url.toLowerCase().split('?')[0]!;
  return IMAGE_EXTENSIONS.some((ext) => lower.includes(ext));
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function inferExtension(url: string, contentType?: string | null): string {
  if (contentType?.includes('webp')) return '.webp';
  if (contentType?.includes('png')) return '.png';
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return '.jpg';
  const stripped = url.split('?')[0]!.toLowerCase();
  for (const ext of IMAGE_EXTENSIONS) {
    if (stripped.endsWith(ext)) return ext === '.jpeg' ? '.jpg' : ext;
    const idx = stripped.indexOf(ext);
    if (idx > 0) return ext === '.jpeg' ? '.jpg' : ext;
  }
  return '.jpg';
}

function hashShort(s: string): string {
  return createHash('sha1').update(s).digest('hex').slice(0, 6);
}

function targetFilename(img: SourceImage, idx: number, contentType?: string | null): string {
  const seq = String(idx + 1).padStart(2, '0');
  const ext = inferExtension(img.url, contentType);
  const slugPart = img.alt ? slugify(img.alt) : hashShort(img.url);
  const holePart = img.hole_number ? `-h${img.hole_number}` : '';
  return `${seq}-${img.type}${holePart}-${slugPart}${ext}`;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept: 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8',
        ...(init?.headers ?? {}),
      },
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

async function downloadBinary(url: string, dest: string): Promise<{ bytes: number; contentType: string | null }> {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return { bytes: buf.length, contentType: res.headers.get('content-type') };
}

/** Strip WordPress `-WIDTHxHEIGHT` size suffixes to get the original. */
function stripWpSizeSuffix(url: string): string {
  return url.replace(/-(\d{2,4})x(\d{2,4})(?=\.[a-z]+(?:\?|$))/i, '');
}

function parseWpDimensions(url: string): { w: number; h: number } | null {
  const m = url.match(/-(\d{2,4})x(\d{2,4})(?=\.[a-z]+(?:\?|$))/i);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}

function isProbablyLogo(url: string): boolean {
  const lower = url.toLowerCase();
  return LOGO_BLACKLIST.some((needle) => lower.includes(needle));
}

/**
 * Given a source HTML page and an entry hint (alt/caption/type/hole_number),
 * pick the most likely image URL.
 */
async function scrapeFromPage(pageUrl: string, hint: SourceImage): Promise<string | null> {
  let html: string;
  try {
    const res = await fetchWithTimeout(pageUrl, {
      headers: { accept: 'text/html,application/xhtml+xml' },
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  const $ = loadHtml(html);
  const candidates: { url: string; score: number; reason: string }[] = [];

  const pushIfImg = (raw: string | undefined, score: number, reason: string) => {
    if (!raw) return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    let abs: string;
    try {
      abs = new URL(trimmed, pageUrl).href;
    } catch {
      return;
    }
    if (!looksLikeDirectImage(abs)) return;

    // Hard-block obvious logos
    if (isProbablyLogo(abs)) score -= 200;

    // Bonus for content-bearing filename keywords
    const lower = abs.toLowerCase();
    for (const kw of CONTENT_KEYWORDS) {
      if (lower.includes(kw)) {
        score += 12;
      }
    }

    // Bonus for WP-encoded dimensions over thumbnail size
    const dims = parseWpDimensions(abs);
    if (dims) {
      if (dims.w >= 1000) score += 25;
      else if (dims.w >= 700) score += 15;
      else if (dims.w < 300) score -= 30;
      if (dims.h < 200) score -= 20;
    }

    // Prefer the size-stripped (original) version of WP URLs
    const stripped = stripWpSizeSuffix(abs);
    if (stripped !== abs) {
      candidates.push({ url: stripped, score: score + 8, reason: `${reason}+full` });
    }
    candidates.push({ url: abs, score, reason });
  };

  // Open Graph
  pushIfImg($('meta[property="og:image:secure_url"]').attr('content'), 100, 'og:image:secure_url');
  pushIfImg($('meta[property="og:image"]').attr('content'), 95, 'og:image');
  pushIfImg($('meta[name="twitter:image"]').attr('content'), 90, 'twitter:image');

  // Hint matchers
  const altLower = (hint.alt || '').toLowerCase();
  const captionLower = (hint.caption || '').toLowerCase();
  const holeMatch = hint.hole_number ? `hole ${hint.hole_number}` : '';
  const holeShort = hint.hole_number ? `no. ${hint.hole_number}` : '';

  const parseLargest = (srcset: string | undefined): string | undefined => {
    if (!srcset) return undefined;
    const biggest = srcset
      .split(',')
      .map((p) => {
        const [u, w] = p.trim().split(/\s+/);
        return { u: u || '', w: Number((w || '').replace('w', '')) || 0 };
      })
      .sort((a, b) => b.w - a.w)[0];
    return biggest && biggest.u ? biggest.u : undefined;
  };

  $('img').each((_, el) => {
    const rawSrc = $(el).attr('src');
    const dataSrc = $(el).attr('data-src') || $(el).attr('data-lazy-src');
    // If the src is a data: URL (lazyload placeholder), prefer data-src
    const isPlaceholder = rawSrc?.startsWith('data:');
    const src = isPlaceholder ? dataSrc : rawSrc || dataSrc;
    const srcset = $(el).attr('srcset');
    const dataSrcset = $(el).attr('data-srcset') || $(el).attr('data-lazy-srcset');
    const alt = ($(el).attr('alt') || '').toLowerCase();
    const width = Number($(el).attr('width') || '0');

    // Pick the largest source from any available srcset
    let candidate = src;
    const biggestFromSrcset = parseLargest(srcset) || parseLargest(dataSrcset);
    if (biggestFromSrcset) candidate = biggestFromSrcset;

    if (!candidate) return;

    let score = 30;
    let reason = 'img';
    if (alt && altLower && alt.includes(altLower.slice(0, 25))) {
      score += 50;
      reason = 'alt-match';
    }
    if (captionLower && alt && alt.includes(captionLower.slice(0, 25))) {
      score += 40;
      reason = 'caption-match';
    }
    if (holeMatch && alt.includes(holeMatch)) {
      score += 60;
      reason = `hole-${hint.hole_number}-alt`;
    }
    if (holeShort && alt.includes(holeShort)) {
      score += 60;
      reason = `hole-${hint.hole_number}-no`;
    }
    if (width >= 800) score += 10;
    if (hint.type === 'aerial' && (alt.includes('aerial') || alt.includes('overhead'))) score += 20;
    if (hint.type === 'clubhouse' && (alt.includes('clubhouse') || alt.includes('grill'))) score += 20;
    pushIfImg(candidate, score, reason);
  });

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  // Only return a candidate that scored positively — never fall back to a logo
  const positive = candidates.filter((c) => c.score > 0);
  return positive[0]?.url ?? null;
}

interface BrowserImgRecord {
  src: string;
  alt: string;
  width: number;
  height: number;
  className: string;
}

let sharedBrowser: Browser | null = null;
async function getBrowser(): Promise<Browser> {
  if (!sharedBrowser) {
    sharedBrowser = await chromium.launch({ headless: true });
  }
  return sharedBrowser;
}

async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}

/**
 * Browser-based fallback for JS-rendered pages (mbn.com SPAs, etc).
 * Only invoked when the static Cheerio scrape returned null.
 */
async function scrapeFromPageWithBrowser(pageUrl: string, hint: SourceImage): Promise<string | null> {
  let context;
  let page;
  try {
    const browser = await getBrowser();
    context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
    });
    page = await context.newPage();
    await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 25_000 }).catch(() => {});
    // Force lazy images to load — scroll the page
    await page
      .evaluate(async () => {
        await new Promise<void>((resolve) => {
          let scrolled = 0;
          const step = 600;
          const interval = setInterval(() => {
            window.scrollBy(0, step);
            scrolled += step;
            if (scrolled >= document.body.scrollHeight) {
              clearInterval(interval);
              resolve();
            }
          }, 120);
        });
      })
      .catch(() => {});
    await page.waitForTimeout(800);

    const records: BrowserImgRecord[] = await page
      .evaluate(() => {
        const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
        return imgs.map((img) => ({
          src: img.currentSrc || img.src || '',
          alt: img.alt || '',
          width: img.naturalWidth || img.width || 0,
          height: img.naturalHeight || img.height || 0,
          className: img.className || '',
        }));
      })
      .catch(() => [] as BrowserImgRecord[]);

    if (records.length === 0) return null;

    // Score against the same hints as the static scraper
    const altLower = (hint.alt || '').toLowerCase();
    const captionLower = (hint.caption || '').toLowerCase();
    const holeMatch = hint.hole_number ? `hole ${hint.hole_number}` : '';
    const holeShort = hint.hole_number ? `no. ${hint.hole_number}` : '';

    const scored = records
      .filter((r) => r.src && !r.src.startsWith('data:'))
      .map((r) => {
        let url = r.src;
        try {
          url = new URL(r.src, pageUrl).href;
        } catch {
          /* skip */
        }
        if (!looksLikeDirectImage(url)) return null;

        let score = 30;
        if (isProbablyLogo(url)) score -= 200;
        const lower = url.toLowerCase();
        for (const kw of CONTENT_KEYWORDS) {
          if (lower.includes(kw)) score += 12;
        }
        const dims = parseWpDimensions(url);
        if (dims) {
          if (dims.w >= 1000) score += 25;
          else if (dims.w >= 700) score += 15;
          else if (dims.w < 300) score -= 30;
        }
        // Real rendered sizes
        if (r.width >= 800) score += 25;
        if (r.height >= 500) score += 15;
        if (r.width < 200 || r.height < 200) score -= 50;

        const alt = r.alt.toLowerCase();
        if (alt && altLower && alt.includes(altLower.slice(0, 25))) score += 50;
        if (captionLower && alt && alt.includes(captionLower.slice(0, 25))) score += 40;
        if (holeMatch && alt.includes(holeMatch)) score += 60;
        if (holeShort && alt.includes(holeShort)) score += 60;
        if (hint.type === 'aerial' && (alt.includes('aerial') || alt.includes('overhead'))) score += 20;
        if (hint.type === 'clubhouse' && (alt.includes('clubhouse') || alt.includes('grill'))) score += 20;

        // Prefer size-stripped version
        const stripped = stripWpSizeSuffix(url);
        return { url: stripped !== url ? stripped : url, score };
      })
      .filter((x): x is { url: string; score: number } => x !== null);

    scored.sort((a, b) => b.score - a.score);
    const positive = scored.filter((s) => s.score > 0);
    return positive[0]?.url ?? null;
  } catch (err) {
    console.log(`    [browser] error: ${(err as Error).message}`);
    return null;
  } finally {
    await page?.close().catch(() => {});
    await context?.close().catch(() => {});
  }
}

async function processCourse(id: CourseId): Promise<{ resolved: number; total: number; manifest: ResolvedManifest }> {
  const manifestPath = join(CONTENT_IMG, `${id}.json`);
  const raw = JSON.parse(await readFile(manifestPath, 'utf8')) as SourceManifest;
  const outDir = join(PUBLIC_IMG, id);

  const resolvedImages: ResolvedImage[] = [];
  let resolvedCount = 0;
  let directHits = 0;
  let scrapedHits = 0;
  let skippedExisting = 0;
  let failures = 0;

  for (let i = 0; i < raw.images.length; i++) {
    const img = raw.images[i]!;
    let resolvedUrl: string | null = null;
    let status: ResolvedImage['resolution_status'] = 'failed';
    let note = '';

    if (looksLikeDirectImage(img.url)) {
      resolvedUrl = img.url;
      status = 'direct';
      directHits++;
    } else {
      console.log(`  [${id}] scraping ${img.source_page_url} for ${img.type}${img.hole_number ? ` hole ${img.hole_number}` : ''}…`);
      resolvedUrl = await scrapeFromPage(img.source_page_url, img);
      if (resolvedUrl) {
        status = 'scraped';
        scrapedHits++;
        note = `extracted from ${img.source_page_url}`;
      } else {
        // Static scrape couldn't find anything — fall back to a real browser
        console.log(`    ↳ static returned null, trying browser…`);
        resolvedUrl = await scrapeFromPageWithBrowser(img.source_page_url, img);
        if (resolvedUrl) {
          status = 'scraped';
          scrapedHits++;
          note = `extracted via browser from ${img.source_page_url}`;
        } else {
          status = 'failed';
          note = `no candidate image on ${img.source_page_url} (static + browser)`;
        }
      }
    }

    let localPath: string | null = null;
    let localPath1280: string | null = null;
    let localPath640: string | null = null;

    if (resolvedUrl) {
      const filename = targetFilename(img, i);
      const filePath = join(outDir, filename);
      const publicPath = `/images/${id}/${filename}`;

      try {
        if (!existsSync(filePath)) {
          const { bytes, contentType } = await downloadBinary(resolvedUrl, filePath);
          // If our guessed extension didn't match the actual content-type, rename
          const correctExt = inferExtension(resolvedUrl, contentType);
          const currentExt = extname(filename).toLowerCase();
          if (correctExt !== (currentExt === '.jpeg' ? '.jpg' : currentExt)) {
            const correctedFilename = filename.replace(/\.[^.]+$/, correctExt);
            const correctedPath = join(outDir, correctedFilename);
            await writeFile(correctedPath, await readFile(filePath));
            localPath = `/images/${id}/${correctedFilename}`;
          } else {
            localPath = publicPath;
          }
          console.log(`  [${id}] ⬇  ${filename} (${(bytes / 1024).toFixed(0)} KB)`);

          // Validate dimensions — reject placeholders/logos
          const downloadedPath = join(ROOT, 'public', localPath!);
          try {
            const meta = await sharp(downloadedPath).metadata();
            const w = meta.width ?? 0;
            const h = meta.height ?? 0;
            const isLandscapeOk = w >= MIN_IMAGE_DIMENSION && h >= MIN_IMAGE_DIMENSION;
            const isPortraitCard =
              w >= PORTRAIT_MIN_WIDTH && h >= PORTRAIT_MIN_HEIGHT && bytes >= 25_000;
            const dimensionOk = isLandscapeOk || isPortraitCard;
            if (bytes < MIN_IMAGE_BYTES || !dimensionOk) {
              await import('node:fs/promises').then((fs) => fs.unlink(downloadedPath).catch(() => {}));
              console.log(
                `  [${id}] ✗  rejected ${filename} as placeholder (${w}x${h}, ${(bytes / 1024).toFixed(0)} KB)`,
              );
              throw new Error(`placeholder image (${w}x${h}, ${(bytes / 1024).toFixed(0)} KB)`);
            }
          } catch (e) {
            if ((e as Error).message.startsWith('placeholder')) throw e;
            // sharp metadata failure on a corrupt file → also reject
            await import('node:fs/promises').then((fs) => fs.unlink(downloadedPath).catch(() => {}));
            throw new Error(`unreadable image: ${(e as Error).message}`);
          }
        } else {
          skippedExisting++;
          localPath = publicPath;
        }

        // Generate webp variants
        const sourceFile = join(ROOT, 'public', localPath);
        const base = sourceFile.replace(/\.[^.]+$/, '');
        const variants = [
          { suffix: '@1280.webp', width: 1280, key: '1280' as const },
          { suffix: '@640.webp', width: 640, key: '640' as const },
        ];
        for (const v of variants) {
          const variantPath = `${base}${v.suffix}`;
          if (!existsSync(variantPath)) {
            try {
              await sharp(sourceFile)
                .resize({ width: v.width, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(variantPath);
            } catch (e) {
              console.log(`  [${id}] ⚠  variant ${v.suffix} for ${filename}: ${(e as Error).message}`);
            }
          }
          const publicVariant = variantPath.replace(join(ROOT, 'public'), '');
          if (v.key === '1280') localPath1280 = publicVariant;
          else localPath640 = publicVariant;
        }

        resolvedCount++;
      } catch (e) {
        failures++;
        status = 'failed';
        note = `download failed: ${(e as Error).message}`;
        localPath = null;
      }
    } else {
      failures++;
    }

    resolvedImages.push({
      ...img,
      resolved_url: resolvedUrl,
      local_path: localPath,
      local_path_1280: localPath1280,
      local_path_640: localPath640,
      resolution_status: status,
      resolution_note: note,
    });

    if (DELAY_BETWEEN_FETCHES_MS > 0 && resolvedUrl) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_FETCHES_MS));
    }
  }

  const manifest: ResolvedManifest = {
    course_id: id,
    generated_at: new Date().toISOString(),
    images: resolvedImages,
  };
  await writeFile(join(CONTENT_IMG, `${id}.resolved.json`), JSON.stringify(manifest, null, 2));

  console.log(
    `[${id}] direct=${directHits} scraped=${scrapedHits} skipped-existing=${skippedExisting} failed=${failures} resolved=${resolvedCount}/${raw.images.length}`,
  );

  return { resolved: resolvedCount, total: raw.images.length, manifest };
}

async function main() {
  console.log('—— Handicap Handbook image pipeline ——');
  const summary: Array<{ id: CourseId; resolved: number; total: number; pct: number }> = [];
  for (const id of COURSES) {
    console.log(`\n→ ${id}`);
    const { resolved, total } = await processCourse(id);
    const pct = total === 0 ? 0 : Math.round((resolved / total) * 100);
    summary.push({ id, resolved, total, pct });
  }

  console.log('\n—— Summary ——');
  console.log('course        resolved/total   pct');
  for (const row of summary) {
    const flag = row.pct < MIN_RESOLUTION_PERCENT ? '  ⚠ BELOW THRESHOLD' : '';
    console.log(`${row.id.padEnd(14)}${`${row.resolved}/${row.total}`.padEnd(17)}${row.pct}%${flag}`);
  }

  const failing = summary.filter((s) => s.pct < MIN_RESOLUTION_PERCENT);
  if (failing.length > 0) {
    console.log(
      `\n${failing.length} course(s) below ${MIN_RESOLUTION_PERCENT}% resolution. Review and decide on fallbacks before proceeding.`,
    );
    process.exitCode = 2;
  } else {
    console.log('\nAll courses cleared threshold. Resolved manifests written.');
  }
}

main()
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  })
  .finally(async () => {
    await closeBrowser();
  });
