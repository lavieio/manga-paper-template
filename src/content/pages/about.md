---
title: 关于我
description: 一个长期写代码、折腾 AI 的人的个人数字角落
# 整页版式都是自己写的 HTML + CSS，关掉文章排版，免得两套样式打架。
prose: false
# 正文下方是否显示站点统计条（文章 / 分类 / 标签数，构建期算出来的）。
stats: true
---

<!--
  关于页的全部正文都在这个文件里。Markdown、HTML、<style> 都能写：

  · 标题由 frontmatter 的 `title` 渲染成页面的 h1；
  · 下面那些版式（左图右文、卡片、时间轴、贴纸标签墙）就是 HTML + CSS，
    模板会把 `<style>` 自动包进 `@scope (.about-custom)`，裸类名漏不到页头页脚；
  · 颜色一律用主题 token（`var(--ink)` / `var(--card)` / `var(--red)` …），暗色自动跟着走；
  · 不要写 `<script>`：不走 Astro 打包，也不在模板的兼容范围内。
-->

<p class="lead">一个长期写代码、折腾 AI，也喜欢研究各种奇怪东西的人。这个博客是我的个人数字角落。</p>

<div class="intro">
  <div class="portrait">
    <span class="portrait-label">CHARACTER / 01</span>
    <span class="portrait-mark" aria-hidden="true">L</span>
    <span class="portrait-note">sketch</span>
  </div>
  <div class="intro-text">
    <h2 class="hello">你好，我是 <span class="underline">lavie</span>。</h2>
    <p>我习惯把遇到的问题记录下来，把实验过程留下来，再把一些值得以后重新思考的东西整理成文章。</p>
    <p>所以这里不太像一个精心维护的知识库，更像一本持续更新的 <span class="underline">工作手稿</span>。</p>
  </div>
</div>

<h2 class="sec-title"><span class="sec-num">01</span>我在这里记录什么</h2>

<div class="card">
  <p>写代码时遇到的问题。</p>
  <p>做 AI、RAG、Agent、MCP 时踩过的坑。</p>
  <p>后端架构、数据库、搜索与数据分析的一些思考。</p>
  <p>以及那些暂时没有答案，但值得留下来的问题。</p>
  <span class="card-note">← 持续补充</span>
</div>

<h2 class="sec-title"><span class="sec-num">02</span>我感兴趣的东西</h2>

<div class="topics">
  <article class="topic">
    <span class="topic-num">01</span>
    <h3>Backend</h3>
    <p>Java / Spring Boot / MySQL / Redis / Elasticsearch / 分布式系统</p>
  </article>
  <article class="topic">
    <span class="topic-num">02</span>
    <h3>AI Engineering</h3>
    <p>RAG / Agent / LangGraph / MCP / Milvus / LLM</p>
  </article>
  <article class="topic">
    <span class="topic-num">03</span>
    <h3>Web</h3>
    <p>Astro / TypeScript / Tailwind / Web Performance / Lighthouse</p>
  </article>
  <article class="topic">
    <span class="topic-num">04</span>
    <h3>Tools</h3>
    <p>Pi / Docker / Linux / Self-hosting</p>
  </article>
</div>

<h2 class="sec-title"><span class="sec-num">03</span>这本手稿</h2>

<ol class="timeline">
  <li>
    <span class="when">NOW</span>
    <h3>继续折腾</h3>
    <p>继续做 AI 工程、Agent、RAG，也继续维护自己的工具和个人知识库。</p>
  </li>
  <li>
    <span class="when">BEFORE</span>
    <h3>从业务系统开始</h3>
    <p>长期从事后端开发与数据分析相关工作，在真实业务中处理数据库、检索、统计和系统架构问题。</p>
  </li>
  <li>
    <span class="when">ALWAYS</span>
    <h3>对新东西保持好奇</h3>
    <p>新框架、新工具、新模型出来的时候，总想亲自跑一遍看看它到底能做什么。</p>
  </li>
</ol>

<h2 class="sec-title"><span class="sec-num">04</span>当前工具箱</h2>

