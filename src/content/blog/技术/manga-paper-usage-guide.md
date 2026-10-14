---
title: MangaPaper 使用指南：从改配置到部署上线
description: 从创建仓库、配置站点信息与关于页，到编写文章、设置环境变量，再到部署至 Vercel 或 Cloudflare Pages，一步步搭建自己的 MangaPaper 博客。
tags: [博客, 开源]
date: 2026-10-14
---

[上一篇文章](/posts/about-manga-paper)介绍了 MangaPaper 的设计理念与核心功能。这一篇换个角度，只讲一件事：**怎样把 MangaPaper 变成你自己的博客。**

整个过程可以分为几个步骤：创建仓库、本地运行、修改配置、编写文章，最后部署上线。如果只是修改基本信息并完成部署，通常很快就能跑起来；关于页定制、评论和统计等功能，则可以根据需要逐步完善。

## 一、创建自己的仓库

首先，推荐使用 GitHub 的 [Use this template](https://github.com/lavieio/manga-paper-template/generate) 功能创建独立仓库，而不是直接 Fork。

两种方式都能获得项目代码，但通过模板创建的新仓库不会继承模板仓库的提交历史，更适合将它作为一个独立的博客项目长期维护。

**如果你打算写私密文章，请在创建仓库时选择 Private。** 私密文章虽然会在构建阶段加密，发布到网站上的也是密文，但原始 Markdown 在仓库中始终是明文。仓库权限是保护源文件的重要一环，不能只依赖页面加密。

创建完成后，将自己的仓库克隆到本地并安装依赖：

```bash
git clone https://github.com/<你的用户名>/<你的仓库名>.git my-blog
cd my-blog
npm install
```

如果你只是想阅读源码、修改主题或参与开发，也可以直接克隆模板仓库：

```bash
git clone https://github.com/lavieio/manga-paper-template.git my-blog
cd my-blog
npm install
```

两种方式使用的项目代码相同。区别在于，前者从一开始就属于你自己的仓库，后者则更适合主题开发和源码研究。

## 二、在本地运行

MangaPaper 要求 **Node.js `>=22 <25`**，仓库中的 `.nvmrc` 指定了 Node.js 22。

安装依赖后，复制环境变量示例文件：

```bash
cp .env.example .env
```

打开 `.env`，先将站点地址设置为本地开发地址：

```dotenv
SITE_URL=http://localhost:4321
```

然后启动开发服务器：

```bash
npm run dev
```

访问 `http://localhost:4321`，即可看到本地运行的博客。

这里有一个容易遇到的小问题：**开发模式下搜索没有索引，并不是配置失败。**

MangaPaper 使用 Pagefind 提供静态全文搜索，搜索索引在执行 `npm run build` 后生成。因此，开发服务器中的搜索暂时不可用属于正常现象。

如果想验证搜索功能，可以先构建项目，再运行预览服务器：

```bash
npm run build
npm run preview
```

这样测试的就是实际构建产物，而不是没有搜索索引的开发环境。

## 三、把站点改成你自己的

站点名称、作者、简介、首页入口和分页数量等信息集中在仓库根目录的 `manga-paper.config.ts` 中。

它是日常定制站点时最常用的入口。大多数情况下，修改这个文件就能完成基本的站点个性化，不需要直接修改主题组件。

配置文件大致如下：

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
    perPage: 8,
    recentCount: 3,
  },
  socials: [
    {
      label: "GitHub",
      url: "https://github.com/you/repo",
      icon: "github",
      primary: true,
    },
  ],
});
```

这份配置不需要一次性全部修改。可以先改站点名称、作者和简介，再根据需要调整首页入口和文章数量。

### 3.1 站点名称、作者与简介

这四个字段各有不同的用途，修改前可以先了解它们会出现在哪里。

| 字段 | 主要用途 |
| --- | --- |
| `site.name` | 页头 Logo、`<title>` 后缀、RSS 标题，以及站点默认分享卡片的主标题 |
| `site.tagline` | 没有单独设置 description 的页面的描述兜底，以及首页的无障碍标题 |
| `site.author` | 文章分享卡片上的作者名，以及结构化数据中的 author 和 publisher |
| `site.bio` | 关于页 meta description 的兜底，以及站点默认分享卡片的描述 |

修改这些信息后，RSS、sitemap 和分享卡片等构建期生成的内容会在下次构建时同步更新，不需要逐个手动修改。

如果你希望博客的名称、介绍和作者信息在不同页面保持一致，优先通过这组配置完成修改，比直接编辑生成后的 HTML 更合适。

### 3.2 配置首页快捷入口

首页顶部的贴纸式快捷入口由 `socials` 数组控制，**数组中的顺序就是页面上的显示顺序**。

例如：

```ts
socials: [
  {
    label: "GitHub",
    url: "https://github.com/you/repo",
    icon: "github",
    primary: true,
  },
  {
    label: "邮箱",
    url: "mailto:you@example.com",
    icon: "mail",
  },
  {
    label: "微博",
    url: "https://weibo.com/you",
    icon: "weibo",
  },
],
```

每个入口包含显示名称、链接地址和图标。`primary: true` 可以将某个入口设为主入口，显示为墨底纸字的样式。一组配置中最多设置一个主入口。

`icon` 支持三种写法：

| 类型 | 示例 | 说明 |
| --- | --- | --- |
| 内置图标 | `icon: "github"` | 使用模板内置的单色图标，颜色随主题变化 |
| 本地图片 | `icon: "/icons/weibo.svg"` | 将图片放在 `public/icons/` 下，支持 SVG、PNG 和 WebP |
| 外链图片 | `icon: "https://cdn.example.com/x.png"` | 使用 HTTPS 图片地址 |

模板内置了 23 个常用图标：

`github`、`x`、`facebook`、`instagram`、`linkedin`、`telegram`、`youtube`、`reddit`、`discord`、`mastodon`、`bluesky`、`threads`、`weibo`、`zhihu`、`bilibili`、`wechat`、`douban`、`juejin`、`gitee`、`mail`、`rss`、`link`、`seal`。

如果图标名称无法识别，或者没有填写 `icon`，模板会回退到通用的外链图标，不会留下空白。

另外，RSS 入口由模板固定追加在快捷入口末尾，页脚也提供 RSS 和私密文章入口。这些属于站点的固定功能，不需要再重复添加到 `socials` 中。

### 3.3 调整首页与列表的文章数量

文章数量由 `posts` 下的两个配置项控制：

```ts
posts: {
  perPage: 8,
  recentCount: 3,
},
```

- `posts.perPage`：控制文章列表每页显示的文章数量，默认为 8 篇。
- `posts.recentCount`：控制首页「最近更新」区域展示的文章数量。

如果你希望首页更简洁，可以减少最近更新的数量；如果文章更新频繁，也可以适当增加列表的每页数量。修改后重新运行开发服务器或构建站点即可查看效果。

## 四、自定义关于页

关于页与站点配置不同，它属于内容，而不是全局配置。

正文保存在 `src/content/pages/about.md` 中，使用 Markdown 编写，也支持 HTML 和局部 CSS。因此，你既可以把它当作普通文章编辑，也可以借助 HTML 和 CSS 实现个人介绍、项目卡片或其他自定义布局。

例如：

```md
---
title: 关于我
description: 页面描述；省略时回退到 site.bio
prose: true
stats: true
---

