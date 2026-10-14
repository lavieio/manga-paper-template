# MangaPaper 🖋

![MangaPaper preview](public/og.png)

![Astro](https://img.shields.io/badge/Astro-7.x-FF5D01?style=for-the-badge&logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-2F3741?style=for-the-badge)

[简体中文](README.md) · **English**

MangaPaper is an open-source blog template inspired by comic paper: dotted notebook backgrounds, ink-black borders, offset hard shadows, and sticker-like labels create its visual identity, paired with a monospace type system and light/dark themes.

Built with Astro as a fully static site, it requires no application server of your own. Start writing in Markdown, then enable private posts, comments, analytics, and search-engine verification as needed.

[Live demo](https://blog.lavieio.com) · [Use this template](https://github.com/lavieio/manga-paper-template/generate) · [Report an issue](https://github.com/lavieio/manga-paper-template/issues)

## ✨ Highlights

- **Comic-paper design**: dotted backgrounds, hard borders, offset shadows, sticker labels, and light/dark themes.
- **Self-hosted fonts**: Maple Mono NF CN subsets are generated from your content at build time, without relying on a third-party font CDN.
- **Complete blog organization**: featured posts, categories, tags, an archive timeline, drafts, and pagination (8 posts per page).
- **A comfortable reading experience**: table of contents with scroll highlighting, one-click code copying, a PhotoSwipe image lightbox, and build-time image sizing to reduce layout shifts.
- **Static full-text search**: Pagefind with CJK-friendly search; the search index is generated during the build.
- **SEO and social cards**: automatic sitemap, RSS, and robots.txt generation; a 1200 × 630 OG image for each public post. Drafts and private posts are excluded from public indexes and social-card generation.
- **Private posts**: encrypted at build time with AES-256-GCM; only ciphertext is shipped in the static site. Readers enter a password on `/private` and decrypt content in their browser.
- **Opt-in integrations**: remark42 comments, Google Analytics 4, Google Search Console verification, and Vercel Web Analytics / Speed Insights.
- **Static-hosting friendly**: supports Vercel and Cloudflare Pages, with platform-specific security-header configuration generated from environment variables.

## 🚀 Quick Start

**Requirements: Node.js `>=22 <25`.**

### 1. Create your repository

We recommend clicking [Use this template](https://github.com/lavieio/manga-paper-template/generate) to create your own repository. If you plan to publish private posts, set the new repository to **Private**.

You can also clone the project directly for theme development:

```bash
git clone https://github.com/lavieio/manga-paper-template.git my-blog
cd my-blog
npm install
```

### 2. Configure the environment and start the server

```bash
cp .env.example .env
```

Edit `.env` and set `SITE_URL` to your local address or production site root:

```dotenv
SITE_URL=http://localhost:4321
```

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:4321](http://localhost:4321). The Pagefind search index is not generated in development mode, so test search using the built preview instead.

> **Set `SITE_URL` before deploying.** `npm run build` fails if this variable is missing, malformed, or still points to the example domain.

## 🎛 Site Configuration

Site name, author, tagline, social entries, and pagination all live in one file at the repo root: **`manga-paper.config.ts`**.

```ts
import { defineConfig } from "./src/types/config";

export default defineConfig({
  site: {
    name: "MangaPaper",
    tagline: "A loose-leaf, comic-paper, monospace blog theme",
    author: "lavie",
    bio: "An open-source blog theme with a comic-paper look",
  },
  posts: {
    perPage: 8,       // posts per page in the list
    recentCount: 3,   // posts in the homepage "recent" section
  },
  // your entries: rendered on the homepage strip, in this order
  socials: [
    { label: "GitHub", url: "https://github.com/you/repo", icon: "github", primary: true },
    { label: "Email",  url: "mailto:yourmail@gmail.com",   icon: "mail" },
    { label: "X",      url: "https://x.com/you",           icon: "x" },
    { label: "Friend", url: "https://example.com",         icon: "/icons/friend.svg" },
  ],
});
```

| Field | Description |
| --- | --- |
| `site.name` / `site.tagline` | Site name and one-line tagline: header, `<title>`, RSS, and social cards all use them |
| `site.author` / `site.bio` | Fallback for the about page's meta description, and the second line of the default site card |
| `posts.perPage` / `posts.recentCount` | Posts per list page / homepage "recent" count |
| `socials[]` | Entry list: `label` text, `url` target, `icon` icon, `primary` main entry (ink-filled, at most one) |

`socials` shows up only on the **homepage sticker strip** (the about page carries no entry row);
RSS is appended by the template:

| Where | What is rendered |
| --- | --- |
| Homepage strip | `socials` → RSS |
| Footer | RSS and private-post entries (shipped with the template, not part of `socials`) |

`icon` accepts three forms; anything unrecognised or omitted falls back to the generic external-link icon (never blank):

| Form | Example | Notes |
| --- | --- | --- |
| Built-in name | `icon: "github"` | 23 monochrome icons maintained in-repo, coloured by the theme |
| Local image | `icon: "/icons/weibo.svg"` | Drop the file in `public/icons/`; `.svg` / `.png` / `.webp` all work |
| Remote image | `icon: "https://cdn.example.com/x.png"` | Served over https; the current CSP `img-src` already allows any https image |

Built-in names: `github`, `x`, `facebook`, `instagram`, `linkedin`, `telegram`, `youtube`, `reddit`, `discord`,
`mastodon`, `bluesky`, `threads`, `rss`, `weibo`, `zhihu`, `bilibili`, `wechat`, `douban`, `juejin`, `gitee`,
`mail`, `link`, `seal`. The paths come from [simple-icons](https://github.com/simple-icons/simple-icons) (CC0-1.0)
and are inlined in `src/utils/social-icons.ts` — no dependency, no request at runtime.

> Deployment-time and secret settings do not live here — they stay in `.env` (see "Environment Variables" below).
> An empty `label` or `url`, or a `url` containing whitespace, fails the build and names the offending entry.

## 🧰 Common Commands

Run commands from the project root:

| Command | Description |
| --- | --- |
| `npm install` | Install dependencies and Git hooks |
| `npm run dev` | Start the local development server |
| `npm run fonts` | Generate font subsets from current content; the dev and build workflows run this automatically |
| `npm run build` | Build the static site, font subsets, social cards, deployment configuration, and Pagefind index into `dist/` |
| `npm run preview` | Preview the production build locally; search works in this mode |
| `npm run astro ...` | Run the Astro CLI, e.g. `npm run astro add` |

## 📝 Writing Posts

All posts live in `src/content/blog/`. **The first-level directory becomes the category, and the filename becomes the URL slug.** For example, `src/content/blog/tech/hello-world.md` belongs to the `tech` category.

Posts are written in Markdown, with metadata defined in frontmatter:

```yaml
---
title: Post title
description: Summary used for SEO, RSS, and social cards
tags: [tech, essays]
featured: true       # optional: include in the homepage featured carousel
draft: false         # optional: true excludes the post from builds
private: false       # optional: true encrypts the post as private content
cover: /images/cover.png  # optional: cover image
---

Write your post here.
```

You usually do not need to maintain `date` or `updated` manually. Git hooks handle them based on commit messages:

| Example commit message | Behaviour |
| --- | --- |
| `feat(blog): publish a post` | Adds `date` to a new post; refreshes `updated` for an existing post |
| `fix(blog): correct a typo` | Does not refresh `updated`; `chore` commits behave the same way |
| Commit message contains `[skip-updated]` | Skips the `updated` refresh |

## 📄 About Page

The about page body is **content**, not configuration, so it lives in `src/content/pages/about.md`
and is written the same way as a post: Markdown, HTML, and `<style>` all work.
`src/pages/about.astro` is just a shell (layout + h1 + the body).

```md
---
title: About
description: page meta description; falls back to site.bio when omitted
prose: true
stats: true
---

The body starts at `##` (a `#` renders a second h1 and fails the build-time assertion).

## What I do

- First thing
- Second thing

<!-- need a custom layout? write HTML and <style> directly -->
<div class="intro">
  <img src="/images/me.png" alt="" width="170" height="200">
  <p>Image on the left, text on the right — a grid does it.</p>
</div>

<style>
.intro { display: grid; grid-template-columns: 170px 1fr; gap: 36px; }
</style>
```

| What you write | What the template does |
| --- | --- |
| Markdown | Goes through the post pipeline, styled by `.prose` |
| HTML | Emitted as-is — any layout you like |
| `<style>` | Wrapped in `@scope (.about-custom)`, so bare class names cannot reach the header or footer |

A few ground rules:

- **Use the theme tokens** (`var(--ink)` / `var(--card)` / `var(--red)` / `var(--yellow)` …) so dark mode follows along; hard-coded `#000` goes blind on dark paper.
- **The `prose` switch** defaults to `true`, giving the body the post typography (`.prose`: 16px / 1.9 line height, h2 with a 3px ink underline, h3 prefixed with a vermilion `§`, blockquotes as pink cards, inline code as bordered chips, yellow table headers, code blocks with a 3px ink frame and a hard shadow). Set it to `false` when the whole page is your own CSS, so the two sets of styles do not fight.
- **The `stats` switch** defaults to `true` and renders the site stats bar (post / category / tag counts, computed at build time) below the body. Set it to `false` to render nothing but your own content.
- **Do not write `<script>`**: it will run, but it bypasses Astro's bundling, breaks the zero-JS promise, and is outside what the template supports.
- **Hand-written `<img>` needs `width` / `height`**: Markdown images get build-time sizing and the lightbox automatically; raw HTML does not.

## 🔒 Private Posts

1. Set `PRIVATE_PASSWORD` in `.env` or your deployment environment variables. Replace the example password before going live.
2. Set `private: true` in the post frontmatter.
3. After deployment, readers can open `/private` from the footer, enter the password, and view the content in their browser.

The template derives a key with PBKDF2 (SHA-256, 600,000 iterations) and encrypts content with AES-256-GCM. The unlocked state is stored in browser `localStorage` for one hour by default; adjust it with `PUBLIC_UNLOCK_TTL_HOURS`.

Private posts are excluded from public lists, the archive, tags, categories, RSS, sitemap, and search index. Related pages are also marked `noindex`.

> **Important:** Keep the Git repository containing real private posts private. `noindex` is a search-engine directive, not access control; lost passwords cannot be recovered.

## ⚙️ Environment Variables

All available settings are listed in `.env.example`. The `.env` file is listed in `.gitignore`; never commit real passwords or other sensitive values.

| Variable | Description |
| --- | --- |
| `SITE_URL` | **Required.** Site root URL used for canonical URLs, sitemap, and RSS. Production builds must not use the example domain. |
| `PRIVATE_PASSWORD` | Password used to encrypt private posts. The default `manga-paper` is for local previews only; use a strong password in production. |
| `PUBLIC_UNLOCK_TTL_HOURS` | Number of hours to remember an unlocked private session in the browser; defaults to `1`. |
| `SKIP_REMOTE_IMAGE_SIZE` | Optional. Set to `1` to skip remote image-size probing during builds, useful offline or when remote hosts are unreachable. |
| `PUBLIC_REMARK42_HOST` / `PUBLIC_REMARK42_SITE_ID` | Optional. Both values are required to render the remark42 comment section. |
| `PUBLIC_GA_MEASUREMENT_ID` | Optional. GA4 Measurement ID, e.g. `G-XXXXXXXXXX`; GA4 is not loaded unless configured. |
| `PUBLIC_GSC_VERIFICATION` | Optional. Google Search Console HTML-tag verification value; not needed when using DNS TXT verification. |
| `PUBLIC_VERCEL_ANALYTICS` | Optional, Vercel only. Set to `1` to enable Vercel Web Analytics; enable the feature in the project dashboard first. |
| `PUBLIC_VERCEL_SPEED_INSIGHTS` | Optional, Vercel only. Set to `1` to enable Speed Insights; enable the feature in the project dashboard first. |

### Optional Integrations

- **remark42**: Set both `PUBLIC_REMARK42_HOST` and `PUBLIC_REMARK42_SITE_ID`. Comments appear on public posts only.
- **Google Analytics 4**: Set `PUBLIC_GA_MEASUREMENT_ID`. It loads only in production builds and on pages not marked `noindex`. GA4 uses cookies; add a consent mechanism yourself if required.
- **Google Search Console**: Verify with DNS TXT (recommended) or an HTML meta tag. After verification, submit `https://your-domain/sitemap-index.xml`.
- **Vercel Web Analytics / Speed Insights**: Available only when deployed on Vercel; the two switches can be enabled independently. The template does not load these analytics scripts unless configured.

## 🌐 Deployment

The project outputs static files to `dist/`. Choose one hosting platform.

### Vercel

Use the [Vercel one-click deploy entry point](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flavieio%2Fmanga-paper-template&project-name=manga-paper&repository-name=manga-paper&env=PRIVATE_PASSWORD,SITE_URL,PUBLIC_UNLOCK_TTL_HOURS&envDescription=PRIVATE_PASSWORD%20encrypts%20private%20posts%20%E2%80%94%20use%20a%20strong%20password%20before%20going%20live.%20SITE_URL%20is%20your%20real%20domain.%20PUBLIC_UNLOCK_TTL_HOURS%20is%20the%20unlock%20memory%20in%20hours%2C%20default%201.&envDefaults=%7B%22PUBLIC_UNLOCK_TTL_HOURS%22%3A%221%22%7D), or import your own repository from the Vercel dashboard.

- Framework Preset: `Astro`
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js: `22` (or another supported `>=22 <25` version)

Set the production `SITE_URL` in project environment variables. If you use private posts, also set a strong `PRIVATE_PASSWORD`.

### Cloudflare Pages

1. In the Cloudflare dashboard, open **Workers & Pages → Create → Pages → Connect to Git**, then select your repository.
2. Build command: `npm run build`.
3. Build output directory: `dist`.
4. Add `NODE_VERSION=22`, configure any other required environment variables from the table above, and deploy.

The template prepares platform-specific security headers, including HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, and a report-only CSP. These configurations are generated at build time. The CSP is currently in Report-Only mode: it reports violations but does not block resources.

## 🎨 Design & Technology

### Design Language

- **Dotted paper**: a regular grid of small ink dots creates a notebook-paper texture.
- **Hard edges and shadows**: bold ink borders with offset shadows and no blur.
- **Sticker-like labels**: slightly rotated, colour-coded category labels give posts a note-on-paper feel.
- **Light/dark themes**: both themes share the same layout structure.

### Project Structure

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
│   ├── content/pages/about.md  # about-page body: Markdown, HTML and <style> all work
│   ├── layouts/Base.astro      # dotted paper background, theme toggle, header & footer
│   ├── pages/                  # index / posts / archive / tags / category / search / private / about / rss / og (social cards)
│   ├── plugins/                # rehype image sizing and lazy-loading, code-copy button, private & draft scanning
│   ├── scripts/                # lightbox, TOC, private unlock & key cache (client-side)
│   ├── styles/                 # global / fonts / card / prose / private / lightbox
│   ├── utils/                  # content pipeline, crypto, formatting, reading time, header policy, OG cards
│   ├── types/config.ts         # type contract for user config (MangaPaperConfig / defineConfig)
│   ├── config.ts               # resolved config: reads manga-paper.config.ts + merges env; consumers only use this
│   └── content.config.ts       # content schema (zod)
├── manga-paper.config.ts       # site name / author / tagline / social entries / pagination (your single entry point)
├── vercel.ts                   # Vercel project config (runs at Vercel build time, reads env; nothing generated in git)
└── astro.config.mjs
```

All posts live in `src/content/blog/`; the **first-level directory name becomes the category** (`blog/tech/hello.md` → category “tech”), and the filename becomes the URL slug.

### Tech Stack

- [Astro](https://astro.build/): static site generation
- TypeScript: configuration and build scripts
- [Maple Mono NF CN](https://github.com/subframe7536/maple-font): self-hosted monospace font, licensed under SIL OFL-1.1
- [Pagefind](https://pagefind.app/): static search
- [PhotoSwipe](https://photoswipe.com/): image lightbox
- [Satori](https://github.com/vercel/satori) and [resvg-js](https://github.com/thx/resvg-js): build-time OG image generation
- [remark42](https://remark42.com/): optional comments
- Web Crypto API: private-post encryption

### Performance

<p align="center">
  <a href="https://pagespeed.web.dev/analysis?url=https%3A%2F%2Flavieio.com%2F&form_factor=desktop">
    <img alt="PageSpeed Insights: full marks for performance, accessibility, best practices, and SEO" src="public/pagespeed-insights.png">
  </a>
</p>

PageSpeed Insights reports full marks across every category: no render-blocking third-party scripts, font subsets loaded on demand, and image sizing plus social-card rendering all happen at build time, so the site ships static files only. Click the screenshot for the full report.

## 💬 Feedback & License

Open an issue for bugs, suggestions, or feature requests on [GitHub Issues](https://github.com/lavieio/manga-paper-template/issues).

- Template code: [MIT License](LICENSE)
- Maple Mono NF CN font: [SIL Open Font License 1.1](https://github.com/subframe7536/maple-font)

---

Made with 🖤 by [lavieio](https://github.com/lavieio)
