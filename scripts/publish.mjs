import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { build } from "./build.mjs";
import { check } from "./check.mjs";
import { root, json, commandOption } from "./lib.mjs";

// 发布只上传已列出的项目源文件。dist 由 GitHub Actions 重建；不使用 force push。
const managed = [
  "src",
  "content",
  "data",
  "scripts",
  "tests",
  ".github",
  "package.json",
  "package-lock.json",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  ".prettierignore",
  "README.md",
  "publish.ps1",
  "publish.sh",
];
function git(args, { capture = false, allowFailure = false } = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    windowsHide: true,
  });
  if (result.error) throw new Error("无法运行 Git，请先安装 Git 并配置认证。");
  if (result.status !== 0 && !allowFailure)
    throw new Error("Git 命令失败：git " + args.join(" "));
  return { ok: result.status === 0, text: result.stdout?.trim() || "" };
}
function repositoryURL(value) {
  // 允许 GitHub HTTPS 或 SSH 仓库地址；拒绝 shell 字符及指向其他平台的误配置。
  if (
    !/^(?:https:\/\/github\.com\/|git@github\.com:)[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(
      value || "",
    )
  )
    throw new Error(
      "请提供 GitHub 仓库 URL，例如 --repo https://github.com/用户名/用户名.github.io.git",
    );
  return value;
}
function sameRepository(a, b) {
  const clean = (value) =>
    value
      .replace("git@github.com:", "https://github.com/")
      .replace(/\.git$/, "")
      .toLowerCase();
  return clean(a) === clean(b);
}
async function publish() {
  const site = await json("data/site.json");
  const localGit = await fs.lstat(path.join(root, ".git")).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  // 不把目录意外加入父级仓库，也不修改已有的远程地址。
  const oldRemote = localGit
    ? git(["remote", "get-url", "origin"], {
        capture: true,
        allowFailure: true,
      }).text
    : "";
  const repo = repositoryURL(
    commandOption("repo") || site.repository || oldRemote,
  );
  const dry = process.argv.includes("--dry-run");
  await build(commandOption("base"));
  await check();
  if (oldRemote && !sameRepository(oldRemote, repo))
    throw new Error(
      "现有 origin 与目标仓库不同；请核对，不会自动改写远程地址。",
    );
  if (dry) {
    console.log(
      `预演完成，不修改 Git、不提交、不推送。\n目标：${repo}\n计划：校验身份 → 初始化 main（若需要）→ 提交项目源文件 → 推送 origin/main → GitHub Actions 发布。`,
    );
    return;
  }
  // 认证交给 Git Credential Manager / SSH。脚本不存储或打印访问令牌。
  if (
    !git(["config", "user.name"], { capture: true, allowFailure: true }).text ||
    !git(["config", "user.email"], { capture: true, allowFailure: true }).text
  )
    throw new Error("请先设置 git config user.name 与 user.email。");
  if (!localGit) git(["init", "-b", "main"]);
  if (git(["branch", "--show-current"], { capture: true }).text !== "main")
    throw new Error(
      "上传脚本只发布 main；请先切换到 main，不会自动改名或合并分支。",
    );
  const staged = git(["diff", "--cached", "--name-only"], { capture: true })
    .text.split("\n")
    .filter(Boolean);
  if (
    staged.some(
      (file) =>
        !managed.some((name) => file === name || file.startsWith(name + "/")),
    )
  )
    throw new Error("暂存区含有本项目范围之外的文件，请先处理后再发布。");
  if (!oldRemote) git(["remote", "add", "origin", repo]);
  const paths = [];
  for (const name of managed)
    if (
      await fs.access(path.join(root, name)).then(
        () => true,
        () => false,
      )
    )
      paths.push(name);
  git(["add", "--", ...paths]);
  const changes = git(["diff", "--cached", "--quiet"], {
    capture: true,
    allowFailure: true,
  });
  if (!changes.ok)
    git([
      "commit",
      "-m",
      commandOption("message") || "Update personal academic website",
    ]);
  // 新建空仓库即可首次推送；若远端已有不同历史，Git 会拒绝，不会覆盖远端内容。
  git(["push", "-u", "origin", "main"]);
  console.log(
    "源文件已推送。请在仓库 Actions 查看 Pages 部署结果；脚本返回成功不等于远端部署已完成。",
  );
}
publish().catch((error) => {
  console.error("发布中止：" + error.message);
  process.exitCode = 1;
});