## 我在做什么

- 第一件事
- 第二件事

<div class="intro">
  <p>需要自定义版式时，可以直接编写 HTML 和 CSS。</p>
</div>

<style>
.intro {
  border: 3px solid var(--ink);
  padding: 20px;
}
</style>
```

有几个细节值得注意。

**第一，正文中的标题层级。**

页面标题已经由模板输出为一级标题，因此正文建议从 `##` 开始，避免再次使用 `#` 后出现第二个一级标题。

**第二，局部样式的作用范围。**

关于页中的 `<style>` 会被自动包进 `@scope (.about-custom)`，因此 `.intro` 这样的普通类名只会作用于关于页的自定义正文，不会意外影响页头、页脚和其他页面。

**第三，颜色应该优先使用主题变量。**

例如 `var(--ink)`、`var(--card)`、`var(--red)` 和 `var(--yellow)` 等颜色 token 会随主题切换。相比之下，直接写死 `#000` 这样的颜色值，可能在暗色主题中造成对比度问题。

**第四，按需调整正文样式与统计模块。**

- `prose` 默认是 `true`，正文会使用文章排版样式，包括标题下划线、引用卡片、代码块和表格等。如果你打算完全自己编写整页样式，可以将其设为 `false`，避免两套样式互相影响。
- `stats` 默认是 `true`，正文下方会展示构建期统计的文章、分类和标签数量。不需要统计模块时，可以将它设为 `false`。

