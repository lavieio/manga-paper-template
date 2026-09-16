# MangaPaper 🖋

![MangaPaper](public/default-og.svg)

![Astro](https://img.shields.io/badge/Astro-7.x-FF5D01?style=for-the-badge&logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![License](https://img.shields.io/github/license/lavieio/manga-paper?color=%232F3741&style=for-the-badge)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white&style=for-the-badge)](https://conventionalcommits.org)

[简体中文](README.md) · **English**

MangaPaper is a **comic-paper** themed open-source blog template: dotted notebook paper, ink-black hard borders,
offset hard shadows, slapped-on sticker labels — with a monospace type system (Maple Mono NF CN) and light/dark themes.
Fully static: no backend, no client framework.

- Want to see it? Run it locally ([Running Locally](#-running-locally)) or hit [Deploy](#-deployment)
- Building a private blog? Start with the [two-repository workflow](#-two-repository-workflow-template--private-blog)
- Curious about the design decisions? See [Design Language](#-design-language)

## 🔥 Features

- [x] Paper × comic design language (dot grid / hard borders / hard shadows / sticker labels, vermilion used sparingly)
- [x] light & dark mode (theme applied before first paint — no flash; View Transitions page-turn effect)
- [x] Monospace everywhere, loaded from CDN in `unicode-range` chunks, with metric-matched fallback
- [x] **Private posts**: AES-256-GCM encrypted at build time; only ciphertext ships; `/private` gated index
- [x] Table of contents (sticky right rail, scroll highlighting with vermilion indicator)
- [x] Homepage Featured paper-stack carousel (auto-play, bidirectional hover, `prefers-reduced-motion` fallback)
- [x] static search ([Pagefind](https://pagefind.app/), CJK-friendly)
- [x] Image lightbox ([PhotoSwipe](https://photoswipe.com/), lazy-loaded; dimensions injected at build time — zero layout shift)
- [x] Archive timeline / tag cloud / category pages
- [x] draft posts & pagination (8 per page)
- [x] sitemap & rss feed (private and draft posts excluded)
- [x] Comments ([remark42](https://remark42.com/), optional — not rendered unless configured)
- [x] Automatic dates: a git hook injects `date` and refreshes `updated`
- [x] Build-output assertions (`npm run verify`: no private leakage, index page count, artifacts present)
- [x] One-click deploy (Vercel / Cloudflare Pages)

## 🚀 Project Structure

```bash
/
├── public/
│   ├── _redirects              # Cloudflare Pages 301 (pick one: this or vercel.json)
│   ├── default-og.svg          # README hero / social preview
│   └── favicon.svg             # vermilion seal
├── scripts/
│   ├── frontmatter-dates.ts    # git hook: inject date / refresh updated
│   └── verify-dist.ts          # build-output assertions (npm run verify)
├── src/
│   ├── components/             # PostCard / FeaturedStack / TableOfContents / Comments …
│   ├── content/blog/           # posts: first-level directory name = category
│   ├── layouts/Base.astro      # dotted paper background, theme toggle, header & footer
│   ├── pages/                  # index / posts / archive / tags / category / search / private / rss
│   ├── plugins/                # rehype image sizing, content scanning
│   ├── scripts/                # lightbox, TOC, private unlock & key cache (client-side)
│   ├── styles/                 # global / fonts / card / prose / private / lightbox
│   ├── utils/                  # content pipeline, crypto, formatting, reading time
│   ├── config.ts               # site name / author / remark42 (single source of truth)
│   └── content.config.ts       # content schema (zod)
├── astro.config.mjs
└── vercel.json                 # Vercel 301 (pick one: this or public/_redirects)
```

All posts live in `src/content/blog/`; the **first-level directory name becomes the category**
(`blog/tech/hello.md` → category “tech”), and the filename becomes the URL slug.

## 💻 Tech Stack

**Framework** - [Astro](https://astro.build/) (`output: 'static'`, no SSR adapter)
**Source language** - TypeScript (Node native type stripping — no build step before running)
**Fonts** - [Maple Mono NF CN](https://github.com/subframe7536/maple-font) (OFL-1.1) via [ZeoSeven Fonts CDN](https://fonts.zeoseven.com/items/442/)
**Static search** - [Pagefind](https://pagefind.app/)
**Lightbox** - [PhotoSwipe](https://photoswipe.com/)
**Comments** - [remark42](https://remark42.com/) (self-hosted, optional)
**Encryption** - WebCrypto (PBKDF2 600k + AES-256-GCM)
**Git hooks** - [husky](https://typicode.github.io/husky/)
**Deployment** - [Cloudflare Pages](https://pages.cloudflare.com/) or [Vercel](https://vercel.com/) (choose one)

## 👨🏻‍💻 Running Locally

Requires **Node ≥ 22** (see `.nvmrc`).

```bash
# Option 1: clone directly (for theme development)
git clone https://github.com/lavieio/manga-paper.git my-blog
cd my-blog && npm install

# Option 2: use this repo as a template (for blogging; pick Private)
# https://github.com/lavieio/manga-paper/generate

cp .env.example .env          # fill in as needed — see Environment Variables
npm run dev                   # http://localhost:4321
```

> Search has no index in dev mode (Pagefind runs after the build); the search page says so explicitly. That is expected.

## 🧞 Commands

All commands are run from the project root:

| Command | Action |
| :--------------- | :------------------------------------------------------------------- |
| `npm install` | Install dependencies (also installs the git hooks via husky) |
| `npm run dev` | Start the local dev server at `localhost:4321` |
| `npm run build` | Build the static site + generate the Pagefind index into `dist/` |
| `npm run preview` | Preview the build locally (search works here) |
| `npm test` | Unit/integration tests (date hook, crypto round-trip) |
| `npm run verify` | Assert build outputs: no private leakage, Pagefind page count, artifacts (run after build) |
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
- **Vermilion, rationed**: seal logotype, featured sticker, TOC indicator, link underlines — the most expensive colour here
- **Type**: Maple Mono NF CN everywhere; dark mode only swaps CSS variable values, never structure

## 🌐 Deployment

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flavieio%2Fmanga-paper&project-name=manga-paper&repository-name=manga-paper&env=PRIVATE_PASSWORD,SITE_URL,PUBLIC_UNLOCK_TTL_HOURS&envDescription=Fill%20in%20the%20values%20from%20.env.example%3A%20PRIVATE_PASSWORD%20encrypts%20private%20posts%20(use%20a%20strong%20password%20before%20going%20live)%2C%20SITE_URL%20is%20your%20real%20domain.&envDefaults=%7B%22PUBLIC_UNLOCK_TTL_HOURS%22%3A%221%22%7D&envLink=https%3A%2F%2Fgithub.com%2Flavieio%2Fmanga-paper%2Fblob%2Fmain%2F.env.example)

[**Use this template**](https://github.com/lavieio/manga-paper/generate) — create your own repository from this one (pick **Private**).

> ⚠️ One-click deploy **copies the repository into your own account**. If you plan to use private posts,
> make sure the new repository is **private** and put the real password into the platform's environment
> variables (never into the URL).

### Manual deploy (choose one)

Both platforms consume the same `dist/`. **Deploy to one only**, and **delete the other platform's redirect config**:

| Platform | Configuration | Delete |
| :--- | :--- | :--- |
| Cloudflare Pages | Build: `npm run build`; Output: `dist`; env `NODE_VERSION=22` | `vercel.json` |
| Vercel | Framework: Astro; Build: `npm run build`; Output: `dist`; Node 22 | `public/_redirects` |

The real 301 for `/posts/` → `/posts/1` comes from the platform config file (a meta-refresh fallback ships too).

> Cloudflare's [Deploy to Cloudflare button](https://developers.cloudflare.com/workers/platform/deploy-buttons)
> targets Workers projects; for a purely static Pages site use the dashboard:
> **Workers & Pages → Create → Pages → Connect to Git**.

### Environment Variables

| Variable | Purpose |
| :--- | :--- |
| `PRIVATE_PASSWORD` | Password for private-post encryption (build time; falls back to `manga-paper`, local use only) |
| `PUBLIC_UNLOCK_TTL_HOURS` | How long an unlock is remembered, in hours (default 1) |
| `SITE_URL` | Site root URL — the single source of truth for canonical / sitemap / RSS |
| `PUBLIC_REMARK42_HOST` / `PUBLIC_REMARK42_SITE_ID` | remark42 comments (optional; both required) |

`.env` is gitignored; `.env.example` ships with the repository.

## 📝 Comments (optional)

With `PUBLIC_REMARK42_HOST` / `PUBLIC_REMARK42_SITE_ID` configured, public posts render remark42 at the bottom:

- **Missing either one → the whole comment section is not rendered** (no empty shell); private posts never carry comments
- Lazy-loaded (the script is injected only when scrolled near); Chinese UI; **theme follows the site's light/dark**
- ⚠️ remark42 renders inside a cross-origin iframe (style isolation), so page CSS cannot reach it. Matching it fully
  to the paper look requires rewriting its stylesheet behind a reverse proxy, or rebuilding its frontend — out of scope here

## 🔤 Fonts

By default fonts come from the [ZeoSeven Fonts CDN](https://fonts.zeoseven.com/items/442/) (cn-font-split chunks,
OFL-1.1, hinted) — no font files to self-host.

To self-host instead: download Maple Mono NF CN, subset it yourself, emit `public/fonts/**`,
then swap the eight CDN `<link>` tags in `src/layouts/Base.astro` for local `@font-face` rules
(keep the metric-matched fallback in `src/styles/fonts.css`). ZeoSeven also ships a
[ZSFT CLI](https://fonts.zeoseven.com/docs/cli/) for private deployments. Offline, fonts fall back to
metric-adjusted Consolas.

## 🔁 Two-repository Workflow (template → private blog)

```
public repo MangaPaper (this one, the template)  ──theme improvements──▶  private repo (your blog: real posts + real env)
```

- Create a **private** repository from this template; keep real posts, real env and CI secrets there
- Improve the theme in the public repo; the private repo `git fetch` + merges (the two barely overlap)
- The public repo only ever holds sample posts, including sample private posts

## ❓ FAQ

- **The hook rejects my commit with “partially staged”**: `git add` the whole change set first, as the message says
- **Hooks don't run on Windows**: husky needs git-bash (bundled with Git for Windows)
- **Build logs say “missing date, falling back to today”**: expected — the file is not committed yet; the hook injects the real date on commit
- **Private posts ask for the password every time**: make sure the password in `.env` did not change; changing it invalidates cached keys
- **Fonts look different offline**: the CDN is unreachable, so the metric-matched local monospace fallback kicks in

## ✨ Feedback & Suggestions

Open an [issue](https://github.com/lavieio/manga-paper/issues) for feedback, bugs or feature requests.

## 📜 License

- Template code: [MIT](LICENSE)
- Font [Maple Mono NF CN](https://github.com/subframe7536/maple-font): **OFL-1.1**

---

Made with 🖤 by [lavieio](https://github.com/lavieio)
