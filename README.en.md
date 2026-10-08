# MangaPaper 🖋
![MangaPaper](public/og.png)

![Astro](https://img.shields.io/badge/Astro-7.x-FF5D01?style=for-the-badge&logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-2F3741?style=for-the-badge)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white&style=for-the-badge)](https://conventionalcommits.org)

[简体中文](README.md) · **English**

MangaPaper is a **comic-paper** themed open-source blog template: dotted notebook paper, ink-black hard borders,
offset hard shadows, slapped-on sticker labels — with a full monospace type system (Maple Mono NF CN) and
light/dark themes. Fully static: no backend, no client framework.

## 🔥 Features

- [x] Paper × comic design language, monospace everywhere (full fonts in the repo, subsets cut at build time: ≈1 MB / 3 font requests per article)
- [x] **Private posts**: AES-256-GCM encrypted at build time; only ciphertext ships; `/private` gated index
- [x] Table of contents (sticky right rail, scroll highlighting with vermilion indicator)
- [x] Copy-to-clipboard on code blocks, image lightbox ([PhotoSwipe](https://photoswipe.com/), loaded on first click)
- [x] Build-time image sizing (local files and remote image headers) — no layout shift
- [x] Homepage Featured paper-stack carousel
- [x] static search ([Pagefind](https://pagefind.app/), CJK-friendly)
- [x] Archive timeline / tag cloud / category pages
- [x] draft posts & pagination (8 per page)
- [x] sitemap & rss feed (private and draft posts excluded)
- [x] Social cards: a 1200×630 OG image per public post, rendered at build time ([Satori](https://github.com/vercel/satori) + resvg-js; never generated for private/draft posts)
- [x] Comments ([remark42](https://remark42.com/), optional — not rendered unless configured)
- [x] Automatic dates: a git hook injects `date` and refreshes `updated`
- [x] One-click deploy (Vercel / Cloudflare Pages)

## 🚀 Project Structure

```bash
/
├── assets/
│   └── fonts/                  # full fonts: upstream TTFs + LICENSE (OFL-1.1; subset from here at build time)
├── public/
│   ├── fonts/                  # font subset artifacts (npm run fonts; not committed)
│   ├── og.png                  # README hero (snapshot of the default card; cards are generated at build time)
│   └── favicon.svg             # vermilion seal
├── scripts/
│   ├── build-deploy-config.ts  # emits dist/_headers + dist/_redirects
│   ├── build-fonts.ts          # builds the self-hosted font subset (npm run fonts)
│   ├── frontmatter-dates.ts    # git hook: inject date / refresh updated
│   └── preflight.ts            # required checks before a build (currently SITE_URL)
├── src/
│   ├── components/             # PostCard / FeaturedStack / TableOfContents / Comments …
│   ├── content/blog/           # posts: first-level directory name = category
│   ├── layouts/Base.astro      # dotted paper background, theme toggle, header & footer
│   ├── pages/                  # index / posts / archive / tags / category / search / private / about / rss
│   ├── plugins/                # rehype image sizing, content scanning
│   ├── scripts/                # lightbox, TOC, private unlock & key cache (client-side)
│   ├── styles/                 # global / fonts / card / prose / private / lightbox
│   ├── utils/                  # content pipeline, crypto, formatting, reading time, header policy
│   ├── config.ts               # site name / author / about-page copy & contacts / remark42 (single source of truth)
│   └── content.config.ts       # content schema (zod)
├── vercel.ts                   # Vercel project config (runs at Vercel build time, reads env; nothing generated in git)
└── astro.config.mjs
```

All posts live in `src/content/blog/`; the **first-level directory name becomes the category**
(`blog/tech/hello.md` → category “tech”), and the filename becomes the URL slug.

## 💻 Tech Stack

- **Framework** — [Astro](https://astro.build/) (`output: 'static'`, no SSR adapter)
- **Source language** — TypeScript (Node native type stripping — no build step before running)
- **Fonts** — [Maple Mono NF CN](https://github.com/subframe7536/maple-font) (OFL-1.1, self-hosted subset)
- **Static search** — [Pagefind](https://pagefind.app/)
- **Social cards** — [Satori](https://github.com/vercel/satori) + [resvg-js](https://github.com/thx/resvg-js) (build-time only, nothing ships)
- **Comments** — [remark42](https://remark42.com/) (self-hosted, optional)
- **Encryption** — WebCrypto (PBKDF2 600k + AES-256-GCM)
- **Git hooks** — [husky](https://typicode.github.io/husky/)
- **Deployment** — [Cloudflare Pages](https://pages.cloudflare.com/) or [Vercel](https://vercel.com/) (choose one)

## 👨🏻‍💻 Running Locally

Requires **Node ≥ 22** (see `.nvmrc`).

```bash
# Option 1: clone directly (for theme development)
git clone https://github.com/lavieio/manga-paper-template.git my-blog
cd my-blog && npm install

# Option 2: use this repo as a template (for blogging; pick Private)
# https://github.com/lavieio/manga-paper-template/generate

cp .env.example .env          # SITE_URL is required — http://localhost:4321 works for local previews
npm run dev                   # http://localhost:4321
```

> Search has no index in dev mode (Pagefind runs after the build); the search page says so explicitly. That is expected.

## 🧞 Commands

All commands are run from the project root:

| Command | Action |
| :--------------- | :------------------------------------------------------------------- |
| `npm install` | Install dependencies (also installs the git hooks via husky) |
| `npm run dev` | Start the local dev server at `localhost:4321` |
| `npm run build` | Build the static site + generate the Pagefind index into `dist/` (fails when SITE_URL is missing or still the example domain) |
| `npm run preview` | Preview the build locally (search works here) |
| `npm run astro ...` | Astro CLI (e.g. `astro add`) |

## 📖 Writing Posts

```yaml
---
title: Title
description: Summary (used for SEO, RSS and cards)
tags: [tag, more-tags]
featured: true          # optional: add to the homepage featured carousel
draft: true             # optional: excluded from builds, no date injected
private: true           # optional: private post (see below)
cover: /cover.png       # optional
---
```

You never write `date` / `updated` — the git hook handles them on commit:

| Commit message | Behaviour |
| :--- | :--- |
| `feat(blog): publish "Title"` | New post gets `date`; edits refresh `updated` |
| `fix(blog): "Title" fix typos` | Silent: `updated` untouched (`chore` likewise) |
| any type with `[skip-updated]` | Force-skip the `updated` refresh |

Working tree, index and commit always stay in sync; partial staging (`git add -p`) is rejected;
the timezone is pinned to `Asia/Shanghai`.

## 🔒 Private Posts

1. Set `PRIVATE_PASSWORD` in `.env` (**change it to a strong password before going live**; it falls back to
   `manga-paper` with a build-time warning)
2. Add `private: true` to the post frontmatter
3. Readers open `/private` (linked from the footer), enter the password once, and see the full list plus content

- Encryption: PBKDF2 (SHA-256, 600,000 iterations) + AES-256-GCM; the key is derived **in the browser**, the password is never uploaded
- Private posts are excluded from lists / archive / tags / categories / RSS / sitemap / search index; pages are `noindex`
- The unlock is cached in localStorage for `PUBLIC_UNLOCK_TTL_HOURS` (default 1 hour)
- ⚠️ Prerequisite: the repository holding real posts **must be private**; a lost password cannot be recovered

## 🎨 Design Language

- **Dotted paper**: 1.2px ink dots on a 22px grid (repeating `radial-gradient`)
- **Hard edges**: 3px ink borders with `4px 4px 0` hard shadows (zero blur)
- **Sticker labels**: small type, ±1.5° rotation, per-category colours (tech=cyan / essays=pink / photo=yellow / else=blue)
- **Type**: Maple Mono NF CN everywhere; dark mode only swaps CSS variable values, never structure

## 🌐 Deployment

Both platforms consume the same `dist/` — **deploy to one only**.

Security headers follow `.env` on both platforms, through different entry points:

- **Cloudflare Pages / Netlify** read `dist/_headers` from the publish directory, emitted at build time by `scripts/build-deploy-config.ts`;
- **Vercel** ignores `_headers` and reads the repo-root **`vercel.ts`**, which runs at Vercel build time and reads env variables itself.

Both are only materialised once the build has the env, so **nothing generated is stored in git**:
configuring remark42 (`PUBLIC_REMARK42_HOST`) allowlists its host automatically, with no config file to edit by hand.

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flavieio%2Fmanga-paper-template&project-name=manga-paper&repository-name=manga-paper&env=PRIVATE_PASSWORD,SITE_URL,PUBLIC_UNLOCK_TTL_HOURS&envDescription=PRIVATE_PASSWORD%20encrypts%20private%20posts%20%E2%80%94%20use%20a%20strong%20password%20before%20going%20live.%20SITE_URL%20is%20your%20real%20domain.%20PUBLIC_UNLOCK_TTL_HOURS%20is%20the%20unlock%20memory%20in%20hours%2C%20default%201.&envDefaults=%7B%22PUBLIC_UNLOCK_TTL_HOURS%22%3A%221%22%7D)

- **One-click** (the button above): sign in → the repo is copied into your account (pick **Private** if you plan
  to write private posts) → fill in the environment variables → deploy
- **Dashboard import**: Vercel → **Add New → Project**, pick the repo; Framework: Astro, Build Command `npm run build`,
  Output Directory `dist`, Node 22

You can also create the repo first via [**Use this template**](https://github.com/lavieio/manga-paper-template/generate)
(recommended: **Private**) and import it into Vercel afterwards.

### Deploy to Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**, then pick your repo
2. Build settings: Build command `npm run build`, Output directory `dist`
3. Environment variables: at least `NODE_VERSION=22` (plus the others from the table below)
4. Save and deploy

### Security headers

Out of the box: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`,
plus a **`Content-Security-Policy-Report-Only`**. The policy lives in `src/utils/deploy-policy.ts` (single source)
and has two outlets, one per platform: `dist/_headers` is emitted at build time (Cloudflare Pages / Netlify read
the publish directory) while the repo-root `vercel.ts` runs at Vercel build time (Vercel ignores `_headers`).
`npm run verify` turns red whenever the two disagree.

**The CSP allowlist follows `.env`**: with remark42 configured (`PUBLIC_REMARK42_HOST`) its host is written into
`script-src` / `connect-src` / `frame-src` — the embed script, the WebSocket and the iframe all need it.
A static file cannot know that, which is why both outlets are only materialised at build time.

The CSP is report-only right now: it reports to the console and blocks nothing, so a mis-tuned policy
cannot white-screen your site. Tighten it in this order:

1. Deploy, then watch the CSP reports in the browser console;
2. Add whatever origins show up to the allowlist in `src/utils/deploy-policy.ts` (remark42 is already there);
3. Once the reports are clean, rename `Content-Security-Policy-Report-Only` to `Content-Security-Policy` and start enforcing.

`script-src` keeps `'unsafe-inline'` because Astro inlines client scripts smaller than 4 KB into the HTML
(theme bootstrap, year fix, unlock check, plus a few component scripts) and that set changes with your content —
hard-coded hashes would drift on every build. For a stricter policy, use Astro's built-in
[`security.csp`](https://docs.astro.build/en/reference/configuration-reference/#securitycsp), which hashes at build time.

Content-hashed assets (`/_astro/*`, `/fonts/*`, `/pagefind/index/*`, `/pagefind/fragment/*`) get
`Cache-Control: public, max-age=31536000, immutable`; everything else (HTML, Pagefind's fixed-name runtime)
is left to the platform default.

> Both outlets (`dist/_headers` and `vercel.ts`) must match header by header — `src/utils/deploy-policy.ts` is the
> only place to edit the policy.

### Redirects (301)

The first page of the post list lives at `/posts/1` (`src/pages/posts/[page].astro`); `/posts/` is the legacy
address, so the build emits one real 301: `/posts/ → /posts/1` — Cloudflare Pages / Netlify read `dist/_redirects`
while Vercel reads the `redirects` of `vercel.ts`. In-site links point straight at `/posts/1` and never pay the hop.

### Environment Variables

| Variable | Purpose |
| :--- | :--- |
| `PRIVATE_PASSWORD` | Password for private-post encryption (build time; falls back to `manga-paper`, local use only) |
| `PUBLIC_UNLOCK_TTL_HOURS` | How long an unlock is remembered, in hours (default 1) |
| `SITE_URL` | **Required**: site root URL — the single source of truth for canonical / sitemap / RSS. `npm run build` fails when it is missing, malformed, or still `https://your-domain.com` |
| `SKIP_REMOTE_IMAGE_SIZE` | Optional: set to 1 to skip remote image-size probing at build time (offline / blocked hosts) |
| `PUBLIC_REMARK42_HOST` / `PUBLIC_REMARK42_SITE_ID` | remark42 comments (optional; both required) |
| `PUBLIC_GA_MEASUREMENT_ID` | Optional: GA4 Measurement ID (e.g. `G-XXXXXXXXXX`); analytics and its CSP allowlist only activate when set |
| `PUBLIC_GSC_VERIFICATION` | Optional: GSC HTML-tag verification content (not needed with DNS TXT verification) |

`.env` is gitignored; `.env.example` ships with the repository.

`SITE_URL` is enforced by the pre-build check in `scripts/preflight.ts`: missing, malformed, or
still the example domain makes `npm run build` fail (that is the command deploy platforms run), while
`astro dev` / `preview` are unaffected. Override ad hoc with `SITE_URL=http://localhost:4321 npm run build`.

> Astro does not load `.env` into configuration files (see the official docs), so `astro.config.mjs`
> calls `loadSiteEnv()` itself. That is also the root cause of the old bug where a configured
> `SITE_URL` still produced `your-domain.com` in canonical / sitemap / RSS.

## 📝 Comments (optional)

With `PUBLIC_REMARK42_HOST` / `PUBLIC_REMARK42_SITE_ID` configured, public posts render remark42 at the bottom:

- **Missing either one → the whole comment section is not rendered** (no empty shell); private posts never carry comments
- Lazy-loaded (the script is injected only when scrolled near); Chinese UI; **theme follows the site's light/dark**
- ⚠️ remark42 renders inside a cross-origin iframe (style isolation), so page CSS cannot reach it. Matching it fully
  to the paper look requires rewriting its stylesheet behind a reverse proxy, or rebuilding its frontend — out of scope here
- ⚠️ Once comments are configured, that host lands in the CSP allowlist of `dist/_headers` and `vercel.ts`
  automatically (`script-src` / `connect-src` / `frame-src`) — nothing to remember

## 📊 Analytics & Search Console (optional)

**Google Analytics 4**: set `PUBLIC_GA_MEASUREMENT_ID` (e.g. `G-XXXXXXXXXX`) to enable it.

- Not configured → zero third-party scripts, and the CSP does not allowlist GA either
- Only in **production builds**; **private posts, `/private`, 404 and any other `noindex` page are never tracked**
- Loading strategy: queue `gtag` commands first, then inject `gtag.js` when the browser is idle
  (`requestIdleCallback`, 3s timeout fallback), so it never competes with the first paint; the trade-off is
  that visits leaving before the script lands produce no `page_view`
- Once configured, `gtag.js` and the collection endpoints land in the CSP allowlist of
  `dist/_headers` / `vercel.ts` automatically
- ⚠️ GA4 writes a `_ga` cookie; if you need GDPR-style consent, add it yourself (the template loads on config)

**Google Search Console**: pick either verification method.

- **DNS TXT** (recommended: domain-wide, zero code): add the `google-site-verification=...` record GSC gives you
- **HTML tag**: put GSC's content value into `PUBLIC_GSC_VERIFICATION`; it renders
  `<meta name="google-site-verification">`

Then submit `https://<your-domain>/sitemap-index.xml` in GSC. Both the sitemap and `robots.txt` are
generated at build time from `SITE_URL`, and already exclude private posts, drafts, `/private` and
`/search`; private pages rely on `noindex` (not a `robots.txt` Disallow), so do **not** add `/private`
to Disallow — crawlers would then never read the `noindex` and the page could get indexed anyway.

## 🔤 Fonts

Self-hosted **Maple Mono NF CN** ([SIL OFL 1.1](https://github.com/subframe7536/maple-font), v7.9) — no font
CDN involved. The recipe is **full fonts in the repo, subsets cut at build time**: `assets/fonts/` holds the
upstream TTFs (Regular / Italic / SemiBold / Bold, ≈83 MB total) and the build reduces them to the glyphs this
site actually needs. The artifacts (`public/fonts/*.woff2`, 82 files / ≈2.8 MB) are **not committed**.
Layered by `unicode-range`:

- **core**: site characters + common symbols (ASCII / CJK punctuation / full-width / arrows·math·box…), one file
  for each of the two weights the browser fonts use (400 / 700, ≈350–360 KB each); both are preloaded.
  Semi-bold 600 and italic 400i get no subset: every extra face costs another 360–390 KB core **and** one more
  full-document relayout. 600 only serves small sticker/label text (`font-weight: 600` in CSS resolves to the 700
  face); italic is only used by `blockquote` (the browser synthesises the slant from the 400 face via
  `font-synthesis`, matching the `font-style: italic` of the `demos/comic/` visual baseline). All upstream TTFs
  stay in `assets/fonts/`: SemiBold is read directly by Satori at build time for OG cards (unrelated to the
  browser font chain), Italic is just kept around for now;
- **tail**: the rest of GB2312 level 1, sliced per zone (94 chars), built for 400/700 only; the browser fetches a
  slice only when such a character actually appears → **nothing inside GB2312 level 1 is ever missing**, and the
  first load pays nothing for it. The tail `@font-face` list (one long `unicode-range` string, ~50 KB) ships as a
  separate `maple-tail.<hash>.css` loaded asynchronously (content hash + `/fonts/*` immutable); only the core
  rules are inlined with the page CSS — inlining the list means re-downloading it on every page view, since HTML
  is not cacheable;
- Anything outside (GB2312 level 2, rare glyphs, plus glyphs the font simply lacks such as `✅❌➕` and Kangxi
  radicals) falls back to the **metric-aligned** Consolas declared in `src/styles/fonts.css`
  (`size-adjust: 109.1%`) — same advance width, no layout shift.

Measured (412px, cold cache): the font payload drops from ≈2.5 MB / 55 shards (CDN) to **≈0.69 MB / 2 requests**
(core 400 + 700; same for a list page and an article with a blockquote), plus a ≈10 KB immutable CSS for the tail
list. Per-page inline CSS drops from ≈80 KB to ≈31 KB and the HTML (gzip) from ≈22 KB to ≈12 KB.

**No manual step**: `npm run fonts` is part of `npm run build` and `npm run dev`; it recomputes the character set
from the current content (including private/draft post sources) and skips the whole step when nothing changed
(fingerprint in `.cache/fonts/plan.json`: ~0.2s on later builds, ≈20s on the first build of a fresh clone).
To change weights or coverage edit `scripts/lib/font-charsets.ts`; to upgrade the font, drop the upstream files
(same names) into `assets/fonts/` — they come out of `MapleMono-NF-CN.zip` in the
[releases](https://github.com/subframe7536/maple-font/releases).


## ✨ Feedback & Suggestions

Open an [issue](https://github.com/lavieio/manga-paper-template/issues) for feedback, bugs or feature requests.

## 📜 License

- Template code: [MIT](LICENSE)
- Font [Maple Mono NF CN](https://github.com/subframe7536/maple-font): **OFL-1.1**

---

Made with 🖤 by [lavieio](https://github.com/lavieio)
