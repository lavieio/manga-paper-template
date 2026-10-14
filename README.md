# MangaPaper 🖋

![MangaPaper preview](public/og.png)

![Astro](https://img.shields.io/badge/Astro-7.x-FF5D01?style=for-the-badge&logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-2F3741?style=for-the-badge)

**简体中文** · [English](README.en.md)

MangaPaper 是一个漫画稿纸风格的开源博客模板。点阵纸背景、墨色硬边框、偏移硬阴影和贴纸式标签共同构成独特的视觉语言，搭配全站等宽字体与明暗主题。

基于 Astro 输出纯静态站点，无需自建应用服务器。你可以从 Markdown 写作开始，也可以按需启用私密文章、评论、访问统计和搜索引擎验证。

[在线示例](https://blog.lavieio.com) · [使用此模板](https://github.com/lavieio/manga-paper-template/generate) · [反馈问题](https://github.com/lavieio/manga-paper-template/issues)

## ✨ 功能亮点

- **漫画稿纸视觉**：点阵背景、硬边框、单向硬阴影、贴纸标签，以及明暗双主题。
- **自托管字体**：使用 Maple Mono NF CN；构建时根据内容生成字体子集，避免依赖第三方字体 CDN。
- **完整的博客内容组织**：精选文章、分类、标签、归档时间轴、草稿和分页（每页 8 篇）。
- **更舒适的阅读体验**：文章目录与滚动高亮、代码块一键复制、PhotoSwipe 图片灯箱，以及构建期图片尺寸处理以减少布局偏移。
- **静态全文搜索**：集成 Pagefind，支持中文检索；搜索索引在构建时生成。
- **SEO 与分享卡片**：自动生成 sitemap、RSS、robots.txt；为公开文章生成 1200 × 630 OG 分享图。草稿和私密文章不会进入公开索引或生成分享图。
- **私密文章**：构建时使用 AES-256-GCM 加密，静态站点只发布密文；访客通过 `/private` 页面输入密码后在浏览器中解密。
- **按需启用的集成**：remark42 评论、Google Analytics 4、Google Search Console 验证，以及 Vercel Web Analytics / Speed Insights。
- **静态托管友好**：支持 Vercel 与 Cloudflare Pages；根据环境变量生成相应的安全响应头配置。

## 🚀 快速开始

**环境要求：Node.js `>=22 <25`。**

### 1. 创建自己的仓库

推荐点击 [Use this template](https://github.com/lavieio/manga-paper-template/generate) 创建独立仓库。若计划发布私密文章，请将新仓库设为 **Private**。

也可以直接克隆本项目进行主题开发：

```bash
git clone https://github.com/lavieio/manga-paper-template.git my-blog
cd my-blog
npm install
```

### 2. 配置环境变量并启动

```bash
cp .env.example .env
```

编辑 `.env`，将 `SITE_URL` 设置为本地地址或正式站点根地址：

```dotenv
SITE_URL=http://localhost:4321
```

启动开发服务器：

```bash
npm run dev
```

然后访问 [http://localhost:4321](http://localhost:4321)。开发模式下尚未生成 Pagefind 搜索索引，因此搜索功能需要通过构建后的预览环境测试。

> **部署前请务必修改 `SITE_URL`。** 如果缺少该变量、URL 格式无效或仍使用示例域名，`npm run build` 会失败。

## 🎛 站点配置

站名、作者、一句话简介、社交入口、分页篇数都在仓根一个文件里：**`manga-paper.config.ts`**。

```ts
import { defineConfig } from "./src/types/config";

export default defineConfig({
  site: {
    name: "MangaPaper",
    tagline: "A loose-leaf, comic-paper, monospace blog theme",
    author: "lavie",
    bio: "漫画稿纸风格的开源博客模板",
  },
  posts: {
    perPage: 8,       // 列表分页每页篇数
    recentCount: 3,   // 首页「最近更新」条数
  },
  // 你的入口列表：首页贴纸条用它，顺序即展示顺序
  socials: [
    { label: "GitHub", url: "https://github.com/you/repo", icon: "github", primary: true },
    { label: "邮箱",    url: "mailto:yourmail@gmail.com",   icon: "mail" },
    { label: "微博",    url: "https://weibo.com/you",       icon: "weibo" },
    { label: "友链",    url: "https://example.com",         icon: "/icons/friend.svg" },
  ],
});
```

| 字段 | 说明 |
| --- | --- |
| `site.name` / `site.tagline` | 站点名与一句话简介：页头、`<title>`、RSS、分享卡片都用它 |
| `site.author` / `site.bio` | 关于页 meta description 的兜底，也是站点默认分享卡的第二行 |
| `posts.perPage` / `posts.recentCount` | 列表分页篇数 / 首页「最近更新」条数 |
| `socials[]` | 入口列表：`label` 显示文字、`url` 跳转地址、`icon` 图标、`primary` 主入口（墨底纸字，最多一个） |

`socials` 只出现在**首页贴纸条**（关于页不放入口条）；RSS 由模板固定追加在末尾，不用自己写：

| 位置 | 展示内容 |
| --- | --- |
| 首页贴纸条 | `socials` → RSS |
| 页脚 | RSS 与私密文章入口（模板自带，不写进 `socials`） |

`icon` 三种写法都认，认不出或没填就是通用外链图标（不会留空）：

| 写法 | 例子 | 说明 |
| --- | --- | --- |
| 内置名 | `icon: "github"` | 仓内维护的 23 个单色图标，颜色跟随主题 |
| 站内图片 | `icon: "/icons/weibo.svg"` | 文件放 `public/icons/` 下；`.svg` / `.png` / `.webp` 都行 |
| 外链图片 | `icon: "https://cdn.example.com/x.png"` | 走 https；当前 CSP 的 `img-src` 已放行任意 https 图片 |

内置图标名：`github`、`x`、`facebook`、`instagram`、`linkedin`、`telegram`、`youtube`、`reddit`、`discord`、
`mastodon`、`bluesky`、`threads`、`rss`、`weibo`、`zhihu`、`bilibili`、`wechat`、`douban`、`juejin`、`gitee`、
`mail`、`link`、`seal`。路径取自 [simple-icons](https://github.com/simple-icons/simple-icons)（CC0-1.0），
原样内联在 `src/utils/social-icons.ts`，不引依赖、不发请求。

> 部署期与密钥类的配置不走这个文件，走 `.env`（见下方「环境变量」）。
> `label` 或 `url` 留空、`url` 里带空白字符，都会让构建直接失败并指出是第几条。

## 🧰 常用命令

在项目根目录执行：

| 命令 | 作用 |
| --- | --- |
| `npm install` | 安装依赖，并安装 Git hooks |
| `npm run dev` | 启动本地开发服务器 |
| `npm run fonts` | 根据当前内容生成字体子集；开发和构建流程会自动调用 |
| `npm run build` | 构建静态站点、字体、分享卡片、部署配置和 Pagefind 搜索索引，输出到 `dist/` |
| `npm run preview` | 本地预览构建产物；此模式下可测试搜索 |
| `npm run astro ...` | 调用 Astro CLI，例如 `npm run astro add` |

## 📝 编写文章

所有文章放在 `src/content/blog/`。**一级子目录名就是分类，文件名就是 URL slug**。例如 `src/content/blog/tech/hello-world.md` 会归入 `tech` 分类。

文章使用 Markdown，并通过 frontmatter 设置元信息：

```yaml
---
title: 文章标题
description: 用于 SEO、RSS 和分享卡片的摘要
tags: [技术, 随笔]
featured: true       # 可选：加入首页精选轮播
draft: false         # 可选：true 时构建时排除
private: false       # 可选：true 时作为私密文章加密
cover: /images/cover.png  # 可选：封面图片
---

正文从这里开始。
```

`date` 和 `updated` 通常无需手动维护，Git hook 会根据提交信息自动处理：

| 提交信息示例 | 行为 |
| --- | --- |
| `feat(blog): 发布新文章` | 新文章自动写入 `date`；已有文章更新 `updated` |
| `fix(blog): 修正文章错字` | 不刷新 `updated`；`chore` 提交同样如此 |
| 提交信息包含 `[skip-updated]` | 强制跳过 `updated` 刷新 |

## 📄 关于页

关于页的正文是**内容**，不是配置，所以它住在 `src/content/pages/about.md` 里，跟文章同一套写法：
Markdown、HTML、`<style>` 都能写。`src/pages/about.astro` 只是个壳（套布局 + 渲染 h1 + 放正文）。

```md
---
title: 关于
description: 页面 meta description；不写就回落到 site.bio
prose: true
stats: true
---

正文从 `##` 起（`#` 会被渲染成第二个 h1，构建期断言会红）。

## 我在做什么

- 第一件事
- 第二件事

<!-- 想画自定义版式就直接写 HTML + <style> -->
<div class="intro">
  <img src="/images/me.png" alt="" width="170" height="200">
  <p>左边是图、右边是字，用 grid 摆一下就行。</p>
</div>

<style>
.intro { display: grid; grid-template-columns: 170px 1fr; gap: 36px; }
</style>
```

| 你写的 | 模板做的 |
| --- | --- |
| Markdown | 走文章那条渲染管线，套上 `.prose` 排版 |
| HTML | 原样输出，想画什么版式都行 |
| `<style>` | 自动包进 `@scope (.about-custom)`，裸类名漏不到页头页脚 |

几条约定：

- **颜色用 token**（`var(--ink)` / `var(--card)` / `var(--red)` / `var(--yellow)` …），暗色会自动跟着走；写死 `#000` 在暗色下会瞎。
- **`prose` 开关**：默认 `true`，正文套文章排版（`.prose`：字号 16px / 行高 1.9、h2 带 3px 墨色下划线、h3 前缀朱砂 `§`、引用是粉底卡片、行内代码是带框小方块、表格黄底表头、代码块 3px 墨框 + 硬阴影）。整页都自己写 CSS 时设成 `false`，免得两套样式打架。
- **`stats` 开关**：默认 `true`，正文下方显示站点统计条（文章 / 分类 / 标签数，构建期算出来的）。设成 `false` 就只渲染你的正文。
- **不要写 `<script>`**：技术上会执行，但不走 Astro 打包、破坏「零 JS」的承诺，也不在模板的兼容范围内。
- **手写 `<img>` 记得带 `width` / `height`**：Markdown 语法的图片会自动补尺寸并接上灯箱，手写的不保证。

## 🔒 私密文章

1. 在 `.env` 或部署平台环境变量中设置 `PRIVATE_PASSWORD`，上线前必须替换示例密码。
2. 在文章 frontmatter 中设置 `private: true`。
3. 部署后，读者可通过页脚的“私密”入口进入 `/private`，输入密码后在浏览器中查看内容。

实现使用 PBKDF2（SHA-256，600,000 次迭代）派生密钥，并使用 AES-256-GCM 加密。解锁状态默认保存在浏览器 `localStorage` 中 1 小时，可通过 `PUBLIC_UNLOCK_TTL_HOURS` 调整。

私密文章会从公开列表、归档、标签、分类、RSS、sitemap 和搜索索引中排除，相关页面也会标记为 `noindex`。

> **重要：** 请将存放真实私密文章的 Git 仓库设为 Private。`noindex` 只是搜索引擎提示，不是访问控制；密码遗失后无法恢复内容。

## ⚙️ 环境变量

`.env.example` 列出了所有配置项；`.env` 已加入 `.gitignore`，不要提交真实密码或其他敏感值。

| 变量 | 说明 |
| --- | --- |
| `SITE_URL` | **必填。** 站点根 URL，用于 canonical、sitemap 和 RSS。生产构建不能使用示例域名。 |
| `PRIVATE_PASSWORD` | 私密文章加密密码。默认值 `manga-paper` 仅适合本地预览；上线前请替换为强密码。 |
| `PUBLIC_UNLOCK_TTL_HOURS` | 浏览器记住私密文章解锁状态的小时数，默认 `1`。 |
| `SKIP_REMOTE_IMAGE_SIZE` | 可选。设为 `1` 可跳过构建时的外链图片尺寸探测，适合离线或外链不可访问的环境。 |
| `PUBLIC_REMARK42_HOST` / `PUBLIC_REMARK42_SITE_ID` | 可选。两项都配置后才会显示 remark42 评论区。 |
| `PUBLIC_GA_MEASUREMENT_ID` | 可选。GA4 Measurement ID，例如 `G-XXXXXXXXXX`；未配置时不会加载 GA4。 |
| `PUBLIC_GSC_VERIFICATION` | 可选。Google Search Console HTML 标记验证值；使用 DNS TXT 验证时不需要。 |
| `PUBLIC_VERCEL_ANALYTICS` | 可选，仅 Vercel。设为 `1` 启用 Vercel Web Analytics，并先在项目面板启用该功能。 |
| `PUBLIC_VERCEL_SPEED_INSIGHTS` | 可选，仅 Vercel。设为 `1` 启用 Speed Insights，并先在项目面板启用该功能。 |

### 可选集成说明

- **remark42**：同时配置 `PUBLIC_REMARK42_HOST` 与 `PUBLIC_REMARK42_SITE_ID` 后启用。评论区只出现在公开文章中。
- **Google Analytics 4**：配置 `PUBLIC_GA_MEASUREMENT_ID` 后启用；只在生产构建且非 `noindex` 页面加载。GA4 会使用 Cookie，如需访客同意机制，请自行配置。
- **Google Search Console**：可使用 DNS TXT（推荐）或 HTML meta 标记验证。验证成功后提交 `https://你的域名/sitemap-index.xml`。
- **Vercel Web Analytics / Speed Insights**：仅适用于部署在 Vercel 的站点；两个开关可以独立启用。未配置统计功能时，模板不会主动加载相应脚本。

## 🌐 部署

项目输出纯静态文件，构建产物目录为 `dist/`。请选择一个平台部署即可。

### Vercel

可以使用 [Vercel 一键部署入口](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flavieio%2Fmanga-paper-template&project-name=manga-paper&repository-name=manga-paper&env=PRIVATE_PASSWORD,SITE_URL,PUBLIC_UNLOCK_TTL_HOURS&envDescription=PRIVATE_PASSWORD%20encrypts%20private%20posts%20%E2%80%94%20use%20a%20strong%20password%20before%20going%20live.%20SITE_URL%20is%20your%20real%20domain.%20PUBLIC_UNLOCK_TTL_HOURS%20is%20the%20unlock%20memory%20in%20hours%2C%20default%201.&envDefaults=%7B%22PUBLIC_UNLOCK_TTL_HOURS%22%3A%221%22%7D)，也可以在 Vercel 控制台导入你自己的仓库。

- Framework Preset：`Astro`
- Build Command：`npm run build`
- Output Directory：`dist`
- Node.js：`22`（或项目支持的其他 `>=22 <25` 版本）

请在项目环境变量中设置正式的 `SITE_URL`。如果使用私密文章，也要设置强密码 `PRIVATE_PASSWORD`。

### Cloudflare Pages

1. 在 Cloudflare 控制台打开 **Workers & Pages → Create → Pages → Connect to Git**，选择你的仓库。
2. Build command：`npm run build`。
3. Build output directory：`dist`。
4. 添加环境变量 `NODE_VERSION=22`，并根据需要配置上方列出的其他变量，然后部署。

模板会为支持的平台准备安全响应头配置，包括 HSTS、`X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options`、`Permissions-Policy` 和报告模式的 CSP。配置会在构建时生成；当前 CSP 为 Report-Only，只报告问题，不会主动拦截资源。

## 🎨 设计与技术

### 设计语言

- **点阵稿纸**：以细小墨点和规则网格构成纸张质感。
- **硬边与硬阴影**：粗墨色边框搭配单方向偏移阴影，不使用模糊效果。
- **贴纸式标签**：略微旋转的彩色分类标签，让内容像整理在稿纸上的便签。
- **明暗主题**：切换主题时复用相同的布局结构。

### 项目结构

```bash
/
├── assets/
│   └── fonts/                  # 完整字体：上游 TTF + LICENSE（OFL-1.1；构建期从这里切子集）
├── public/
│   ├── fonts/                  # 字体子集产物（npm run fonts 生成，不进仓）
│   ├── og.png                  # README 头图（站点默认卡片的快照；卡片本体由 /og/*.png 构建期生成）
│   └── favicon.svg             # 朱砂印章
├── scripts/
│   ├── build-deploy-config.ts  # 生成 dist/_headers + dist/_redirects
│   ├── build-fonts.ts          # 生成自托管字体子集（npm run fonts）
│   ├── frontmatter-dates.ts    # git 钩子：date / updated 自动注入
│   └── preflight.ts            # 构建前必须通过的检查（目前是 SITE_URL）
├── src/
│   ├── components/             # PostCard / FeaturedStack / TableOfContents / Comments …
│   ├── content/blog/           # 文章：一级子目录名 = 分类
│   ├── content/pages/about.md  # 关于页正文：Markdown / HTML / <style> 都能写
│   ├── layouts/Base.astro      # 布局：点阵稿纸底、主题切换、页头页脚
│   ├── pages/                  # index / posts / archive / tags / category / search / private / about / rss / og（分享卡片）
│   ├── plugins/                # rehype 图片尺寸/懒加载注入、代码复制按钮、私密与草稿扫描
│   ├── scripts/                # 灯箱、TOC、私密解锁与密钥缓存（客户端）
│   ├── styles/                 # global / fonts / card / prose / private / lightbox
│   ├── utils/                  # 内容管线、加密、格式与阅读时长、响应头策略、og 卡片（版式/文本/装饰/字体子集）
│   ├── types/config.ts         # 用户配置的类型契约（MangaPaperConfig / defineConfig）
│   ├── config.ts               # 内部已解析配置：读 manga-paper.config.ts + 合并 env；消费方只认这里
│   └── content.config.ts       # 内容 schema（zod）
├── manga-paper.config.ts       # 站名 / 作者 / 一句话简介 / 社交入口 / 分页篇数（使用者唯一入口）
├── vercel.ts                   # Vercel 项目配置（Vercel 构建时执行，自己读 env；不存生成物）
└── astro.config.mjs
```

所有文章放在 `src/content/blog/` 下，**一级子目录名即分类**（`blog/技术/xxx.md` → 分类「技术」），文件名即 URL slug。

### 技术栈

- [Astro](https://astro.build/)：静态站点生成
- TypeScript：配置与构建脚本
- [Maple Mono NF CN](https://github.com/subframe7536/maple-font)：自托管等宽字体，采用 SIL OFL-1.1 许可证
- [Pagefind](https://pagefind.app/)：静态搜索
- [PhotoSwipe](https://photoswipe.com/)：图片灯箱
- [Satori](https://github.com/vercel/satori) 与 [resvg-js](https://github.com/thx/resvg-js)：构建期生成 OG 分享图
- [remark42](https://remark42.com/)：可选评论系统
- Web Crypto API：私密文章加密

### 性能

<p align="center">
  <a href="https://pagespeed.web.dev/analysis?url=https%3A%2F%2Flavieio.com%2F&form_factor=desktop">
    <img alt="PageSpeed Insights：性能、无障碍、最佳做法与 SEO 均为满分" src="public/pagespeed-insights.png">
  </a>
</p>

PageSpeed Insights 各项均为满分：运行时没有阻塞渲染的第三方脚本，字体按需加载子集，图片尺寸与分享卡片都在构建期完成，站点只发布静态文件。点击截图可查看完整报告。

## 💬 反馈与许可

欢迎通过 [GitHub Issues](https://github.com/lavieio/manga-paper-template/issues) 提交问题、建议或功能请求。

- 模板代码： [MIT License](LICENSE)
- Maple Mono NF CN 字体： [SIL Open Font License 1.1](https://github.com/subframe7536/maple-font)

---

Made with 🖤 by [lavieio](https://github.com/lavieio)
