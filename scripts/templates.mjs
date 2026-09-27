import fs from "node:fs/promises";
import path from "node:path";
import { escape as e, root, publicURL } from "./lib.mjs";

// 模板只接收已校验的数据；普通文字统一转义，避免名称中的 & 等字符破坏 HTML。
export async function template(name, values) {
  const source = await fs.readFile(
    path.join(root, "src/templates", name + ".html"),
    "utf8",
  );
  return source.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error("缺少模板字段：" + key);
    return values[key];
  });
}
export function blogHeader(site, base, active = "") {
  return `<header class="masthead"><a class="wordmark" href="${base}blog/">${e(site.blog.title)}<span>${e(site.blog.subtitle)}</span></a><div class="header-right"><nav class="aux-links" aria-label="博客导航">${site.blog.navigation.map((item) => `<a href="${base}${e(item.path)}"${item.path === active ? ' aria-current="page"' : ""}>${e(item.label)}</a>`).join("")}</nav><div class="themes" aria-label="博客配色"><button data-theme="paper" aria-label="米白酒红" title="米白 · 酒红"></button><button data-theme="blue" aria-label="冷白墨蓝" title="冷白 · 墨蓝" aria-pressed="true"></button><button data-theme="dark" aria-label="深色墨夜" title="深色 · 墨夜"></button></div></div></header>`;
}
export function postRow(post) {
  return `<a class="post" href="${e(post.url)}"><div class="post-date"><time datetime="${post.date}">${post.date.replaceAll("-", ".")}</time><br>${e(post.category)}</div><div><h3>${e(post.title)}</h3><p>${e(post.description)}</p><span class="post-tags">${post.tags.map(e).join(" / ")}</span></div><span class="post-length">约 ${post.minutes} 分钟 ↗</span></a>`;
}
export function blogIndex(site, posts) {
  const categoryInfo = [
    ["专题", "已经成稿的系统知识", "阅读专题"],
    ["札记", "零散知识与问题经验", "翻阅札记"],
    ["随想", "短篇感想与未完成的畅想", "看看随想"],
  ];
  return `<section class="intro"><p class="eyebrow">个人写作 / PERSONAL JOURNAL</p><h1>${e(site.blog.headline).replaceAll("\n", "<br>")}</h1><p class="intro-note">${e(site.blog.description)}</p><span class="issue">VOL. 01<br>${posts[0]?.date.slice(0, 4) || new Date().getUTCFullYear()} —</span></section>
    <nav class="categories" aria-label="内容分区">${categoryInfo.map(([name, description, action], i) => `<a href="?category=${encodeURIComponent(name)}#archive" data-category="${name}"><span class="number">0${i + 1}</span><strong>${name}</strong><span>${description}</span><i>${action} ↗</i></a>`).join("")}</nav>
    <section class="archive" id="archive"><div class="archive-heading"><div><p class="eyebrow" id="list-label">全部写作</p><h2 id="list-title">最近写下的</h2></div><label class="search"><span class="sr-only">搜索文章标题、标签和全文</span><input type="search" placeholder="搜索文章全文…" id="search" autocomplete="off"><span aria-hidden="true">⌕</span></label></div><div class="filters" aria-label="筛选文章">${["全部", ...categoryInfo.map((item) => item[0])].map((name) => `<button type="button" data-category="${name}" aria-pressed="${name === "全部"}">${name}</button>`).join("")}</div><p id="search-status" class="search-status" role="status" aria-live="polite">共 ${posts.length} 篇文章</p><div id="posts">${posts.map(postRow).join("")}</div><p class="empty" id="empty" hidden>这一页暂时没有匹配的文字。</p><noscript><p class="search-status">搜索与筛选需要 JavaScript；所有文章可直接打开阅读。</p></noscript></section>
    <script id="search-data" type="application/json">${JSON.stringify(posts).replaceAll("<", "\\u003c")}</script>`;
}
function tocLinks(headings) {
  return headings
    .map(
      (h) =>
        `<a href="#${e(h.id)}"${h.level === "h3" ? ' class="toc-sub"' : ""}>${e(h.title)}</a>`,
    )
    .join("");
}
export function blogArticle(post, rendered, siblings, base, isPage = false) {
  const hasToc = post.category !== "随想" && rendered.headings.length > 0;
  const position = siblings.findIndex((item) => item.slug === post.slug);
  const previous = siblings[position - 1],
    next = siblings[position + 1];
  const navLink = (item, label) =>
    item
      ? `<a href="${e(item.url)}"><span>${label}</span>${e(item.title)}</a>`
      : "<span></span>";
  return `<a class="back" href="${base}blog/">← 返回写作索引</a><header class="article-header"><p class="eyebrow">${isPage ? "INDEX / 博客附页" : `${e(post.category)} / ${post.tags.map(e).join(" · ")}`}</p><h1>${e(post.title)}</h1>${post.description ? `<p class="article-deck">${e(post.description)}</p>` : ""}${isPage ? "" : `<div class="metadata"><time datetime="${post.date}">${post.date.replaceAll("-", ".")}</time>${post.updated ? `　 ·　修订 ${e(post.updated)}` : ""}　 ·　约 ${post.minutes} 分钟阅读${post.sample ? "　 ·　演示文章" : ""}</div>`}</header>
    ${hasToc ? `<details class="mobile-toc"><summary>本文目录 · ${rendered.headings.filter((h) => h.level === "h2").length} 个章节</summary><nav aria-label="移动端文章目录">${tocLinks(rendered.headings.filter((h) => h.level === "h2"))}</nav></details>` : ""}
    <div class="reading-grid${hasToc ? "" : " without-toc"}"><article id="article-body">${rendered.html}</article>${hasToc ? `<aside id="toc" aria-label="文章目录"><p class="eyebrow">本文目录</p>${tocLinks(rendered.headings)}</aside>` : ""}</div>
    ${isPage ? "" : `<nav class="article-pagination" aria-label="同类文章导航">${navLink(previous, "较新的文章")}${navLink(next, "较早的文章")}</nav>`}
    <div class="article-end"><span>${post.sample ? "本文为演示内容。" : "感谢阅读。"}${isPage ? "" : ` <a href="${base}blog/sources/${post.slug}.md" download>下载 Markdown ↓</a>`}</span><a href="${base}blog/">回到索引 ↗</a></div>`;
}

