# MangaPaper 🖋

![MangaPaper preview](public/og.png)

![Astro](https://img.shields.io/badge/Astro-7.x-FF5D01?style=for-the-badge&logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-2F3741?style=for-the-badge)

[简体中文](README.md) · **English**

MangaPaper is an open-source blog template inspired by comic paper and stationery. A dotted-paper background, ink-black borders, offset hard shadows, and sticker-like labels define its visual style, paired with a self-hosted monospace font and light/dark themes.

Built with Astro, MangaPaper generates a fully static site, so you do not need to run an application server. Write posts in Markdown, then enable private posts, comments, analytics, and search-engine verification as needed.

[Live demo](https://blog.lavieio.com) · [Use this template](https://github.com/lavieio/manga-paper-template/generate) · [Report an issue](https://github.com/lavieio/manga-paper-template/issues)

## ✨ Highlights

- **Comic-paper design:** Dotted background, hard borders, directional hard shadows, sticker labels, and light/dark themes.
- **Self-hosted fonts:** Uses Maple Mono NF CN and generates font subsets from site content during the build, without relying on a third-party font CDN.
- **Complete content organization:** Featured posts, categories, tags, an archive timeline, drafts, and pagination (8 posts per page by default).
- **Reading enhancements:** Table of contents with scroll highlighting, one-click code copying, PhotoSwipe image lightbox, and build-time image dimensions to help reduce layout shifts.
- **Static full-text search:** Pagefind generates the search index at build time and supports Chinese queries.
- **SEO and sharing:** Generates a sitemap, RSS feed, and `robots.txt`, plus 1200 × 630 OG images for public posts. Drafts and private posts are excluded from public indexes and do not receive share images.
- **Private posts:** Content is encrypted with AES-256-GCM during the build; only ciphertext is published to the static site. Readers enter a password at `/private`, where content is decrypted in the browser.
- **Optional integrations:** remark42 comments, Google Analytics 4, Google Search Console verification, and Vercel Web Analytics / Speed Insights.
- **Static-hosting friendly:** Supports Vercel and Cloudflare Pages, generating deployment configuration and security headers from environment variables.

## 🚀 Quick start

**Requirement: Node.js `>=22 <25`.**

### 1. Create a repository and clone it

We recommend using [Use this template](https://github.com/lavieio/manga-paper-template/generate) to create your own repository, then cloning that repository locally. If you plan to publish private posts, set the repository to **Private**.

```bash
git clone https://github.com/<your-name>/<your-repo>.git my-blog
cd my-blog
npm install
```

If you want to contribute to the theme itself, clone the template repository instead:

```bash
git clone https://github.com/lavieio/manga-paper-template.git my-blog
cd my-blog
npm install
```

### 2. Configure the environment and start the site

Copy the example environment file:

```bash
cp .env.example .env
```

In Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set `SITE_URL` to the local address:

```dotenv
SITE_URL=http://localhost:4321
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321). The Pagefind search index is not generated in development mode, so test search with a built preview.

> **Set the production `SITE_URL` before deployment.** It must be the root URL of your site. `npm run build` fails if it is missing, invalid, or still points to an example domain.

## 🎛 Site configuration

The site name, author, bio, language, time zone, footer, homepage shortcuts, and pagination settings live in **`manga-paper.config.ts`** at the repository root.

```ts
import { defineConfig } from "./src/types/config";

export default defineConfig({
  site: {
    name: "MangaPaper",
    tagline: "A loose-leaf, comic-paper, monospace blog theme",
    author: "lavie",
    bio: "An open-source blog template with a comic-paper aesthetic",
    lang: "en-US",              // <html lang>, OG locale, RSS and JSON-LD
    timeZone: "Asia/Shanghai",  // Time zone for displayed dates
    favicon: "/favicon.svg",
    sealText: "M",              // Header / default share-card seal; defaults to the first character of the name
    footer: {
      copyright: "Copyright © {year} | All rights reserved.",
      links: [
        // { label: "ICP filing number", href: "https://beian.miit.gov.cn/" },
      ],
    },
  },
  categories: {
    // Optional: pin a category to a sticker color; unlisted categories are hashed by name
    // colors: {
    //   技术: "cyan",
    //   随笔: "pink",
    //   摄影: "yellow",
    // },
  },
  posts: {
    perPage: 8,       // Posts per listing page
    recentCount: 3,   // Number of recent posts on the homepage
  },
  socials: [
    { label: "GitHub", url: "https://github.com/you/repo", icon: "github", primary: true },
    { label: "Email", url: "mailto:yourmail@gmail.com", icon: "mail" },
    { label: "Weibo", url: "https://weibo.com/you", icon: "weibo" },
    { label: "Friends", url: "https://example.com", icon: "/icons/friend.svg" },
  ],
});
```

| Setting | Purpose |
| --- | --- |
| `site.name` / `site.tagline` | Site name and tagline, used in the header brand, page titles, RSS, and default sharing metadata |
| `site.author` / `site.bio` | Author and site description; also used as fallbacks for the About page description and default share-card copy |
| `site.lang` / `site.timeZone` | HTML `lang`, OG locale, RSS and JSON-LD language / time zone for displayed dates; defaults to `zh-CN` / `Asia/Shanghai` |
| `site.favicon` / `site.sealText` | Favicon path / header and default share-card seal; the seal defaults to the first character of the site name |
| `site.footer` | `copyright` supports a `{year}` placeholder; `links[]` holds ICP / public-security filings or custom entries |
| `categories.colors` | Optional category sticker-color overrides; unlisted categories are colored by a stable name hash |
| `posts.perPage` / `posts.recentCount` | Posts per listing page / number of recent posts on the homepage |
| `socials[]` | Homepage shortcuts, displayed in array order; `primary: true` highlights the main link. Set it on at most one item. |

The `{year}` placeholder in `site.footer.copyright` is replaced with the current year in the site time zone. `site.footer.links` is intended for ICP / public-security filings or other footer entries; the row is not rendered when the list is empty.

Category sticker colors are chosen from an 8-color palette (`cyan` / `pink` / `yellow` / `blue` / `green` / `orange` / `violet` / `lime`) by a stable hash of the category name. The same category gets the same color on every build; it is not random. `categories.colors` is only needed when you want to pin a specific color; new categories get a color automatically.

> `site.lang` only affects language metadata such as `<html lang>`, share-card locale, RSS and JSON-LD; it does not translate UI copy.
>
> `site.timeZone` only affects displayed dates and the footer year. The `date` / `updated` injection hook runs independently and always uses `Asia/Shanghai`.

`socials` controls **only the homepage shortcut bar**; these links are not shown on the About page. The template appends RSS automatically, so do not add it again. RSS and the private-post link are included in the footer by default.

### Custom shortcut icons

The `icon` field supports three forms. If it is missing or unrecognized, a generic external-link icon is used as a fallback.

| Type | Example | Details |
| --- | --- | --- |
| Built-in icon | `icon: "github"` | A bundled monochrome icon whose color follows the theme |
| Local image | `icon: "/icons/weibo.svg"` | Place the file in `public/icons/`; SVG, PNG, and WebP are supported |
| HTTPS image | `icon: "https://cdn.example.com/x.png"` | Remote icons must use HTTPS |

Built-in icons: `github`, `x`, `facebook`, `instagram`, `linkedin`, `telegram`, `youtube`, `reddit`, `discord`, `mastodon`, `bluesky`, `threads`, `rss`, `weibo`, `zhihu`, `bilibili`, `wechat`, `douban`, `juejin`, `gitee`, `mail`, `link`, and `seal`. Their paths are based on [Simple Icons](https://github.com/simple-icons/simple-icons) (CC0-1.0) and maintained inline in `src/utils/social/icons.ts`, with no extra dependency or icon request.

> Put deployment settings and passwords in `.env` or your hosting provider's environment settings, not in `manga-paper.config.ts`. Build validation reports shortcut items whose `label` or `url` is empty, or whose `url` contains whitespace.

## 🧰 Common commands

Run these commands from the project root:

| Command | Description |
| --- | --- |
| `npm install` | Install dependencies and Git hooks |
| `npm run dev` | Start the local development server |
| `npm run fonts` | Generate font subsets for the current content; the dev and build workflows also run it automatically |
| `npm run build` | Build the static site, fonts, share images, deployment configuration, and Pagefind index into `dist/` |
| `npm run preview` | Preview the build output locally and test search |
| `npm run astro ...` | Run the Astro CLI, for example `npm run astro add` |

## 📝 Writing posts

Store posts in `src/content/blog/`. **The first-level directory is the category, and the filename becomes the URL slug.** For example, `src/content/blog/tech/hello-world.md` belongs to the `tech` category.

Posts use Markdown with frontmatter metadata:

```yaml
---
title: Post title
description: Summary used for SEO, RSS, and share cards
tags: [Engineering, Notes]
featured: true           # Optional: include in the homepage featured carousel
draft: false             # Optional: true excludes the post from publication
private: false           # Optional: true encrypts the post as private content
cover: /images/cover.png # Optional: cover image
---

Write your post here.
```

You normally do not need to update `date` or `updated` manually. Git hooks handle them based on commit messages:

| Example commit message | Behavior |
| --- | --- |
| `feat(blog): publish a post` | Adds `date` to a new post; updates `updated` on an existing post |
| `fix(blog): correct a typo` | Does not refresh `updated`; `chore` commits behave the same way |
| Commit message contains `[skip-updated]` | Skips the `updated` refresh |

## 📄 Customize the About page

The About page content lives in `src/content/pages/about.md`. It is a content file and supports Markdown, HTML, and `<style>`. The `src/pages/about.astro` file applies the page layout and renders the content.

```md
---
title: About
description: Page description; falls back to site.bio when omitted
prose: true
stats: true
---

## What I'm working on

- First thing
- Second thing

<div class="intro">
  <img src="/images/me.png" alt="" width="170" height="200">
  <p>Use HTML and CSS to create a custom layout.</p>
</div>

<style>
.intro { display: grid; grid-template-columns: 170px 1fr; gap: 36px; }
</style>
```

- **Markdown:** Uses the same rendering pipeline as posts and applies `.prose` typography.
- **HTML:** Use it to build a custom layout.
- **`<style>`:** Styles are scoped inside `@scope (.about-custom)` so ordinary class names do not leak into the header or footer.
- **`prose`:** Defaults to `true` and enables the theme's article typography. Set it to `false` when implementing the entire page with custom CSS.
- **`stats`:** Defaults to `true` and displays build-time counts for posts, categories, and tags below the content. Set it to `false` to hide the bar.
- **Colors:** Prefer theme variables such as `var(--ink)`, `var(--card)`, `var(--red)`, and `var(--yellow)` instead of hard-coded colors that may fail to contrast in dark mode.
- **Images and scripts:** Add `width` and `height` to hand-written `<img>` elements. Avoid adding `<script>` to the About page: it bypasses Astro's normal bundling flow and is not covered by the template's compatibility guarantees.

## 🔒 Private posts

1. Set `PRIVATE_PASSWORD` in `.env` or your hosting provider's environment settings. Replace it with a strong password before deployment.
2. Set `private: true` in the post's frontmatter.
3. After deployment, readers can open `/private` from the footer's **Private** link, enter the password, and read the content after it is decrypted in the browser.

The template derives a key with PBKDF2 (SHA-256, 600,000 iterations) and encrypts content with AES-256-GCM. The unlocked state is stored in browser `localStorage` for one hour by default; adjust it with `PUBLIC_UNLOCK_TTL_HOURS`.

Private posts are excluded from public post listings, archives, tags, categories, RSS, the sitemap, and the search index. Related pages are also marked `noindex`.

> **Security note:** Set the source repository containing real private posts to Private. `noindex` is a search-engine hint, not access control. Use a strong password and keep backups; the template cannot recover content if the password is lost.

## ⚙️ Environment variables

`.env.example` lists all supported settings. `.env` is included in `.gitignore`; never commit passwords or other sensitive values. Variables prefixed with `PUBLIC_` may be exposed to the browser, so **never store secrets in them**.

| Variable | Description |
| --- | --- |
| `SITE_URL` | **Required.** Root URL used for canonical URLs, the sitemap, and RSS. Production builds must not use an example domain. |
| `PRIVATE_PASSWORD` | Password for private posts. The default `manga-paper` is for local previews only and must be replaced before launch. |
| `PUBLIC_UNLOCK_TTL_HOURS` | How long the browser remembers the unlocked state, in hours. Defaults to `1`. |
| `SKIP_REMOTE_IMAGE_SIZE` | Optional. Set to `1` to skip remote image-dimension probing during the build, useful offline or when image hosts are unreachable. |
| `PUBLIC_REMARK42_HOST` / `PUBLIC_REMARK42_SITE_ID` | Optional. The remark42 comment section appears only when both are set. |
| `PUBLIC_GA_MEASUREMENT_ID` | Optional. GA4 Measurement ID, such as `G-XXXXXXXXXX`. GA4 is not loaded when unset. |
| `PUBLIC_GSC_VERIFICATION` | Optional. Google Search Console HTML meta verification value; not needed when verifying with a DNS TXT record. |
| `PUBLIC_VERCEL_ANALYTICS` | Optional, Vercel only. Set to `1` to enable Web Analytics; also enable it in the Vercel project dashboard. |
| `PUBLIC_VERCEL_SPEED_INSIGHTS` | Optional, Vercel only. Set to `1` to enable Speed Insights; also enable it in the Vercel project dashboard. |

### Optional integrations

- **remark42:** Enabled when both `PUBLIC_REMARK42_HOST` and `PUBLIC_REMARK42_SITE_ID` are set. Comments appear only on public posts.
- **Google Analytics 4:** Enabled by `PUBLIC_GA_MEASUREMENT_ID` and loaded only in production builds on pages not marked `noindex`. GA4 may use cookies; configure consent controls according to your audience and applicable laws.
- **Google Search Console:** Verify with a DNS TXT record or an HTML meta tag. After verification, submit `https://your-domain/sitemap-index.xml`.
- **Vercel Web Analytics / Speed Insights:** Available only on Vercel. The two options can be enabled independently. The template does not load their scripts unless enabled.

## 🌐 Deployment

MangaPaper outputs static files to `dist/`. Deploy to either Vercel or Cloudflare Pages.

### Vercel

Use the [one-click deployment link](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flavieio%2Fmanga-paper-template&project-name=manga-paper&repository-name=manga-paper&env=PRIVATE_PASSWORD,SITE_URL,PUBLIC_UNLOCK_TTL_HOURS&envDescription=PRIVATE_PASSWORD%20encrypts%20private%20posts%20%E2%80%94%20use%20a%20strong%20password%20before%20going%20live.%20SITE_URL%20is%20your%20real%20domain.%20PUBLIC_UNLOCK_TTL_HOURS%20is%20the%20unlock%20memory%20in%20hours%2C%20default%201.&envDefaults=%7B%22PUBLIC_UNLOCK_TTL_HOURS%22%3A%221%22%7D), or import your repository from the Vercel dashboard.

- Framework Preset: `Astro`
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js: `22` (or another supported `>=22 <25` version)

Set the production `SITE_URL`. If you use private posts, also set a strong `PRIVATE_PASSWORD`.

### Cloudflare Pages

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git**, then select your repository.
2. Build command: `npm run build`.
3. Build output directory: `dist`.
4. Add `NODE_VERSION=22` and any other required environment variables, then deploy.

For supported platforms, the build generates security-header configuration including HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, and CSP. The current CSP is in **Report-Only** mode: it reports policy issues but does not actively block resources.

## 🎨 Design and technology

### Design language

- **Dotted paper:** Tiny ink dots and a regular grid create the texture of paper.
- **Hard borders and shadows:** Thick ink-colored borders with directional offset shadows and no blur.
- **Sticker-like labels:** Slightly rotated colorful labels make content feel like notes arranged on paper.
- **Light and dark themes:** Both themes share the same layout structure.

### Project structure

```text
/
├── assets/fonts/                 # Upstream font files and license
├── public/                       # Static assets, icons, and README preview image
├── scripts/                      # Build checks, font generation, date handling, deployment config
├── src/
│   ├── components/               # Post cards, table of contents, comments, and more
│   ├── content/blog/             # Blog posts; first-level directories define categories
│   ├── content/pages/about.md    # About page content
│   ├── layouts/                  # Page layouts
│   ├── pages/                    # Routes, RSS, and OG share images
│   ├── plugins/                  # Content-processing plugins
│   ├── scripts/                  # Browser-side interactions
│   ├── styles/                   # Global, article, and component styles
│   └── utils/                    # helpers, grouped by domain
│       ├── og/                   # OG social cards: render pipeline and og:image policy
│       ├── content/              # post pipeline: loading, categories, formatting, reading time, structured data
│       ├── env/                  # environment variables, site URL, analytics
│       ├── deploy/               # security headers and deploy policy
│       ├── social/               # homepage entries and built-in icons
│       ├── crypto/               # private-post encryption
│       ├── image/                # remote image size probing
│       └── font/                 # font subset manifest (generated at build time)
├── manga-paper.config.ts         # Site and homepage shortcut configuration
├── astro.config.mjs
└── vercel.ts                     # Vercel project configuration
```

### Tech stack

- [Astro](https://astro.build/): Static site generation
- TypeScript: Site configuration and build scripts
- [Maple Mono NF CN](https://github.com/subframe7536/maple-font): Self-hosted monospace font under SIL OFL-1.1
- [Pagefind](https://pagefind.app/): Static full-text search
- [PhotoSwipe](https://photoswipe.com/): Image lightbox
- [Satori](https://github.com/vercel/satori) and [resvg-js](https://github.com/thx/resvg-js): Build-time OG image generation
- [remark42](https://remark42.com/): Optional comment system
- Web Crypto API: Private-post encryption

## ⚡ Performance

<p align="center">
  <a href="https://pagespeed.web.dev/analysis?url=https%3A%2F%2Flavieio.com%2F&form_factor=desktop">
    <img alt="PageSpeed Insights desktop test report" src="public/pagespeed-insights.png">
  </a>
</p>

The template aims to reduce the initial page load: fonts are self-hosted and subsetted for site content, image dimensions and OG share images are handled at build time, and optional third-party integrations are not loaded unless enabled. The screenshot above records one desktop PageSpeed Insights run; actual scores vary with deployment, page content, and test conditions.

## 💬 Feedback and license

Please use [GitHub Issues](https://github.com/lavieio/manga-paper-template/issues) for bug reports, suggestions, and feature requests.

- Template code: [MIT License](LICENSE)
- Release history: [CHANGELOG.md](CHANGELOG.md)
- Maple Mono NF CN font: [SIL Open Font License 1.1](https://github.com/subframe7536/maple-font)

---

Made with 🖤 by [lavieio](https://github.com/lavieio)
