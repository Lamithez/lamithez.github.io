import http from "node:http";
import fs from "node:fs/promises";
import { watch } from "node:fs";
import path from "node:path";
import { build } from "./build.mjs";
import { root, output, within, commandOption } from "./lib.mjs";

const port = Number(commandOption("port") || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("端口须为 1–65535。");
const baseOverride = commandOption("base");
const { base } = await build(baseOverride);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
  ".md": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};
let building = false;
const server = http.createServer(async (request, response) => {
  try {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405);
      response.end();
      return;
    }
    if (building) {
      response.writeHead(503, { "Retry-After": "1" });
      response.end("正在重新构建，请稍后刷新。");
      return;
    }
    const url = new URL(request.url, "http://localhost");
    if (base !== "/" && url.pathname === "/") {
      response.writeHead(302, { Location: base });
      response.end();
      return;
    }
    if (!url.pathname.startsWith(base))
      throw Object.assign(new Error("not found"), { code: "ENOENT" });
    let target = path.resolve(
      output,
      decodeURIComponent(url.pathname.slice(base.length)),
    );
    if (!within(output, target)) {
      response.writeHead(403);
      response.end();
      return;
    }
    const stat = await fs.stat(target);
    if (stat.isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        response.writeHead(301, { Location: url.pathname + "/" + url.search });
        response.end();
        return;
      }
      target = path.join(target, "index.html");
    }
    if (!within(output, await fs.realpath(target))) {
      response.writeHead(403);
      response.end();
      return;
    }
    const data = await fs.readFile(target);
    response.writeHead(200, {
      "Content-Type": mime[path.extname(target)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Content-Length": data.length,
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : data);
  } catch (error) {
    const status =
      error.code === "ENOENT" || error.code === "ENOTDIR"
        ? 404
        : error instanceof URIError
          ? 400
          : 500;
    response.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
    response.end(
      status === 404
        ? await fs.readFile(path.join(output, "404.html"), "utf8")
        : "请求失败。",
    );
  }
});
server.on("error", (error) => {
  console.error("预览失败：" + error.message);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `本地预览：http://127.0.0.1:${port}${base}\n博客：${base}blog/；学术页：${base}scholar/；Ctrl+C 停止。`,
  ),
);

// 只监听创作源与模板，不监听 dist 或依赖；保存后重建，刷新浏览器查看。
const watchers = [];
if (process.argv.includes("--watch")) {
  let timer,
    pending = false;
  const rebuild = async () => {
    if (building) {
      pending = true;
      return;
    }
    building = true;
    try {
      await build(baseOverride);
    } catch (error) {
      console.error("重建失败：" + error.message);
    } finally {
      building = false;
      if (pending) {
        pending = false;
        await rebuild();
      }
    }
  };
  for (const directory of ["data", "content", "src"])
    watchers.push(
      watch(path.join(root, directory), { recursive: true }, () => {
        clearTimeout(timer);
        timer = setTimeout(rebuild, 200);
      }),
    );
}
process.on("SIGINT", () => {
  watchers.forEach((watcher) => watcher.close());
  server.close(() => process.exit(0));
});
