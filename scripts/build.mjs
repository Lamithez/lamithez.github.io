import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import {
  root,
  output,
  json,
  files,
  write,
  escape as e,
  categories,
  basePath,
  commandOption,
  within,
  publicURL,
} from "./lib.mjs";
import { createMarkdown, renderMarkdown } from "./markdown.mjs";
import {
  template,
  blogHeader,
  blogIndex,
  blogArticle,
  scholarParts,
} from "./templates.mjs";

const require = createRequire(import.meta.url);
const assetExtensions = /\.(?:png|jpe?g|webp|avif|gif|svg|pdf)$/i;
function dateString(value, file) {
  const result =
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value ?? "");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
    Number.isNaN(Date.parse(result)) ||
    new Date(result).toISOString().slice(0, 10) !== result
  )
    throw new Error(`${file}：日期须为 YYYY-MM-DD。`);
  return result;
}
async function readDocuments(folder, isPage = false) {
  const documents = [];
  for (const file of (await files(path.join(root, folder))).filter((file) =>
    file.endsWith(".md"),
  )) {
    const raw = await fs.readFile(file, "utf8");
    const { data, content } = matter(raw);
    if (data.draft === true) continue;
    if (typeof data.title !== "string" || !data.title.trim())
      throw new Error(`${file}：缺少 title。`);
    const slug = data.slug || path.basename(file, ".md");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      throw new Error(`${file}：slug 请使用小写英文、数字和连字符。`);
    if (!isPage && !categories.includes(data.category))
      throw new Error(`${file}：category 须为专题、札记或随想。`);
    if (
      !isPage &&
      (!Array.isArray(data.tags) ||
        data.tags.some((tag) => typeof tag !== "string"))
    )
      throw new Error(`${file}：tags 须为字符串数组。`);
    if (data.description !== undefined && typeof data.description !== "string")
      throw new Error(`${file}：description 须为文字。`);
    documents.push({
      ...data,
      slug,
      title: data.title.trim(),
      sourcePath: file,
      raw,
      content: content.replace(/^\s*# [^\n]+\n/, ""),
      date: isPage ? "" : dateString(data.date, file),
      updated: data.updated ? dateString(data.updated, file) : "",
      tags: data.tags || [],
      category: data.category || "",
      route: isPage ? `blog/${slug}/` : `blog/posts/${slug}/`,
    });
  }
  return documents;
}

export async function build(baseOverride) {
  const site = await json("data/site.json"),
    profile = await json("data/profile.json"),
    publications = await json("data/publications.json");
  const base = basePath(baseOverride || process.env.SITE_BASE || site.basePath);
  if (site.url) publicURL(site.url);
  if (!Array.isArray(publications))
    throw new Error("publications.json 须为数组。");
  for (const p of publications) {
    if (
      !["paper", "preprint", "thesis", "book"].includes(p.type) ||
      !p.title ||
      !p.venue ||
      !p.date ||
      !Array.isArray(p.authors) ||
      p.authors.some((name) => typeof name !== "string")
    )
      throw new Error("著作缺少 type、title、venue、date 或 authors。");
    publicURL(p.url);
  }
  for (const key of ["bio", "links", "research", "experience", "service"])
    if (!Array.isArray(profile[key]))
      throw new Error("profile." + key + " 须为数组。");
  if (
    !profile.name ||
    !site.blog?.title ||
    !Array.isArray(site.blog.navigation)
  )
    throw new Error("缺少主页姓名或博客配置。");
  if (
    profile.email &&
    !/^[^\s<>"@]+@[^\s<>"@]+\.[^\s<>"@]+$/.test(profile.email)
  )
    throw new Error("请填写有效的公开邮箱或留空。");
  const posts = await readDocuments("content/blog"),
    pages = await readDocuments("content/pages", true);
  posts.sort(
    (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug),
  );
  const all = [...posts, ...pages],
    seen = new Set();
  for (const p of all) {
    if (seen.has(p.route)) throw new Error("重复的页面地址：" + p.route);
    seen.add(p.route);
  }
  const validRoutes = new Set(["blog/", ...all.map((p) => p.route)]);
  for (const item of site.blog.navigation)
    if (!validRoutes.has(item.path))
      throw new Error("博客导航没有对应页面：" + item.path);
  const routes = new Map(all.map((p) => [p.sourcePath, p.route]));
  const md = createMarkdown(base, routes);
  for (const p of all) {
    p.rendered = renderMarkdown(md, p.content, p.sourcePath);
    p.description ||= p.rendered.text.trim().slice(0, 100);
    p.minutes = Math.max(
      1,
      Math.ceil(p.rendered.text.replace(/\s/g, "").length / 350),
    );
    p.url = base + p.route;
  }

  // 只重建项目内确定的 dist；拒绝符号链接，防止清理到其他路径。
  if (!within(root, output) || path.basename(output) !== "dist")
    throw new Error("构建输出目录不安全。");
  const info = await fs.lstat(output).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  if (info?.isSymbolicLink()) throw new Error("dist 不允许为符号链接。");
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(path.join(output, "assets"), { recursive: true });
  for (const name of ["blog", "scholar"]) {
    await fs.copyFile(
      path.join(root, "src/styles", name + ".css"),
      path.join(output, "assets", name + ".css"),
    );
    await fs.copyFile(
      path.join(root, "src/scripts", name + ".js"),
      path.join(output, "assets", name + ".js"),
    );
  }
  await fs.copyFile(
    path.join(root, "src/favicon.svg"),
    path.join(output, "assets/favicon.svg"),
  );
  const katexDist = path.dirname(require.resolve("katex/dist/katex.min.css"));
  await fs.cp(katexDist, path.join(output, "assets/vendor/katex"), {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(katexDist, source);
      return (
        relative === "" ||
        relative === "fonts" ||
        relative.startsWith("fonts" + path.sep) ||
        relative === "katex.min.css"
      );
    },
  });
  await fs.copyFile(
    require.resolve("katex/LICENSE"),
    path.join(output, "assets/vendor/katex/LICENSE"),
  );
  for (const file of (await files(path.join(root, "content"))).filter((file) =>
    assetExtensions.test(file),
  )) {
    const target = path.join(
      output,
      "assets/content",
      path.relative(path.join(root, "content"), file),
    );
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(file, target);
  }
  if (profile.photo) {
    const photo = path.resolve(root, profile.photo);
    if (
      !within(path.join(root, "content"), photo) ||
      !assetExtensions.test(photo)
    )
      throw new Error("照片须位于 content 中，并使用图片文件。");
    await fs.access(photo);
  }

  // 发布产物全部是静态 HTML，不使用 SPA fallback，深层文章地址可直接刷新。
  await write(
    "index.html",
    `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>页面正在施工中。</title><style>html{color-scheme:light}body{margin:0;min-height:100svh;display:flex;flex-direction:column;background:#fcfcfb;color:#182430}h1{font:700 clamp(22px,5vw,52px)/1.5 "Noto Serif SC","Songti SC","SimSun",serif;letter-spacing:.06em;white-space:nowrap;margin:auto}</style></head><body><h1>页面正在施工中。</h1></body></html>`,
  );
  await write(
    "404.html",
    '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>页面不存在</title></head><body style="margin:0;font-family:serif;color:#24323c"><main style="margin:15vh auto;max-width:600px;padding:24px"><h1>404 / 页面不存在</h1><p>请检查地址，或使用浏览器返回上一页。</p></main></body></html>',
  );
  await write(".nojekyll", "");
  const year = String(new Date().getUTCFullYear());
  const blogValues = {
    BASE: base,
    HEADER: blogHeader(site, base),
    BLOG_TITLE: e(site.blog.title),
    YEAR: year,
  };
  const indexPosts = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    category: p.category,
    tags: p.tags,
    description: p.description,
    minutes: p.minutes,
    url: p.url,
    text: p.rendered.text,
  }));
  await write(
    "blog/index.html",
    await template("blog", {
      ...blogValues,
      TITLE: e(site.blog.title + " · 个人写作"),
      DESCRIPTION: e(site.blog.description),
      MAIN_CLASS: "",
      CONTENT: blogIndex(site, indexPosts),
    }),
  );
  await write("blog/search-index.json", JSON.stringify(indexPosts));
  for (const p of all) {
    const isPage = pages.includes(p);
    await write(
      p.route + "index.html",
      await template("blog", {
        ...blogValues,
        HEADER: blogHeader(site, base, isPage ? p.route : ""),
        TITLE: e(p.title + " · " + site.blog.title),
        DESCRIPTION: e(p.description),
        MAIN_CLASS: "reading",
        CONTENT: blogArticle(
          p,
          p.rendered,
          posts.filter((other) => other.category === p.category),
          base,
          isPage,
        ),
      }),
    );
    if (!isPage) await write("blog/sources/" + p.slug + ".md", p.raw);
  }
  await write(
    "scholar/index.html",
    await template("scholar", {
      BASE: base,
      TITLE: e(profile.name + " · 学术主页"),
      DESCRIPTION: e(
        profile.name + "的个人学术主页：研究方向、学术著作与经历。",
      ),
      PROFILE_STATUS: profile.placeholder ? "个人资料待补充" : "个人学术主页",
      ...scholarParts(profile, publications, base),
    }),
  );
  if (site.url) {
    const origin = publicURL(site.url).replace(/\/$/, "");
    await write(
      "sitemap.xml",
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["scholar/", "blog/", ...all.map((p) => p.route)].map((route) => `<url><loc>${e(origin + base + route)}</loc></url>`).join("")}</urlset>`,
    );
  }
  // 在统一出口插入公告，确保首页、404 和所有内容页采用同一份配置。
  const notice = site.announcement;
  const noticeTypes = {
    info: ["i", "提示"],
    success: ["✓", "消息"],
    warning: ["!", "注意"],
    danger: ["!", "公告"],
  };
  if (
    notice &&
    (typeof notice.enabled !== "boolean" ||
      !noticeTypes[notice.type] ||
      typeof notice.message !== "string" ||
      (notice.label !== undefined && typeof notice.label !== "string"))
  )
    throw new Error(
      "announcement 须包含 enabled 布尔值、有效 type 和 message 文字。",
    );
  const banner = notice?.enabled
    ? `<aside class="site-announcement notice-${notice.type}" aria-label="网站公告" role="status"><span class="notice-icon" aria-hidden="true">${noticeTypes[notice.type][0]}</span><strong>${e(notice.label || noticeTypes[notice.type][1])}</strong><span>${e(notice.message)}</span></aside>`
    : "";
  for (const htmlFile of (await files(output)).filter((file) =>
    file.endsWith(".html"),
  )) {
    const html = await fs.readFile(htmlFile, "utf8");
    await fs.writeFile(
      htmlFile,
      html
        .replace(
          "</head>",
          `<link rel="stylesheet" href="${base}assets/site.css"><script src="${base}assets/site.js" defer></script></head>`,
        )
        .replace(/<body([^>]*)>/, `<body$1>${banner}`),
    );
  }
  for (const kind of ["styles", "scripts"])
    await fs.copyFile(
      path.join(root, "src", kind, kind === "styles" ? "site.css" : "site.js"),
      path.join(output, "assets", kind === "styles" ? "site.css" : "site.js"),
    );
  await write(
    "build-info.json",
    JSON.stringify({
      base,
      posts: posts.length,
      pages: pages.length,
      publications: publications.length,
    }),
  );
  console.log(
    `已构建：${posts.length} 篇文章，${pages.length} 个博客附页，${publications.length} 条著作；base=${base}`,
  );
  return { base, posts, pages };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  build(commandOption("base")).catch((error) => {
    console.error("构建失败：" + error.message);
    process.exitCode = 1;
  });
}