<p class="tags">
  <span class="tag cyan">Java</span>
  <span class="tag pink">Spring Boot</span>
  <span class="tag yellow">MySQL</span>
  <span class="tag blue">Redis</span>
  <span class="tag cyan">Elasticsearch</span>
  <span class="tag pink">Python</span>
  <span class="tag yellow">LangGraph</span>
  <span class="tag blue">Milvus</span>
  <span class="tag cyan">MCP</span>
  <span class="tag pink">Astro</span>
  <span class="tag yellow">Docker</span>
  <span class="tag blue">Linux</span>
  <span class="tag pink">Pi</span>
</p>

<div class="contact">
  <div>
    <h2 class="contact-title">找我？</h2>
    <p>如果你也在折腾类似的东西，可以来聊聊。</p>
  </div>
  <p class="contact-links">
    <a href="https://github.com/lavieio/manga-paper-template">GitHub</a>
    <a href="mailto:hello@example.com">Email</a>
    <a href="/rss.xml">RSS</a>
  </p>
</div>

<style>
  /* ──────────────────────────────────────────────────────────────
     用户自己写的一段 CSS。模板会自动把它包成：
       @scope (.about-custom) { … }
     所以下面这些又短又普通的类名（.card / .tag / p …）只会作用在
     这个容器里面，不会碰到页头、页脚，也不会漏到别的页面。
     颜色一律用主题 token（--ink / --card / --red …），暗色自动跟着走。
     ────────────────────────────────────────────────────────────── */

  .lead {
    margin: 0 0 40px;
    color: var(--ink-soft);
    font-size: 14px;
    line-height: 2;
  }

  /* 左图右文 */
  .intro {
    display: grid;
    grid-template-columns: 170px 1fr;
    gap: 36px;
    align-items: start;
    margin-bottom: 56px;
  }
  .portrait {
    position: relative;
    display: grid;
    place-items: center;
    width: 170px;
    height: 200px;
    background: var(--card);
    border: 3px solid var(--ink);
    box-shadow: var(--shadow);
    transform: rotate(-1.2deg);
  }
  .portrait-label,
  .portrait-note {
    position: absolute;
    color: var(--ink-soft);
    font-size: 9px;
    letter-spacing: 0.08em;
  }
  .portrait-label { top: 9px; left: 10px; }
  .portrait-note { right: 9px; bottom: 8px; transform: rotate(-6deg); }
  .portrait-mark {
    display: grid;
    place-items: center;
    width: 72px;
    height: 72px;
    background: var(--red);
    color: var(--on-dark-fill);
    border: 3px solid var(--ink);
    box-shadow: 4px 4px 0 var(--ink);
    font-size: 36px;
    font-weight: 700;
    transform: rotate(-3deg);
  }
  .hello { margin: 0 0 14px; font-size: 20px; line-height: 1.5; }
  .intro-text p { margin: 0 0 12px; color: var(--ink-soft); font-size: 13px; line-height: 2; }
  .underline {
    color: var(--ink);
    border-bottom: 2px solid var(--red-ink);
  }

  /* 小节标题：编号 + 横线 */
  .sec-title {
    display: flex;
    align-items: center;
    gap: 13px;
    margin: 0 0 24px;
    font-size: 16px;
    font-weight: 700;
  }
  .sec-title::after {
    content: "";
    flex: 1;
    height: 3px;
    background: var(--ink);
  }
  .sec-num { color: var(--red-ink); font-size: 11px; letter-spacing: 0.08em; }

  /* 卡片：硬边框 + 内侧虚线 + 旋转批注 */
  .card {
    position: relative;
    margin-bottom: 56px;
    padding: 26px 30px;
    background: var(--card);
    border: 3px solid var(--ink);
    box-shadow: var(--shadow);
    transform: rotate(0.25deg);
  }
  .card::before {
    content: "";
    position: absolute;
    inset: 12px;
    border: 2px dashed var(--ink-soft);
    pointer-events: none;
  }
  .card p { position: relative; margin: 0; font-size: 14px; line-height: 2; }
  .card p + p { margin-top: 10px; }
  .card-note {
    position: absolute;
    right: 16px;
    bottom: -18px;
    color: var(--ink-soft);
    font-size: 10px;
    transform: rotate(-3deg);
  }

  /* 兴趣网格 */
  .topics {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0;
    margin-bottom: 56px;
    border: 3px solid var(--ink);
    background: var(--card);
    box-shadow: var(--shadow);
  }
  .topic {
    min-height: 118px;
    padding: 18px 20px;
    border-right: 2px solid var(--ink);
    border-bottom: 2px solid var(--ink);
  }
  .topic:nth-child(2n) { border-right: 0; }
  .topic:nth-last-child(-n + 2) { border-bottom: 0; }
  .topic-num { display: block; margin-bottom: 12px; color: var(--ink-soft); font-size: 10px; }
  .topic h3 { margin: 0 0 6px; font-size: 14px; }
  .topic p { margin: 0; color: var(--ink-soft); font-size: 12px; line-height: 1.9; }

  /* 时间轴：虚线竖轴 + 方块节点 */
  .timeline {
    position: relative;
    margin: 0 0 56px;
    padding-left: 30px;
    list-style: none;
  }
  .timeline::before {
    content: "";
    position: absolute;
    top: 6px;
    bottom: 6px;
    left: 5px;
    width: 2px;
    background: repeating-linear-gradient(
      to bottom,
      var(--ink-soft) 0,
      var(--ink-soft) 4px,
      transparent 4px,
      transparent 9px
    );
  }
  .timeline li { position: relative; margin-bottom: 26px; }
  .timeline li:last-child { margin-bottom: 0; }
  .timeline li::before {
    content: "";
    position: absolute;
    left: -30px;
    top: 4px;
    width: 10px;
    height: 10px;
    background: var(--red);
    border: 2px solid var(--ink);
    transform: rotate(-3deg);
  }
  .when { color: var(--ink-soft); font-size: 10px; letter-spacing: 0.08em; }
  .timeline h3 { margin: 3px 0 5px; font-size: 14px; }
  .timeline p { margin: 0; color: var(--ink-soft); font-size: 12px; line-height: 1.9; }

  /* 贴纸标签墙 */
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 0 0 56px;
  }
  .tag {
    padding: 3px 11px;
    font-size: 12px;
    font-weight: 600;
    color: var(--on-light-fill);
    border: 2px solid var(--ink);
    box-shadow: 3px 3px 0 var(--ink);
  }
  .tag.cyan { background: var(--cyan); transform: rotate(-1.5deg); }
  .tag.pink { background: var(--pink); transform: rotate(1.2deg); }
  .tag.yellow { background: var(--yellow); transform: rotate(-1deg); }
  .tag.blue { background: var(--blue); transform: rotate(1deg); }

  /* 联系条 */
  .contact {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 28px;
    padding: 20px 0;
    border-top: 3px solid var(--ink);
    border-bottom: 3px solid var(--ink);
  }
  .contact-title { margin: 0 0 4px; font-size: 15px; }
  .contact p { margin: 0; color: var(--ink-soft); font-size: 12px; }
  .contact-links { display: flex; gap: 10px; }
  .contact-links a {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink);
    background: var(--card);
    border: 2px solid var(--ink);
    box-shadow: 3px 3px 0 var(--ink);
    transition: transform 0.12s ease, box-shadow 0.12s ease;
  }
  .contact-links a:hover { transform: translate(-2px, -2px); box-shadow: 5px 5px 0 var(--ink); }

  @media (max-width: 640px) {
    .intro { grid-template-columns: 1fr; gap: 24px; }
    .topics { grid-template-columns: 1fr; }
    .topic { border-right: 0; }
    .topic:nth-last-child(-n + 2) { border-bottom: 2px solid var(--ink); }
    .topic:last-child { border-bottom: 0; }
    .contact { flex-direction: column; align-items: flex-start; gap: 16px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .contact-links a { transition: none; }
  }
</style>
