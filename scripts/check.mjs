import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { output, files, within } from "./lib.mjs";

/** 检查真实发布产物，而不是只检查模板：站内文件、字体和锚点都必须存在。 */
export async function check() {
  const { base } = JSON.parse(
    await fs.readFile(path.join(output, "build-info.json"), "utf8"),
  );
  const all = await files(output),
    htmlFiles = all.filter((file) => file.endsWith(".html"));
  const ids = new Map();
  for (const file of htmlFiles) {
    const html = await fs.readFile(file, "utf8");
    const found = [...html.matchAll(/\bid="([^"]+)"/g)].map(
      (match) => match[1],
    );
    assert.equal(found.length, new Set(found).size, "重复 id：" + file);
    ids.set(file, new Set(found));
    assert(!/\{\{[A-Z_]+\}\}/.test(html), "未填充的模板：" + file);
  }
  const errors = [];
  const unescape = (value) =>
    value
      .replaceAll("&amp;", "&")
      .replaceAll("&quot;", '"')
      .replaceAll("&#39;", "'");
  for (const file of htmlFiles) {
    const html = await fs.readFile(file, "utf8");
    const route = base + path.relative(output, file).split(path.sep).join("/");
    for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const href = unescape(match[1]);
      if (/^(?:https?:|mailto:|tel:|data:|\/\/)/i.test(href)) continue;
      const url = new URL(href, "https://local.invalid" + route);
      if (!url.pathname.startsWith(base)) {
        errors.push(file + "：基础路径错误 " + href);
        continue;
      }
      let target = path.resolve(
        output,
        decodeURIComponent(url.pathname.slice(base.length)),
      );
      if (!within(output, target)) {
        errors.push("链接越界：" + href);
        continue;
      }
      if (url.pathname.endsWith("/")) target = path.join(target, "index.html");
      try {
        await fs.access(target);
        if (
          url.hash &&
          ids.has(target) &&
          !ids.get(target).has(decodeURIComponent(url.hash.slice(1)))
        )
          errors.push(file + "：缺失锚点 " + href);
      } catch {
        errors.push(file + "：缺失文件 " + href);
      }
    }
  }
  // KaTeX 的字体 URL 位于本地，不能仅验证 HTML 中的 stylesheet 链接。
  for (const file of all.filter((file) => file.endsWith(".css"))) {
    const css = await fs.readFile(file, "utf8");
    for (const match of css.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)) {
      if (/^(?:data:|https?:)/.test(match[1])) continue;
      try {
        await fs.access(path.resolve(path.dirname(file), match[1]));
      } catch {
        errors.push("缺失字体或 CSS 资源：" + match[1]);
      }
    }
  }
  const home = await fs.readFile(path.join(output, "index.html"), "utf8");
  assert(home.includes("<h1>页面正在施工中。</h1>"));
  const scholar = await fs.readFile(
    path.join(output, "scholar/index.html"),
    "utf8",
  );
  assert(!scholar.includes("摘要"), "学术著作不应输出摘要");
  assert(!scholar.includes(base + "blog/"), "学术主页不应链接博客");
  const blog = await fs.readFile(path.join(output, "blog/index.html"), "utf8");
  assert(!blog.includes(base + "scholar/"), "博客不应链接学术主页");
  const search = JSON.parse(
    await fs.readFile(path.join(output, "blog/search-index.json"), "utf8"),
  );
  for (const p of search) {
    assert(p.text.trim(), "文章没有全文索引：" + p.slug);
    assert(p.url.startsWith(base + "blog/posts/"), "错误文章地址");
  }
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    `检查通过：${htmlFiles.length} 个 HTML；站内链接、目录锚点、全文索引与本地公式字体；base=${base}`,
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  check().catch((error) => {
    console.error("检查失败：" + error.message);
    process.exitCode = 1;
  });