最后，关于页不应被当作普通的前端应用入口。虽然其中可以写 HTML 和 CSS，但不建议添加 `<script>`。这类脚本不会经过 Astro 的正常打包流程，也不属于模板承诺兼容的使用方式。

如果手写 `<img>` 标签，记得同时提供 `width` 和 `height`。Markdown 图片会由模板自动补充尺寸并接入灯箱，而手写的 HTML 图片不会自动享受同样的处理。

## 五、写第一篇文章

MangaPaper 使用 Markdown 管理文章，所有文章都放在 `src/content/blog/` 目录下。

**一级子目录名就是分类，文件名就是 URL slug。**

例如：

```text
src/content/blog/tech/hello-world.md
```

这篇文章会归入 `tech` 分类，访问地址为 `/posts/hello-world`。

一篇文章的主要信息通过 frontmatter 定义：

```yaml
---
title: 文章标题
description: 用于 SEO、RSS 和分享卡片的摘要
tags: [技术, 随笔]
featured: true
draft: false
private: false
---
```

这些字段分别用于控制文章的展示方式：

| 字段 | 用途 |
| --- | --- |
| `title` | 文章标题 |
| `description` | 文章摘要，用于 SEO、RSS 和分享卡片 |
| `tags` | 文章标签，可以有多个 |
| `featured` | 可选，设为 `true` 后加入首页精选轮播 |
| `draft` | 可选，设为 `true` 后在构建时排除 |
| `private` | 可选，设为 `true` 后在构建阶段加密 |

普通公开文章不需要设置 `draft` 或 `private`，也不必手动填写 `false`。只有需要启用相应功能时，再添加对应字段即可。

### 5.1 让 Git Hooks 自动维护日期

通常不需要手动填写 `date` 和 `updated`。仓库已经集成 Git Hooks，会根据提交信息自动维护日期字段。

| 提交信息 | 行为 |
| --- | --- |
| `feat(blog): 发布新文章` | 为新文章写入 `date`；修改已有文章时刷新 `updated` |
| `fix(blog): 修正文章错字` | 不刷新 `updated`，`chore` 类提交同样遵循这一规则 |
| 提交信息包含 `[skip-updated]` | 显式跳过 `updated` 刷新 |

这样可以将「发布新文章」和「修正旧文章」区分开来，避免只修正错别字也刷新修改时间。

需要注意，日期维护依赖仓库中的 Git Hooks。正常安装依赖后，Husky 会负责安装相关钩子；如果跳过了安装流程，自动维护功能也可能无法正常工作。

### 5.2 草稿与私密文章有什么区别

`draft` 和 `private` 用于解决两种不同的需求。

- **草稿**：用于暂时不准备发布的文章。设置 `draft: true` 后，文章会在构建时被排除，也不会进入正常的公开内容产物。
- **私密文章**：用于希望保留在站点中、但不直接公开展示的内容。设置 `private: true` 后，文章会在构建阶段加密，并通过 `/private` 页面提供解锁入口。

私密文章不仅会从普通文章列表中排除，还会从归档、标签、分类、RSS、sitemap 和搜索索引中排除。它的详细加密方式及安全边界，可以参考项目介绍中「私密文章」一节。

