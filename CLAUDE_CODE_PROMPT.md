# Claude Code prompt — Handicap Handbook

> Copy everything below the `---` into Claude Code as the initial prompt. Run it from inside `/Users/jarvis/dev/jarvis/handicap-handbook/`. The `content/` directory with all research JSON already exists in the repo root.

---

You are building **Handicap Handbook** — a coffee-table-book-style iPhone Progressive Web App for a golfer's trip to four Myrtle Beach courses next weekend. The user (me) will install it to his friend's iPhone by sending a link to a Vercel deployment; his friend will tap "Add to Home Screen" and use it like a native app. The app must work fully offline once installed.

The four courses are: **Blackmoor Golf Club** (Gary Player), **Arrowhead Country Club** (27 holes, Raymond Floyd), **True Blue Golf Club** (Mike Strantz), and **King's North at Myrtle Beach National** (Arnold Palmer).

## Design philosophy

This is **editorial / coastal premium** — cream off-white backgrounds, large serif display typography, full-bleed photography, generous whitespace. Think Condé Nast Traveler, not a fitness app. Every screen should feel like turning a page in a high-end print book. The user is a golf tourist who wants to dig into each course before he plays it.

**Design system (use exactly):**
- Primary background: `#F5F1EA` (warm cream)
- Surface (cards / elevated): `#FFFFFF`
- Ink (body text): `#1F1A14` (near-black, warm)
- Accent (links, key tags): `#0E4D3F` (deep forest green)
- Accent secondary: `#B7872F` (brass)
- Muted: `#8B8275`
- Display font: **Fraunces** (variable, soft Latin serif) — use for course names, hole numbers, section titles. Pull from Google Fonts.
- Body font: **Inter** (system fallback acceptable).
- Type scale: 64/40/28/20/16/14, line-height 1.15 for display, 1.55 for body.
- Spacing scale: 4/8/12/16/24/40/64/96 px.
- Border radius: 0 on hero imagery (full-bleed), 8px on cards, 999px on chips/tags.
- Shadows: minimal. A single 0 2px 24px rgba(0,0,0,0.06) for elevated cards.
- Photography: full-bleed where possible. Never crop with rounded corners on hero images.

## Tech stack (use exactly)

- **Next.js 14 App Router** + **TypeScript** (strict).
- **Static export** (`output: 'export'`) so it deploys cleanly to Vercel as static files and works fully offline once cached.
- **Tailwind CSS** with a custom theme matching the design system above.
- **next-pwa** (or workbox-window if next-pwa is incompatible with App Router static export — verify before committing). Service worker must precache: all HTML routes, all JSON content, all images in `public/images/`, all fonts. Runtime cache strategy: stale-while-revalidate for Mapbox tiles, cache-first for own assets.
- **Mapbox GL JS** for satellite imagery + custom SVG overlay layers. Public Mapbox token comes from `NEXT_PUBLIC_MAPBOX_TOKEN` env var, set in Vercel at deploy time. Lock the token by URL (the user will configure this in Mapbox dashboard before deploy). Document this in the README.
- **Open-Meteo** for live weather on the trip-logistics page (no API key required).
- No analytics, no auth, no backend.

## Repository structure (create this)

```
handicap-handbook/
  app/
    layout.tsx
    page.tsx                              # home / course picker
    courses/
      [courseId]/
        page.tsx                          # course landing (history, overview, reviews, clubhouse)
        holes/
          [holeId]/
            page.tsx                      # hole detail with map + overlay
    trip/
      page.tsx                            # trip logistics
    offline.tsx                           # offline fallback
  components/
    HeroImage.tsx
    SectionHeading.tsx
    PullQuote.tsx
    HoleMap.tsx                           # Mapbox + SVG overlay component
    HoleNavigator.tsx                     # prev/next hole, hole grid picker
    ClubhouseCard.tsx
    TripStop.tsx
    WeatherStrip.tsx
  content/                                # ALREADY EXISTS — DO NOT REGENERATE
    courses/
      arrowhead.json
      blackmoor.json
      kings-north.json
      true-blue.json
    imagery/
      arrowhead.json
      blackmoor.json
      kings-north.json
      true-blue.json
    trip/
      logistics.json
  lib/
    content.ts                            # typed loaders for content/*
    mapbox.ts
    weather.ts
  public/
    images/                               # populated by scripts/fetch-images.ts
    icons/                                # PWA icons
  scripts/
    fetch-images.ts                       # downloads images from imagery manifests to public/images/
    extract-hole-geometry.ts              # for each hole, capture tee + green coords for the Mapbox view
  next.config.js
  tailwind.config.ts
  tsconfig.json
  README.md
```

## Content — already pre-researched, do not regenerate

The `content/` directory is **pre-populated** with structured JSON gathered in advance:

