---
title: 分类是由文件夹决定的
description: 文章放在哪个目录，就属于哪个分类——不用写 category 字段，导航和分类页会自动生成。
tags: [工作流, 示例]
date: 2026-09-16
---

## 目录即分类

这篇文章住在 `src/content/blog/随笔/` 里，所以它的分类就是「随笔」——
frontmatter 里一个字都没写。

```
src/content/blog/
├── 技术/        → 分类「技术」
│   ├── about-manga-paper.md
│   └── private-posts.md
└── 随笔/        → 分类「随笔」
    └── category-demo.md   ← 就是这篇
```

想换个分类？把文件移到另一个目录就行。想加一个新分类？新建一个目录。
不用改配置，不用注册枚举。

## 分类会自己长出来

- 列表页顶部的筛选条会列出**已发布文章中出现过的所有分类**
- `/category/技术`、`/category/随笔` 都是构建时静态生成的独立页面，可以直接分享
- 构建日志会打印一份分类清单，笔误一眼就能看到：

```
[content] distinct categories: 技术 / 随笔
```

## 想强制指定分类

在 frontmatter 里写 `category` 即可覆盖目录推导：

```yaml
category: 随便什么名字
```

不过多数时候，直接移动文件更省事。

## 关于标签

分类是「一个」，标签是「多个」。标签写在 frontmatter 里：

```yaml
tags: [工作流, 示例]
```

标签云按文章数量自动分档字号——写得多的标签字更大。