const sectionHeading = (number, english, title) =>
  `<div class="section-heading"><p class="section-number">${number}</p><div><p class="eyebrow">${english}</p><h2 id="${english.toLowerCase().replaceAll(" ", "-")}-title">${title}</h2></div></div>`;
const section = (id, heading, content) =>
  `<section class="section${id === "about" ? " about" : ""}" id="${id}">${heading}${content}</section>`;

export function scholarParts(profile, publications, base) {
  const photo = profile.photo
    ? `<img src="${base}assets/content/${e(profile.photo.replace(/^content\//, ""))}" alt="${e(profile.name)}的照片" width="190" height="190">`
    : `<svg viewBox="0 0 240 240" role="img" aria-label="个人照片占位"><defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#dde4e8" stroke-width=".6"/></pattern></defs><rect width="240" height="240" fill="url(#grid)"/><circle cx="120" cy="120" r="72" fill="none" stroke="#bdcbd6"/><circle cx="120" cy="120" r="49" fill="none" stroke="#bdcbd6"/><path d="M32 174C68 174 67 70 120 70S172 174 208 174" fill="none" stroke="#35566f" stroke-width="1.4"/><path d="M32 187H208M120 32V208" stroke="#9cacb8" stroke-width=".7"/></svg><span>个人照片 / 待补充</span>`;
  const nav = [
    ["about", "个人介绍"],
    ["research", "研究方向"],
    ["publications", "学术著作"],
    ["experience", "教育与研究经历"],
    ["service", "学术服务与荣誉"],
  ].filter(([id]) => id !== "service" || profile.service.length);
  const links = profile.links
    .map((link) =>
      link.url
        ? `<a href="${e(publicURL(link.url))}" rel="noopener noreferrer">${e(link.label)} <span>↗</span></a>`
        : `<span>${e(link.label)} <small>待补充</small></span>`,
    )
    .join("");
  const typeNames = {
    paper: "论文",
    preprint: "预印本",
    thesis: "学位论文",
    book: "著作",
  };
  return {
    NAVIGATION: `<nav class="section-nav" aria-label="页内导航">${nav.map(([id, name], i) => `<a href="#${id}"><span>0${i + 1}</span>${name}</a>`).join("")}</nav>`,
    PROFILE: `<aside class="profile" aria-label="个人信息"><div class="portrait">${photo}</div><h1>${e(profile.name)}</h1><p class="english-name" lang="en">${e(profile.englishName)}</p><p class="affiliation">${e(profile.institution)}<br><span>${e(profile.department)}</span></p><dl class="contact"><div><dt>地点</dt><dd>${e(profile.location)}</dd></div><div><dt>邮箱</dt><dd>${profile.email ? `<a href="mailto:${e(profile.email)}">${e(profile.email)}</a>` : "待提供公开邮箱"}</dd></div></dl><div class="academic-links" aria-label="学术资料链接">${links}</div></aside>`,
    ABOUT: section(
      "about",
      sectionHeading("01", "ABOUT", "个人介绍"),
      `<div class="bio">${profile.bio.map((p) => `<p>${e(p)}</p>`).join("")}</div>${profile.placeholder ? '<div class="editor-note"><span>资料说明</span><p>姓名、机构与经历为占位内容，尚未填入真实个人资料。</p></div>' : ""}`,
    ),
    RESEARCH: section(
      "research",
      sectionHeading("02", "RESEARCH INTERESTS", "研究方向"),
      `<div class="research-map">${profile.research.map((item, i) => `<article><span class="research-index">${["I", "II", "III", "IV", "V"][i] || i + 1}.</span><h3>${e(item.title)}</h3><p>${e(item.description)}</p><span class="research-label">${e(item.label)}</span></article>`).join("")}</div>`,
    ),
    PUBLICATIONS: section(
      "publications",
      sectionHeading("03", "PUBLICATIONS", "学术著作"),
      `<div class="publication-toolbar"><div class="filters" aria-label="筛选学术著作">${[["all", "全部"], ...Object.entries(typeNames).filter(([type]) => publications.some((p) => p.type === type))].map(([type, name]) => `<button type="button" data-filter="${type}" aria-pressed="${type === "all"}">${name}</button>`).join("")}</div></div><div class="publication-list" aria-live="polite">${publications.map((p, i) => `<article class="publication" data-type="${e(p.type)}"><div class="publication-year">${e(p.date)}<span>${String(i + 1).padStart(2, "0")}</span></div><div><h3>${p.url ? `<a href="${e(publicURL(p.url))}">${e(p.title)} <span class="external-mark">↗</span></a>` : e(p.title)}</h3><p class="authors">${p.authors.map((name) => (name === profile.name ? `<strong>${e(name)}</strong>` : e(name))).join("，")}</p><p class="venue">${e(p.venue)}${p.location ? " · " + e(p.location) : ""} <span class="publication-type">${typeNames[p.type]}${p.sample ? " / 占位示例" : ""}</span></p></div></article>`).join("")}</div><p class="filter-status" id="filter-status" role="status">显示 ${publications.length} 条著作</p>`,
    ),
    EXPERIENCE: section(
      "experience",
      sectionHeading("04", "EDUCATION & EXPERIENCE", "教育与研究经历"),
      `<div class="timeline">${profile.experience.map((item) => `<article><div class="period">${e(item.period)}</div><div><p class="experience-label">${e(item.type)}</p><h3>${e(item.title)}</h3><p>${e(item.institution)}</p>${item.description ? `<p class="experience-note">${e(item.description)}</p>` : ""}</div></article>`).join("")}</div>`,
    ),
    SERVICE: profile.service.length
      ? section(
          "service",
          sectionHeading("05", "ACADEMIC COMMUNITY", "学术服务与荣誉"),
          `<div class="community">${profile.service.map((item) => `<article><h3>${e(item.title)}</h3><p>${e(item.description)}</p></article>`).join("")}</div>`,
        )
      : "",
  };
}
