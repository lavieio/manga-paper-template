---
title: 关于 MangaPaper
description: 一个漫画稿纸风格的开源博客模板——点阵纸底、墨色硬边、贴纸标签，全站等宽字体，纯静态零后端。
tags: [Astro, 开源, 模板, 私密]
featured: true
date: 2026-09-16
---

## 这是什么

MangaPaper 是一个**漫画稿纸风格**的博客模板。

## 特性一览

| 功能 | 说明 |
| --- | --- |
| 明暗双主题 | 首帧前决定主题，无闪烁；暗色只切换 CSS 变量 |
| 全站等宽字体 | Maple Mono NF CN，按 `unicode-range` 分片按需加载，带度量对齐 fallback |
| 首页精选轮播 | 纸片堆效果，自动播放 + 悬停双向联动；只有一篇时仍是同一套纸片样式，仅隐藏编号方块与自动播放 |
| 右侧目录 | sticky TOC，滚动高亮 + 朱砂竖条指示器；窄屏收进「目录」弹层 |
| 静态搜索 | Pagefind，支持中文，零后端 |
| 图片灯箱 | PhotoSwipe，点击才加载；构建期注入图片尺寸，无布局抖动 |
| 私密文章 | 构建期 AES-256-GCM 加密，页面只有密文；`/private` 加密入口页 |
| 归档 / 标签 / 分类 | 时间轴归档、标签云、分类页全部静态生成 |
| 评论 | remark42（可选，未配置则整块不渲染） |
| 日期自动化 | git 钩子注入 `date`、刷新 `updated`，支持 `[skip-updated]` |
| 构建产物断言 | `npm run verify` 校验「私密零泄漏、索引页数、关键产物」 |

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | Astro（纯静态，无 SSR adapter） |
| 语言 | TypeScript |
| 字体 | Maple Mono NF CN（OFL-1.1）+ ZeoSeven Fonts CDN |
| 搜索 | Pagefind |
| 灯箱 | PhotoSwipe |
| 评论 | remark42（可选） |
| 加密 | WebCrypto（PBKDF2 600k + AES-256-GCM） |
| 部署 | Cloudflare Pages 或 Vercel（二选一） |

## 目录结构

```bash
src/
├── content/blog/        # 文章：一级子目录名 = 分类
├── components/          # PostCard / FeaturedStack / TableOfContents / Comments …
├── layouts/Base.astro   # 布局：点阵稿纸底、主题切换、页头页脚
├── pages/               # index / posts / archive / tags / category / search / private / rss
├── styles/              # global / fonts / card / prose / private / lightbox
└── config.ts            # 站名 / 作者 / remark42 配置
```

## 快速开始

```bash
npm install
cp .env.example .env     # 按需填写
npm run dev              # http://localhost:4321
```

| 命令 | 作用 |
| --- | --- |
| `npm run build` | 构建静态站 + 生成搜索索引 → `dist/` |
| `npm run preview` | 预览构建产物（搜索在此可用） |
| `npm test` | 单元/集成测试（日期钩子、加密模块） |
| `npm run verify` | 产物断言：私密零泄漏、索引页数、关键产物 |

## 写一篇文章

在 `src/content/blog/技术/` 下新建 Markdown 文件即可，**目录名就是分类**，
**文件名就是 URL slug**：

```yaml
---
title: 标题
description: 摘要（用于 SEO、RSS 与卡片）
tags: [标签A, 标签B]
featured: true          # 可选：进首页精选
draft: true             # 可选：草稿
private: true           # 可选：私密
---
```

`date` / `updated` **不用手写**——提交时 git 钩子会处理：

| 提交信息 | 行为 |
| --- | --- |
| `feat(blog): 发布《标题》` | 新文章注入 `date`；修改现有文章刷新 `updated` |
| `fix(blog): 《标题》修正错别字` | 静默：不刷新 `updated` |
| 任意 type 加 `[skip-updated]` | 强制跳过 `updated` 刷新 |

## 私密文章怎么访问

### 访问方式

1. 打开站点，滚到**页脚**，点右下角的「**私密**」
2. 或者直接访问地址 **`/private`**
3. 输入密码 → 解锁后能看到全部私密文章列表，然后正常点进去阅读

解锁一次之后，同一浏览器在 `PUBLIC_UNLOCK_TTL_HOURS` 小时内（默认 **1 小时**）免重输；
过期或换设备会重新询问。

### 密码是多少

- **模板默认密码：`manga-paper`**

这个默认值写在代码里，任何人都能看到，所以它**只适合本地预览和公开演示**。
你自己的博客一定要在环境变量里改掉：

```
PRIVATE_PASSWORD=一段足够长的强密码
```

- 密码只在**构建时**使用（用来加密），从不出现在页面里
- 浏览器端用你输入的密码现场派生密钥（PBKDF2 60 万次迭代，约 1–3 秒），**密码不上传**
- 密码丢失无法恢复——只能改密码重新构建

### 顺便说清楚安全边界

私密文章不进列表 / 归档 / 标签 / 分类 / RSS / sitemap / 搜索索引，页面带 `noindex`；
`/private` 的清单本身也是密文，没解锁时连篇数都不会暴露。但有一条前提：

> ⚠️ **承载真实文章的仓库必须是私有的**。明文 Markdown 就躺在仓库里，仓库公开则加密毫无意义。

## 演示草稿与分类

本站放了几篇专门用来演示功能的文章：

- 想看**草稿**的规则，见 `draft: true` 的那篇（它不会出现在任何列表里，构建产物里连一个字节都没有）
- 想看**分类**怎么由目录推导出来，见「随笔」分类下那篇
- 想看**私密**的完整效果，就是你在 `/private` 里读到的那篇

## 部署

- **Vercel**：Add New → Project 选仓库；Framework 选 Astro，Build Command `npm run build`，Output Directory `dist`
- **Cloudflare Pages**：Workers & Pages → Create → Pages → Connect to Git；Build command `npm run build`，Output directory `dist`，并加环境变量 `NODE_VERSION=22`

环境变量（见 `.env.example`）：`PRIVATE_PASSWORD`、`PUBLIC_UNLOCK_TTL_HOURS`、
`SITE_URL`，以及 remark42 的 `PUBLIC_REMARK42_HOST` / `PUBLIC_REMARK42_SITE_ID`。

## 链接

- 仓库与文档：<https://github.com/lavieio/manga-paper-template>
- 问题反馈：<https://github.com/lavieio/manga-paper-template/issues>
- 许可：代码 MIT；字体 [Maple Mono NF CN](https://github.com/subframe7536/maple-font) 为 OFL-1.1

慢一点，稳一点，像稿纸一样。