- **`content/courses/<id>.json`** — per-course: history, overview, hole-by-hole data (description, local_knowledge, hazards, yardages where known), reviews (verbatim quotes with attribution), clubhouse details. The Arrowhead file covers all 27 holes; the `recommended_18_pairing` field tells you which two nines to feature for visitors.
- **`content/imagery/<id>.json`** — per-course image manifest. Each entry has `source_page_url`, `type`, `priority`, etc. **Most entries are source-page URLs, not direct image URLs** — this is intentional. Your job: fetch each source page, extract the actual image URL from the HTML, download to `public/images/<courseId>/<filename>`, and write a resolved manifest with local paths. See "Imagery pipeline" below.
- **`content/trip/logistics.json`** — drive times, suggested play order, lodging, dining, trip tips.

Some fields are `null` where research couldn't confirm the data (e.g., middle-tee yardages on some holes, a few clubhouse hours). The app must handle nulls gracefully — show "—" for missing yardages, omit empty sections rather than rendering empty placeholders.

**Do not regenerate or overwrite the content JSON.** If you spot a mistake, surface it to me and I'll decide.

## Information architecture

**1. Home (`/`)** — Editorial intro to the trip. Hero: full-bleed Myrtle Beach coastal photograph (sourced during imagery pipeline). Below: four large course cards in a vertical stack (mobile), each with course name in Fraunces 40pt, designer + location subtitle, hero hole image, and a "View course" link. Bottom: a smaller "Trip logistics" card. The recommended play order from `logistics.json` determines vertical order of the course cards.

