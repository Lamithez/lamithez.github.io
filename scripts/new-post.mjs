import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { root, commandOption, files } from "./lib.mjs";

const folders = { 专题: "topics", 札记: "notes", 随想: "thoughts" };
const slug = commandOption("slug"),
  title = commandOption("title"),
  category = commandOption("category") || "札记";
if (
  !slug ||
  !title ||
  !folders[category] ||
  !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
) {
  console.error(
    '用法：npm run new:post -- --slug my-first-post --title "文章标题" --category 专题',
  );
  process.exit(1);
}
for (const file of (await files(path.join(root, "content/blog"))).filter(
  (file) => file.endsWith(".md"),
)) {
  const { data } = matter(await fs.readFile(file, "utf8"));
  if ((data.slug || path.basename(file, ".md")) === slug)
    throw new Error("slug 已被使用：" + slug);
}
const target = path.join(root, "content/blog", folders[category], slug + ".md");
const date = new Date().toISOString().slice(0, 10);
const content = `---\ntitle: ${JSON.stringify(title)}\nslug: ${slug}\ndate: "${date}"\ncategory: ${category}\ntags: []\ndescription: "一句话介绍这篇文章。"\ndraft: true\n---\n\n## 从这里开始\n\n在这里写正文。完成后将 draft 改为 false。\n`;
await fs.writeFile(target, content, { encoding: "utf8", flag: "wx" });
console.log("已创建草稿：" + path.relative(root, target));