如果只是尚未写完的文章，用草稿即可；如果需要发布经过密码保护的内容，则应该使用私密文章功能。不要把两者当成同一种状态使用。

## 六、环境变量配置

环境变量示例集中在 `.env.example` 中。复制得到的 `.env` 已经被加入 `.gitignore`，本地配置不会随着普通 Git 提交自动进入仓库。

下面是常用配置项及其用途：

| 变量 | 说明 |
| --- | --- |
| `SITE_URL` | **必填。** 站点根 URL，用于生成 canonical、sitemap 和 RSS 等绝对地址 |
| `PRIVATE_PASSWORD` | 私密文章加密密码；默认值只适合本地预览，正式上线前应更换为强密码 |
| `PUBLIC_UNLOCK_TTL_HOURS` | 浏览器记住解锁状态的时长，单位为小时，默认 1 |
| `SKIP_REMOTE_IMAGE_SIZE` | 可选。设为 `1` 后跳过构建期的外链图片尺寸探测 |
| `PUBLIC_REMARK42_HOST` / `PUBLIC_REMARK42_SITE_ID` | 可选。两项均配置后才会渲染评论区 |
| `PUBLIC_GA_MEASUREMENT_ID` | 可选。Google Analytics 4 的 Measurement ID |
| `PUBLIC_GSC_VERIFICATION` | 可选。Google Search Console 的 HTML 标记验证值 |
| `PUBLIC_VERCEL_ANALYTICS` / `PUBLIC_VERCEL_SPEED_INSIGHTS` | 可选，仅适用于 Vercel；设为 `1` 后启用对应的观测功能 |

其中，`PRIVATE_PASSWORD` 只在使用私密文章功能时尤其重要。项目在未设置该变量时会回退到默认密码 `manga-paper`，并在构建时给出警告；正式上线时不要继续使用默认值。

`PUBLIC_GSC_VERIFICATION` 用于 HTML 标记验证。如果你选择通过 DNS TXT 记录验证域名，则需要在域名服务商处完成相应配置，不必为了这一验证方式额外设置 HTML 标记。

### 为什么 `SITE_URL` 必须填写正确

`SITE_URL` 是构建前检查中唯一的必填环境变量。它不能缺失、格式非法，也不能继续使用示例域名，否则 `npm run build` 会直接失败。

这是有意设置的检查，而不是多余的限制。站点地址会影响 canonical、RSS 和 sitemap 等内容，一旦将错误域名写入正式构建产物，就可能造成搜索引擎收录和文章分享地址异常。

本地开发时可以使用：

```dotenv
SITE_URL=http://localhost:4321
```

正式部署时，则需要换成博客实际使用的根地址，例如：

```dotenv
SITE_URL=https://your-domain.com
```

这里的域名应与最终访问站点的正式地址一致，不要添加具体文章路径。

## 七、部署到 Vercel

Vercel 对 Astro 的支持比较直接。配置好构建命令和环境变量后，就可以自动完成构建与部署。

你可以选择一键部署，也可以先在 GitHub 创建自己的仓库，再从 Vercel 控制台导入。

### 7.1 方式一：一键部署

使用下面的链接进入 Vercel 部署流程：

**[一键部署到 Vercel][vercel-deploy]**

登录后，Vercel 会将模板复制到你的账号下，并提示填写环境变量。

如果计划发布私密文章，创建仓库时务必选择 Private；同时为 `PRIVATE_PASSWORD` 设置自己的强密码，不要将默认密码用于正式站点。

### 7.2 方式二：从控制台导入仓库

如果已经在 GitHub 创建了自己的仓库，可以在 Vercel 中选择 **Add New → Project**，找到对应仓库并导入。

确认以下配置：

| 配置项 | 值 |
| --- | --- |
| Framework Preset | `Astro` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js Version | `22.x` |

接下来在 Environment Variables 中配置站点地址：

```dotenv
SITE_URL=https://你的域名
```

如果启用了私密文章，再添加：