**2. Course landing (`/courses/[courseId]`)** — Long-scroll editorial layout:
   - Full-bleed hero (priority-1 aerial from the imagery manifest)
   - Course name (Fraunces, large), designer, year, par, location
   - **History section** — narrative prose from `history.summary`, with `key_facts` rendered as elegant inline annotations
   - **How it plays** — `overview.how_it_plays` as body text, then `signature_features` as a tight bulleted strip
   - **Hole index** — a 4×5 (or 3×6 for Arrowhead's 27) grid of hole tiles. Each tile shows: hole number (Fraunces, large), par, championship yardage. Tap → hole detail. Signature holes get a small brass dot indicator.
   - **Reviews** — 2-3 of the strongest pull quotes from `reviews`, styled as PullQuote components (large serif italic with a brass left rule). Attribution below in muted color.
   - **The clubhouse** — image, atmosphere paragraph, must-try dishes as a small list, signature drink callout.

**3. Hole detail (`/courses/[courseId]/holes/[holeId]`)** — The centerpiece of the app:
   - Top: hole number (huge Fraunces, e.g., 192pt), par + yardage strip below, hole name if available
   - **HoleMap component** (full viewport-width, ~60vh tall):
     - Mapbox GL JS centered on the hole using its tee + green coordinates (you'll capture these — see "Hole geometry" below)
     - Base style: `mapbox://styles/mapbox/satellite-v9`
     - Zoom locked to show the full hole from tee to green
     - SVG overlay drawn on top with:
       - Dotted line from tee to green showing the centerline
       - Hazard outlines (yardage arcs at 250/200/150/100/50 from green)
       - Tap targets that reveal `local_knowledge` text in a sliding bottom sheet
       - Tee, green, and hazard markers styled in brass + cream (not Mapbox defaults)
     - Toggle in the corner: "Satellite" ↔ "Course view" (course view shows the published flyover/diagram from imagery manifest if available, else "—")
   - Below the map: `description` as body text, then `local_knowledge` styled as a callout box (cream surface, brass left rule, "Local knowledge" caption in small caps)
   - `hazards` list at the bottom as a small tag strip
   - Prev/Next hole arrows fixed at bottom edge (HoleNavigator)
   - For **Arrowhead specifically**: the hole detail URL pattern is `/courses/arrowhead/holes/<nine>-<number>` (e.g., `/courses/arrowhead/holes/cypress-3`), and the hole index on the course landing shows three labeled rows for Cypress / Lakes / Waterway with visual emphasis on the recommended visitor pairing.

**4. Trip logistics (`/trip`)** — Single-page editorial spread:
   - Hero: a coastal landscape
   - **Suggested play order** — the four courses as a numbered vertical sequence with drive-time chips between them (from `drive_times_matrix`)
   - **Weather** — pull live forecast from Open-Meteo for Myrtle Beach (coords ~33.69N, -78.89W) for the next 7 days, display as a 7-day strip with high/low + icon. Use seasonal context from `weather_context.typical_late_may` as a small italic caption below.
   - **Lodging** — three cards from `lodging_recommendations`, each with name, area, why
   - **Eat off-course** — `off_course_dining` as a list with editorial treatment
   - **Practice ranges** — small list
   - **Tips** — `trip_tips` as a numbered list in elegant style

## Imagery pipeline (this is real work)

Create `scripts/fetch-images.ts`. It must:

1. Read each `content/imagery/<id>.json` manifest.
2. For each entry where `url` is not already a direct image (i.e., doesn't end in `.jpg`/`.jpeg`/`.png`/`.webp`):
   a. Fetch the `source_page_url`.
   b. Parse the HTML and locate the image being described (use the `alt`, `caption`, and `type` fields as hints; also inspect `<meta property="og:image">`, hero `<img>` tags, and CSS `background-image` declarations).
   c. Resolve the actual image URL.
   d. Download it to `public/images/<courseId>/<sequence>-<type>-<slug>.<ext>`.
3. Generate a **resolved manifest** at `content/imagery/<id>.resolved.json` with local paths.
4. Generate a 1280px-wide and a 640px-wide variant for each image (use `sharp`). Naming: `<original>@1280.webp`, `<original>@640.webp`.
5. Log per-image success/failure clearly.

The script must be **idempotent** — if an image already exists locally, skip the download.

If a particular source page resists extraction (e.g., JS-gated gallery), log the failure and continue; do not fail the whole script. We can manually fill stubborn cases later.

When the script finishes, surface a summary table to me: rows = courses, columns = #-attempted, #-resolved, #-failed. List the failed ones so I can intervene.

## Hole geometry

You need approximate tee + green coordinates for each of the 72 (well, 18+18+27+18 = 81) holes to center the Mapbox view. Create `scripts/extract-hole-geometry.ts`:

1. For each hole, derive coordinates from the course's published satellite-tagged hole pages or GolfPass course profile. As a fallback, use approximate course-center lat/lon (which the research agents captured) and compute a bounding box.
2. Save to `content/geometry/<id>.json` as `{ holes: [{ number, nine?, tee: [lat,lon], green: [lat,lon], bbox: [[lat,lon],[lat,lon]] }] }`.
3. If you can't pin a hole precisely, flag it in `research_notes` of that file and use the course-center fallback. The map will still render usefully even if not perfectly centered.

This is fine to do iteratively — perfect coordinates per hole is a polish task, not a blocker for V1.

## PWA / offline behavior

- Generate `manifest.webmanifest` with: short name "Handbook", name "Handicap Handbook", display "standalone", orientation "portrait", theme color `#0E4D3F`, background color `#F5F1EA`.
- Generate iOS-compatible icons (180×180, 192×192, 512×512 — both maskable and any). Design: cream background, a single brass golf-flag glyph centered, Fraunces "HH" monogram beneath. Generate the SVG, then export PNG variants. Place in `public/icons/`.
- Splash screens for common iPhone resolutions.
- Service worker precaches all routes + JSON + images. On first visit, the app should aggressively warm the cache for everything — the friend will install at home with WiFi before the trip.
- Add an "Offline-ready" indicator on the home page (small chip, only shows after first service worker cache complete).
- Mapbox tiles will fail offline; for offline use, **also generate a static fallback image of each hole's map** at build time (use Mapbox Static Images API once during build, save to `public/images/<courseId>/holes/<n>-map.png`). The HoleMap component falls back to this static image if Mapbox GL fails to load. This way the app remains fully usable on the course even with bad signal.

## Deployment

- `vercel.json` — minimal, just confirming static export.
- README must include:
  - How to set up a Mapbox account (free tier link), generate a public token, lock it to the Vercel domain
  - How to set `NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel project settings
  - One-line deploy command
  - How to share the install link with the friend
  - A short "Rights & credits" section noting that imagery is course-provided or editorial and should be cleared for any future commercial use (e.g., the hardback book extension).

## What to build first (suggested ordering)

1. Repo scaffold + design tokens + Tailwind config + fonts.
2. Typed content loaders (`lib/content.ts`). Run them on a hello-world page to confirm all JSON parses.
3. `fetch-images.ts` script — run it, populate `public/images/`. Surface the resolution summary.
4. Home page with course cards.
5. Course landing page (one course end-to-end, then the others).
6. Hole detail page with Mapbox + overlays (one hole first, then iterate).
7. Hole geometry script + per-hole map centering.
8. Trip logistics page + live weather.
9. PWA setup (manifest, icons, service worker, offline fallback, static map fallbacks).
10. Final pass: Lighthouse PWA audit (target ≥ 90 on every metric), test "Add to Home Screen" on a real iPhone if possible, verify it works in airplane mode after install.

## Definition of done for V1

- All four courses have full landing pages with real photography.
- All 18 + 27 + 18 + 18 = 81 holes have detail pages with at least a working map view, description, and local-knowledge tip.
- Trip page renders with live weather.
- Installs to home screen on iPhone Safari. Loads and navigates offline after first visit.
- Lighthouse PWA score ≥ 90.
- No console errors in production build.

## Things to flag to me (don't decide silently)

- If a piece of content is missing AND would degrade the page meaningfully (e.g., we have no clubhouse photo at all for one course), surface it and propose: skip the section, or fetch a fallback.
- If a Mapbox style decision feels off (the satellite imagery is washed out, an overlay is illegible), suggest the change and show before/after.
- If the imagery pipeline can't resolve more than ~30% of any one course's images, stop and ask before doing manual fallbacks — I may want to do another research pass first.

## Tone reminders

This is a personal gift. Make it feel handmade and considered, not generic. Every editorial decision should ask: "Would this look out of place on a hardback coffee-table book?" If yes, fix it.

Begin by reading the existing `content/` directory and surveying what's in it. Confirm the structure matches what's described above, then propose your build sequence and start. Surface progress in clear chunks rather than one giant silent run.
