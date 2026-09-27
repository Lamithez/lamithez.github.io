import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 所有读写路径都从项目根目录计算，避免依赖调用命令时的工作目录。
export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const output = path.join(root, "dist");
export const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
export const slugify = (value) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
export const categories = ["专题", "札记", "随想"];
export const json = (file) =>
  fs.readFile(path.join(root, file), "utf8").then(JSON.parse);
export function basePath(value = "/") {
  const result = "/" + value.split("/").filter(Boolean).join("/") + "/";
  const normalized = result === "//" ? "/" : result;
  if (
    !/^\/(?:[A-Za-z0-9_.-]+\/)*$/.test(normalized) ||
    normalized.includes("/../") ||
    normalized.includes("/./")
  )
    throw new Error(
      "basePath 必须为 / 或 /仓库名称/，不能包含 ..、查询参数或空格。",
    );
  return normalized;
}
export function within(parent, child) {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith(".." + path.sep) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}
export async function files(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? files(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    ),
  );
  return nested.flat().sort();
}
export async function write(relative, content) {
  const target = path.resolve(output, relative);
  if (!within(output, target)) throw new Error("输出路径越界：" + relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}
export function publicURL(value) {
  if (!value) return "";
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("个人资料链接仅接受 http/https：" + value);
  return url.href;
}
export function commandOption(name) {
  const arg = process.argv
    .slice(2)
    .find((arg) => arg.startsWith("--" + name + "="));
  if (arg) return arg.slice(name.length + 3);
  const index = process.argv.indexOf("--" + name);
  return index < 0 ? undefined : process.argv[index + 1];
}
