# MangaPaper 🖋
![MangaPaper](public/default-og.svg)

![Astro](https://img.shields.io/badge/Astro-7.x-FF5D01?style=for-the-badge&logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-2F3741?style=for-the-badge)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white&style=for-the-badge)](https://conventionalcommits.org)

**简体中文** · [English](README.en.md)

MangaPaper 是一个**漫画稿纸风格**的开源博客模板：点阵纸底、墨色硬边框、单边硬阴影、随手贴的彩色贴纸，
全站等宽字体（Maple Mono NF CN），明暗双主题。纯静态、零后端、零前端框架。

## 🔥 Features

- [x] 稿纸 × 漫画设计语言，全站等宽字体
- [x] **私密文章**：构建期 AES-256-GCM 加密，页面只存密文；`/private` 加密入口页
- [x] 文章目录（右侧 sticky TOC，滚动高亮 + 朱砂指示条）
- [x] 首页 Featured 纸片堆轮播
- [x] static search（[Pagefind](https://pagefind.app/)，支持中文）
- [x] 归档时间轴 / 标签云 / 分类页
- [x] draft posts & pagination（每页 8 篇）
- [x] sitemap & rss feed（私密与草稿自动排除）
- [x] 评论（[remark42](https://remark42.com/)，可选；未配置则整块不渲染）
- [x] 日期自动化：git 钩子注入 `date` / 刷新 `updated`
- [x] 一键部署（Vercel / Cloudflare Pages）

## 🚀 Project Structure

```bash
/
├── public/
│   ├── default-og.svg          # README 头图 / 社交分享图
│   └── favicon.svg             # 朱砂印章
├── scripts/
│   ├── frontmatter-dates.ts    # git 钩子：date / updated 自动注入
│   └── verify-dist.ts          # 构建产物断言（npm run verify）
├── src/
│   ├── components/             # PostCard / FeaturedStack / TableOfContents / Comments …
│   ├── content/blog/           # 文章：一级子目录名 = 分类
│   ├── layouts/Base.astro      # 布局：点阵稿纸底、主题切换、页头页脚
│   ├── pages/                  # index / posts / archive / tags / category / search / private / rss
│   ├── plugins/                # rehype 图片尺寸注入、内容扫描
│   ├── scripts/                # 灯箱、TOC、私密解锁与密钥缓存（客户端）
│   ├── styles/                 # global / fonts / card / prose / private / lightbox
│   ├── utils/                  # 内容管线、加密、格式与阅读时长
│   ├── config.ts               # 站名 / 作者 / remark42 配置（唯一站点入口）
│   └── content.config.ts       # 内容 schema（zod）
└── astro.config.mjs
```

所有文章放在 `src/content/blog/` 下，**一级子目录名即分类**（`blog/技术/xxx.md` → 分类「技术」），
文件名即 URL slug。

## 💻 Tech Stack

- **框架** — [Astro](https://astro.build/)（`output: 'static'`，无 SSR adapter）
- **源码语言** — TypeScript（Node 原生类型剥离，构建前无需编译步骤）
- **字体** — [Maple Mono NF CN](https://github.com/subframe7536/maple-font)（OFL-1.1）+ [ZeoSeven Fonts CDN](https://fonts.zeoseven.com/items/442/)
- **静态搜索** — [Pagefind](https://pagefind.app/)
- **灯箱** — [PhotoSwipe](https://photoswipe.com/)
- **评论** — [remark42](https://remark42.com/)（自托管，可选）
- **加密** — WebCrypto（PBKDF2 600k + AES-256-GCM）
- **Git 钩子** — [husky](https://typicode.github.io/husky/)
- **部署** — [Cloudflare Pages](https://pages.cloudflare.com/) 或 [Vercel](https://vercel.com/)（二选一）

## 👨🏻‍💻 Running Locally

要求 **Node ≥ 22**（见 `.nvmrc`）。

```bash
# 方式一：直接克隆（改主题用）
git clone https://github.com/lavieio/manga-paper-template.git my-blog
cd my-blog && npm install

# 方式二：以本仓为模板创建自己的仓库（写博客用，推荐 Private）
# GitHub 上打开 https://github.com/lavieio/manga-paper-template/generate 或点 README 的 Use this template

cp .env.example .env          # 按需填写，见「环境变量」
npm run dev                   # http://localhost:4321
```

> 开发模式下搜索无索引（Pagefind 在构建后产出），搜索页会给出明确提示——属正常现象。

## 🧞 Commands

所有命令在项目根目录执行：

| Command | Action |
| :--------------- | :------------------------------------------------------------------- |
| `npm install` | 安装依赖（会通过 husky 安装 git 钩子） |
| `npm run dev` | 本地开发服务器 `localhost:4321` |
| `npm run build` | 构建静态站 + 生成 Pagefind 索引 → `dist/` |
| `npm run preview` | 预览构建产物（搜索在此可用） |
| `npm test` | 单元/集成测试（日期钩子、加密模块往返） |
| `npm run verify` | 产物断言：私密零泄漏、Pagefind 页数、关键产物（构建后运行） |
| `npm run astro ...` | Astro CLI（`astro add` 等） |

## 📖 写文章

```yaml
---
title: 标题
description: 摘要（用于 SEO、RSS 与卡片）
tags: [标签, 可以有多个]
featured: true          # 可选：进首页精选轮播
draft: true             # 可选：草稿，构建时排除且不注入 date
private: true           # 可选：私密文章（见下）
cover: /cover.png       # 可选
---
```

`date` / `updated` **不必手写**——提交时 git 钩子自动处理：

| 提交信息 | 行为 |
| :--- | :--- |
| `feat(blog): 发布《标题》` | 新文章注入 `date`；修改现有文章刷新 `updated` |
| `fix(blog): 《标题》修正错别字` | 静默：不刷新 `updated`（`chore` 同理） |
| 任意 type 加 `[skip-updated]` | 强制跳过 `updated` 刷新 |

工作区、暂存区、提交三者始终一致；`git add -p` 半成品暂存会被拒绝；时区固定 `Asia/Shanghai`。

## 🔒 私密文章

1. 在 `.env` 设置 `PRIVATE_PASSWORD`（**上线必须改成强密码**；缺省回落 `manga-paper` 并构建告警）
2. 文章 frontmatter 加 `private: true`
3. 访客从页脚「私密」进入 `/private` 入口页，输一次密码即可看完整列表与正文

- 加密：PBKDF2（SHA-256，600,000 次）+ AES-256-GCM，密钥在浏览器本地派生，**密码不上传**
- 私密文章不进列表 / 归档 / 标签 / 分类 / RSS / sitemap / 搜索索引；页面 `noindex`
- 解锁缓存在 localStorage，时长由 `PUBLIC_UNLOCK_TTL_HOURS` 控制（默认 1 小时）
- ⚠️ 前提：**承载真实文章的仓库必须私有**；密码丢失无法恢复

## 🎨 设计语言

- **点阵稿纸底**：22px 网格 1.2px 墨点（`radial-gradient` repeat）
- **硬边硬阴影**：3px 墨色实线边框 + `4px 4px 0` 单方向硬阴影（零高斯模糊）
- **贴纸标签**：小字、±1.5° 微旋、按内容分主题色（技术=青 / 随笔=粉 / 摄影=黄 / 其他=蓝）
- **字体**：Maple Mono NF CN 全站等宽；暗色只切换 CSS 变量值，不改结构

## 🌐 部署

两个平台共用同一份 `dist/`，**只部署其中一个**即可，无需任何平台专属配置文件。

### Vercel 部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flavieio%2Fmanga-paper-template&project-name=manga-paper&repository-name=manga-paper&env=PRIVATE_PASSWORD,SITE_URL,PUBLIC_UNLOCK_TTL_HOURS&envDescription=PRIVATE_PASSWORD%20%E7%94%A8%E4%BA%8E%E7%A7%81%E5%AF%86%E6%96%87%E7%AB%A0%E5%8A%A0%E5%AF%86%EF%BC%8C%E4%B8%8A%E7%BA%BF%E5%8A%A1%E5%BF%85%E6%94%B9%E4%B8%BA%E5%BC%BA%E5%AF%86%E7%A0%81%EF%BC%9BSITE_URL%20%E5%A1%AB%E4%BD%A0%E7%9A%84%E7%9C%9F%E5%AE%9E%E5%9F%9F%E5%90%8D%EF%BC%9BPUBLIC_UNLOCK_TTL_HOURS%20%E6%98%AF%E8%A7%A3%E9%94%81%E8%AE%B0%E5%BF%86%E6%97%B6%E9%95%BF%EF%BC%88%E5%B0%8F%E6%97%B6%EF%BC%89%EF%BC%8C%E9%BB%98%E8%AE%A4%201%E3%80%82&envDefaults=%7B%22PUBLIC_UNLOCK_TTL_HOURS%22%3A%221%22%7D)

- **一键部署**（上面的按钮）：登录 → 把仓库复制到你的账号（要写私密文章请选 **Private**）→ 按提示填环境变量 → 部署
- **仪表盘导入**：Vercel → **Add New → Project** 选仓库；Framework 选 Astro，Build Command `npm run build`，Output Directory `dist`，Node 22

也可以先点 [**Use this template**](https://github.com/lavieio/manga-paper-template/generate) 在 GitHub 上建仓（推荐选 **Private**），再回到 Vercel 导入。

### Cloudflare Pages 部署

1. Cloudflare 仪表盘 → **Workers & Pages → Create → Pages → Connect to Git**，选中你的仓库
2. 构建设置：Build command `npm run build`，Output directory `dist`
3. 环境变量：至少加 `NODE_VERSION=22`（以及环境变量表中的其它项）
4. 保存并部署

### 环境变量

| 变量 | 用途 |
| :--- | :--- |
| `PRIVATE_PASSWORD` | 私密文章加密密码（构建期；缺省 `manga-paper` 仅本地可用） |
| `PUBLIC_UNLOCK_TTL_HOURS` | 私密解锁记忆时长（小时），默认 1 |
| `SITE_URL` | 站点根 URL（canonical / sitemap / RSS 的唯一真源） |
| `PUBLIC_REMARK42_HOST` / `PUBLIC_REMARK42_SITE_ID` | remark42 评论（可选，两项配齐才生效） |

`.env` 已在 `.gitignore` 中，`.env.example` 随仓库分发。

## 📝 评论（可选）

配置 `PUBLIC_REMARK42_HOST` / `PUBLIC_REMARK42_SITE_ID` 后，公开文章底部渲染 remark42：

- **两项缺一 → 整个评论区不渲染**（不留空壳）；私密文章永不挂评论
- 懒加载（滚动接近时才注入脚本）；界面中文；**明暗主题跟随站点**
- ⚠️ remark42 在跨源 iframe 中渲染（样式隔离），页面 CSS 无法覆盖。想让它与稿纸风完全一致，
  只能在自托管侧反代替换其样式表或重建前端——模板不提供此能力

## 🔤 字体

默认走 [ZeoSeven Fonts CDN](https://fonts.zeoseven.com/items/442/)（cn-font-split 分包、OFL-1.1、hinted），
无需自托管字体文件。只加载 4 个字重（正文 400 / 引用斜体 400i / 贴纸 600 / 标题 700），
并以非阻塞方式加载（`preload` + `onload` 切 `rel`，`<noscript>` 兜底）。

想改为自托管：下载 Maple Mono NF CN 并自行分片，产出 `public/fonts/**` 后，把 `src/layouts/Base.astro`
里的 CDN `<link>` 换成自托管 `@font-face`（保留 `src/styles/fonts.css` 的 fallback 度量对齐）。
也可用 ZeoSeven 官方 [ZSFT CLI](https://fonts.zeoseven.com/docs/cli/) 做私有部署。离线开发时字体
回落到度量对齐后的 Consolas。

## ✨ Feedback & Suggestions

有建议或反馈请开 [issue](https://github.com/lavieio/manga-paper-template/issues)；若发现 bug 或想加功能，同样欢迎。

## 📜 License

- 模板代码：[MIT](LICENSE)
- 字体 [Maple Mono NF CN](https://github.com/subframe7536/maple-font)：**OFL-1.1**

---

Made with 🖤 by [lavieio](https://github.com/lavieio)