```dotenv
PRIVATE_PASSWORD=一个足够强的密码
```

其他可选服务则根据自己的实际需求配置。环境变量保存完成后，重新部署即可。

### 7.3 Vercel 的响应头配置有什么不同

Vercel 部署中有一个容易忽略的细节：**Vercel 不读取发布目录中的 `_headers` 文件作为自身的响应头配置。**

因此，MangaPaper 将 Vercel 专用的安全响应头和重定向配置放在仓库根目录的 `vercel.ts` 中。Vercel 会在构建阶段执行这份程序化配置，并根据环境变量动态生成相应规则。

Cloudflare Pages 使用的则是构建产物中的 `dist/_headers` 和 `dist/_redirects`，两套配置的入口不同，但都可以根据环境变量生成。

使用者通常不需要修改这些文件。比如配置了 remark42 后，对应域名会自动加入相关 CSP 白名单，不必再手动维护部署规则。

如果只是更改博客名称、文章内容、评论服务等常规设置，继续通过配置文件和环境变量操作即可。

## 八、部署到 Cloudflare Pages

Cloudflare Pages 同样适合部署 MangaPaper。整个流程与 Vercel 类似，主要区别是控制台入口和环境变量配置方式。

### 8.1 创建 Pages 项目

进入 Cloudflare 控制台，按照下面的路径创建项目：

**Workers & Pages → Create → Pages → Connect to Git**

连接 GitHub 后，选择自己的 MangaPaper 仓库。

构建设置填写：

| 配置项 | 值 |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |

然后在环境变量中添加：

```dotenv
NODE_VERSION=22
SITE_URL=https://你的域名
```

如果启用了私密文章，再添加：

```dotenv
PRIVATE_PASSWORD=一个足够强的密码
```

确认环境变量后保存并部署即可。

这里不要漏掉 `NODE_VERSION=22`。MangaPaper 要求 Node.js 22 及以上的兼容版本，而 Cloudflare 构建环境使用的 Node.js 版本不一定恰好符合这个要求。

### 8.2 Cloudflare Pages 如何处理响应头

与 Vercel 不同，Cloudflare Pages 会读取发布目录中的配置文件：

- `dist/_headers`：定义 HTTP 响应头。
- `dist/_redirects`：定义重定向规则。

这两个文件由 MangaPaper 在构建阶段生成，因此不需要手动创建或长期维护生成结果。

如果配置了 remark42 或 GA4 等服务，相关域名也会按需进入 CSP 白名单。这样可以让部署配置与实际启用的服务保持一致，避免为了不同环境反复编辑响应头文件。

### 8.3 CSP 为什么默认使用 Report-Only

MangaPaper 生成的内容安全策略（CSP）目前采用 **Report-Only 模式**。

这个模式会在浏览器控制台报告违反策略的资源，但不会直接拦截它们。这样做是为了先观察实际页面使用了哪些资源，避免策略配置过严，导致评论、统计或页面脚本意外失效。

上线后可以按下面的顺序逐步收紧策略：

1. 打开部署后的网站，观察浏览器控制台中的 CSP 报告。
2. 检查报告涉及的资源来源，将确实需要的来源加入 `src/utils/deploy-policy.ts` 中的白名单。remark42 的相关域名会根据配置自动处理。
3. 确认没有遗漏后，再将策略从 `Content-Security-Policy-Report-Only` 切换为 `Content-Security-Policy`，正式启用拦截。

这里也有一个需要留意的细节：当前 `script-src` 保留了 `'unsafe-inline'`，因为 Astro 可能会将部分较小的客户端脚本内联到 HTML 中，例如主题首帧处理、年份修正、解锁检查和部分组件脚本。这些脚本可能随内容变化，如果采用手写哈希的方式，就容易在每次构建后失效。

如果需要进一步收紧脚本策略，可以考虑 Astro 提供的 `security.csp` 功能，让构建阶段自动计算相关哈希。

对普通使用者而言，默认配置已经可以先完成部署。CSP 的进一步收紧属于后续安全加固工作，不必为了上线而贸然改动。

## 九、上线前检查清单

部署完成前，建议重点检查以下几项。

- **确认 `SITE_URL` 已替换为正式域名。** 本地地址只适合开发预览，正式环境需要填写真实的站点根 URL。
- **确认私密文章密码已更换。** 如果启用了私密文章，不要继续使用默认密码 `manga-paper`。
- **确认承载私密文章的 Git 仓库为 Private。** 页面加密不代表仓库源文件也被加密；`noindex` 也只是搜索引擎提示，不是访问控制。
- **检查 sitemap。** 站点部署完成后，可以在 Google Search Console 中提交 `https://你的域名/sitemap-index.xml`。MangaPaper 已在构建阶段生成 sitemap 和 `robots.txt`，不需要手动编写。

如果启用了评论或统计服务，还要检查对应平台是否已经完成配置。例如，填写 GA4 的 Measurement ID 并不等于已经在 Google Analytics 中完成所有账号设置；remark42 也需要有可用的服务端实例及相应配置。

完成这些检查后，再通过实际访问、刷新页面和搜索文章等操作确认站点运行正常。

## 十、常见问题

### `npm run build` 报 `SITE_URL` 相关错误

通常是 `.env` 中没有设置 `SITE_URL`、地址格式不正确，或者仍然使用了 `.env.example` 中的示例域名。

这是构建前的检查在生效。将变量修改为正确的地址后重新构建即可。`astro dev` 和 `preview` 的使用场景不同，不会因为同一项正式构建检查而无法运行。

### 开发模式下搜不到文章

这是正常现象。Pagefind 的搜索索引在构建后生成，开发服务器中没有索引时，搜索页会显示相应的提示。

需要验证搜索时，可以执行：

```bash
npm run build
npm run preview
```

### 字体需要手动准备吗

不需要。完整字体文件放在 `assets/fonts/` 中，构建时会根据站点实际内容生成自托管字体子集。

修改文章后重新构建即可。如果字符集没有发生变化，相应的字体生成步骤可以跳过；当页面需要新的字符时，构建流程会重新处理对应的字体资源。

### 可以同时部署到 Vercel 和 Cloudflare Pages 吗

技术上可以创建多个部署，但对于普通的个人博客，建议先选择一个平台作为正式站点。

两个平台共用同一份 `dist/` 构建产物，同时部署并不会自动带来数据同步或额外功能，反而会增加域名、环境变量和发布流程的维护成本。确定一个主要部署目标通常更简单。

### 想修改页头导航或页脚，应该改哪里

页头导航和页脚不是 `manga-paper.config.ts` 中的普通配置项。如果需要修改结构或布局，可以直接编辑：

- `src/components/SiteHeader.astro`
- `src/components/SiteFooter.astro`

它们是普通的 Astro 组件，可以按照项目的组件结构直接调整。如果只是修改站点基本信息、快捷入口和分页数量，则仍然建议优先修改配置文件，避免不必要地改动组件。

---

从创建仓库、修改配置，到编写文章和部署上线，MangaPaper 的基本使用流程就是这些。

模板负责提供一套可持续维护的设计与工程基础。至于选择什么域名、写什么内容、多久更新一次，最终还是由你自己决定。博客的样子可以从一张稿纸开始，慢慢变成真正属于自己的地方。

[vercel-deploy]: https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flavieio%2Fmanga-paper-template&project-name=manga-paper&repository-name=manga-paper&env=PRIVATE_PASSWORD,SITE_URL,PUBLIC_UNLOCK_TTL_HOURS&envDescription=PRIVATE_PASSWORD%20encrypts%20private%20posts%20%E2%80%94%20use%20a%20strong%20password%20before%20going%20live.%20SITE_URL%20is%20your%20real%20domain.%20PUBLIC_UNLOCK_TTL_HOURS%20is%20the%20unlock%20memory%20in%20hours%2C%20default%201.&envDefaults=%7B%22PUBLIC_UNLOCK_TTL_HOURS%22%3A%221%22%7D