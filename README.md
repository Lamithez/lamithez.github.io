# 个人学术主页与博客

面向 GitHub Pages 的完整静态网站。浏览器使用原生 HTML、CSS、JavaScript；Node.js 只在构建时将 Markdown 和 JSON 数据转换成 HTML，不需要 Vue 或后端服务。

## 页面与功能

| 地址                    | 内容                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `/`                     | 仅一行大字：页面正在施工中。                                   |
| `/scholar/`             | 固定个人资料边栏、研究方向、精简著作、教育与研究经历、学术服务 |
| `/blog/`                | 专题、札记、随想三个分区，分类筛选与全文搜索                   |
| `/blog/posts/文章标识/` | 独立静态文章页，可直接访问、刷新和分享                         |
| `/blog/about/`          | 关于作者，内容待补充                                           |
| `/blog/books/`          | 书籍，内容待编排                                               |
| `/blog/links/`          | 链接，内容待编排                                               |

博客和学术页不提供互相导航。博客「关于作者」是自己的附页，不跳转 Scholar；根目录不承担导航功能。页面公开可访问，独立性属于视觉与导航设计，不是权限隔离。

目前个人资料和著作为明确标记的占位内容，三篇博客为演示文章。请用真实信息替换；未填写的邮箱和资源地址不会生成假链接。

## 安装与本地预览

需要 **Node.js 24 或更新版本**；首次上传还需要 Git 和 GitHub 账号。正常安装 Node.js 后会同时提供 npm。

无需额外安装包管理器。在项目根目录执行（`npm ci` 按锁文件安装）：

```sh
npm ci
npm run dev
```

本地地址：

- 首页：<http://127.0.0.1:4173/>
- 学术页：<http://127.0.0.1:4173/scholar/>
- 博客：<http://127.0.0.1:4173/blog/>

保存 `content/`、`data/` 或 `src/` 后自动重建，刷新浏览器查看。按 `Ctrl+C` 停止。

```sh
npm run build                 # 生成 dist/
npm run check                 # 检查链接、文件、目录锚点、搜索索引与字体
npm test                  # 检查 Markdown 提示块、公式和路径转换
npm run preview               # 构建并预览，不监听修改
npm run dev -- --port 8080       # 修改本地端口
npm run format                # 格式化源码
npm run format:check          # 检查源码格式
```

依赖已安装时，也可以直接执行 `node scripts/serve.mjs --watch`。请通过 HTTP 服务预览，不要双击带占位字段的源码模板。`dist/` 是生成目录，不是编辑入口。

## 代码结构

```text
content/
  blog/topics/             专题 Markdown
  blog/notes/              札记 Markdown
  blog/thoughts/           随想 Markdown
  pages/                   关于作者、书籍、链接等附页
  assets/                  内容图片、照片、PDF
data/
  site.json                博客名称、导航与部署配置
  profile.json             个人资料、研究方向与经历
  publications.json        学术著作列表
src/
  templates/               HTML 外壳
  styles/                  博客与学术页各自的 CSS
  scripts/                 浏览器端搜索、筛选与导航
  favicon.svg              博客图标
scripts/
  build.mjs                数据检查与整体构建
  markdown.mjs             Markdown、公式、Callout、链接转换
  templates.mjs            页面主体与著作条目生成
  lib.mjs                  路径、转义与通用工具
  check.mjs                发布产物检查
  serve.mjs                本地 HTTP 服务与内容监听
  new-post.mjs             文章草稿生成
  publish.mjs              构建、检查、提交、推送
.github/workflows/pages.yml GitHub Pages 自动发布
publish.ps1                Windows 一键上传入口
publish.sh                 macOS/Linux 上传入口
tests/                     Markdown 解析回归检查
package.json               命令与依赖
package-lock.json             锁定依赖版本
dist/                      构建结果，不提交到 Git
```

关键流程带有源码注释。原型中的硬编码正文已移入 Markdown，不维护第二套文章。

## 编写博客

### 创建文章

```sh
npm run new:post -- --slug my-first-post --title "我的第一篇文章" --category 专题
```

新文章默认 `draft: true`。写完后改为 `false`，才生成页面并进入搜索。草稿源码仍随 Git 上传：公开仓库中的草稿不是私密内容。

也可手动创建 `.md` 文件：

```yaml
---
title: 我的第一篇文章
slug: my-first-post
date: "2026-09-26"
updated: "2026-09-27" # 可选
category: 专题 # 专题 / 札记 / 随想
tags: [知识整理, 方法]
description: 一句话介绍文章。
draft: false
sample: false # 演示文章才设为 true
---
```

正文从 `##` 二级标题开始。页面标题取自 `title`；正文首行若另有一级标题，构建时会移除。文件夹用于整理，页面分区由 `category` 决定。

`slug` 使用小写英文、数字和连字符，所有文章之间不能重复。地址固定为 `/blog/posts/slug/`；改变文件夹不会改变地址，更改 slug 会改变地址。

### 语法与排版

支持标题、加粗、斜体、列表、引用、表格、代码高亮、图片、链接与 `[^名称]` 脚注；支持 `$...$` 行内公式、`$$...$$` 独立公式与 `\tag{1}` 编号。长文有桌面目录与移动端折叠目录，随想不显示目录。

常用 Callout：

```md
> [!NOTE]
> 这是一段说明。

> [!WARNING]
> **适用条件**
>
> 这里写需要注意的条件。

> [!TIP]- 补充解释
> 默认折叠；加号 + 表示默认展开。
```

支持 `NOTE`、`INFO`、`TIP`、`IMPORTANT`、`WARNING`、`CAUTION`、`DANGER`、`DEFINITION`。为跨编辑器复用，优先使用 `NOTE`、`TIP`、`IMPORTANT`、`WARNING`、`CAUTION`，把自定义标题放在正文。Typora 需启用 GitHub Style Alert；自定义类型与折叠功能在不同编辑器中的支持可能不同。

也支持容器语法：

```md
::: warning 注意 / 适用条件
提示内容。
:::

::: details 补充推导
额外解释或公式。
:::
```

容器类型有 `info`、`note`、`definition`、`tip`、`warning`、`important`、`danger`、`caution`、`details`。这不是基础 Markdown，不保证本地编辑器也能渲染。原始 HTML 不参与渲染；新增语法时统一修改 `scripts/markdown.mjs`。

完整示例见 `content/blog/topics/observation.md`。KaTeX 在构建时生成 HTML 和 MathML，数学字体与 CSS 随站点部署，不依赖 CDN。

### 图片与链接

图片放在 `content/assets/` 或文章旁边，使用相对源文件路径：

```md
![图的说明](../../assets/example.svg)
[另一篇文章](../topics/observation.md)
[某一节](../topics/observation.md#03-波动与估计误差的区别)
```

构建器将 `.md` 链接转换成文章地址，图片转换成本地发布资源，并自动处理部署前缀。资源支持 PNG、JPEG、WebP、AVIF、GIF、SVG、PDF。

章节锚点去掉标点、转为小写、将空白变为连字符。修改章节标题后也要同步修改引用，`npm run check` 会检查目标文件与锚点。

### 搜索与附页

搜索覆盖已发布文章的标题、标签、描述与正文，不搜索草稿、学术履历或博客附页。空格分隔的多个关键词必须全部命中，可以与类别筛选同时使用；状态保存在 URL 的 `category`、`q` 中。无 JavaScript 时文章仍可直接打开阅读。

顶栏的三个链接都有独立页面，编辑 `content/pages/` 即可。新增附页填写 `title`、`slug`、`description`，再在 `site.json` 的 `blog.navigation` 中添加 `blog/新标识/`。导航目标不存在会在构建时提示错误。

## 修改 Scholar 学术主页

个人信息在 `data/profile.json`：

- `bio`：每个字符串是一段介绍。
- `photo`：如 `content/assets/portrait.jpg`；留空使用占位图。
- `email`、`links`：公开邮箱和真实学术资料链接，可留空。
- `research`、`experience`、`service`：可增加或删除数组条目。
- `service: []`：隐藏学术服务栏目及导航。
- `placeholder: false`：填写真实资料后隐藏占位说明。

桌面边栏使用 `position: fixed`，主栏滚动不带动边栏。边栏仅保留个人资料，按窗口高度调整照片与间距；现有资料无需内部滚动，后续填入过长内容时保留滚动兜底，避免裁掉资料；手机与打印模式恢复普通文档布局。

### 简单编写著作数据

在 `data/publications.json` 数组中添加对象，按想展示的顺序排列：

```json
{
  "type": "paper",
  "title": "论文标题",
  "authors": ["你的姓名", "合作者姓名"],
  "venue": "期刊 / 会议名称",
  "location": "出版或会议地点",
  "date": "2026-09",
  "url": "",
  "sample": false
}
```

`type` 可为 `paper`、`preprint`、`thesis`、`book`。`location`、`url` 可留空；有真实 URL 时标题才生成链接。作者名与 `profile.name` 相同则加粗。

每项仅展示标题、作者、发表来源、地点、时间和类别，不展示摘要。运行 `npm run build` 自动生成，分类按钮按实际类型生成，不需要编写 HTML。

## 创建 GitHub 仓库与首次发布

当前尚未创建或连接远端仓库，线上部署没有发生。

1. 登录 GitHub，点击 **New repository**。
2. 推荐仓库名为 **你的用户名.github.io**，如 `example.github.io`。
3. 选择 **Public**，不预先添加 README、`.gitignore` 或 License，保持空仓库，避免两套不同历史。
4. 创建后复制 HTTPS 或 SSH 仓库地址。
5. 在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
6. 安装依赖，设置 Git 身份，执行本地构建与检查。

```sh
git config --global user.name "你的名字"
git config --global user.email "你的邮箱或 GitHub noreply 邮箱"
npm run build
npm run check
```

Git 身份不是 GitHub 登录。HTTPS 使用 Git Credential Manager 的浏览器登录等方式；SSH 需要预先设置 SSH key。脚本不保存令牌；GitHub 账号密码不能代替 HTTPS Git 认证。

Windows PowerShell：

```powershell
# 预演：构建与检查，不修改 Git、不提交、不推送。
.\publish.ps1 -Repo "https://github.com/用户名/用户名.github.io.git" -DryRun

# 上传：初始化 main（如果需要）、提交源码并推送。
.\publish.ps1 -Repo "https://github.com/用户名/用户名.github.io.git" -Message "首次发布主页"
```

如果 PowerShell 执行策略阻止脚本，无需修改系统策略，可直接用：

```sh
node scripts/publish.mjs --repo https://github.com/用户名/用户名.github.io.git --message "首次发布主页"
```

macOS / Linux：

```sh
sh publish.sh --repo https://github.com/用户名/用户名.github.io.git --message "首次发布主页"
```

将目标地址保存进 `data/site.json` 的 `repository` 后，每次更新只需：

```sh
npm run publish -- --message "更新文章"
```

**使用 `npm run publish`，不要省略 run。** `npm publish` 是包管理器的 npm 包发布命令。

上传后到 **Actions** 查看工作流。推送成功不等于 Pages 部署完成；工作流绿色成功标记才表示部署完成。默认地址为 `https://用户名.github.io/`，学术页与博客追加 `/scholar/`、`/blog/`。

上传脚本不会强制推送、覆盖不同的 origin、重命名分支或合并远端历史。远端不是空仓库、当前分支不是 main 或认证失败时会中止。它只暂存列出的项目源文件，不上传 dist、依赖、缓存或 .env。

## 工作流与部署路径

推送 main 后，GitHub Actions 自动执行：

```text
安装锁定依赖 → Markdown/JSON 转换 → 检查产物
→ 上传 dist artifact → 部署 GitHub Pages
```

Pull Request 只构建检查，不部署；也支持手动触发。

普通项目仓库如 `MainPage` 会自动采用 `/MainPage/` 前缀，地址为 `https://用户名.github.io/MainPage/`。可本地模拟：

```sh
npm run build -- --base /MainPage/
npm run check
npm run dev -- --base /MainPage/
```

本地默认基础路径来自 `site.json` 的 `basePath`；命令行 `--base` 优先，其次是环境变量 `SITE_BASE`。CSS、脚本、图片、文章和字体都处理基础路径。

每篇文章具有真实 `index.html`，无需 SPA 路由回退、Jekyll 或服务器重写。附带 `404.html` 和 `.nojekyll`。`site.url` 可填网站 origin，如 `https://用户名.github.io`，用来生成 sitemap，不改变部署路径。

## 修改入口与字体

| 修改目标                 | 文件                              |
| ------------------------ | --------------------------------- |
| 博客名称、介绍、顶栏导航 | `data/site.json`                  |
| 博客内容、附页           | `content/blog/`、`content/pages/` |
| 个人资料与经历           | `data/profile.json`               |
| 学术著作                 | `data/publications.json`          |
| 博客顶栏、字号、Callout  | `src/styles/blog.css`             |
| Scholar 边栏、著作密度   | `src/styles/scholar.css`          |
| HTML 外壳与资源引用      | `src/templates/`                  |
| 页面结构与著作生成       | `scripts/templates.mjs`           |
| Markdown 扩展            | `scripts/markdown.mjs`            |
| 首页施工文字             | `scripts/build.mjs`               |

视觉延续冷白、墨蓝、衬线标题与大留白。Scholar 只有一种主题；博客提供米白酒红、冷白墨蓝与墨夜深色三套配色；深色覆盖正文、表格、提示块和代码。

中文字体优先使用系统宋体类字体，拉丁文字使用系统字体，不访问 Google Fonts。不同设备的中文字形会有差异；数学字体独立打包。所有文件使用 UTF-8。

## 常见问题

- **没有上线**：核对 Pages 是否选择 GitHub Actions，main 是否推送，Actions 是否报错。
- **图片或字体 404**：检查部署前缀，执行 `npm run check`。
- **文章不出现**：核对 draft、category、日期和 slug；新文章默认草稿。
- **修改不生效**：修改源文件而非 dist，检查重建日志并刷新浏览器。
- **端口占用**：`npm run dev -- --port 8080`。
- **推送失败**：核对认证、origin、main 与远端历史，不使用 force push 解决。

`npm run check` 检查站内文件、锚点、搜索索引与公式字体，不检查外部网站是否在线，也不能证明远端部署已经完成。上线后仍需打开真实网站确认。

## 参考

发布依据 [GitHub Pages 官方工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。Markdown 使用 [markdown-it](https://github.com/markdown-it/markdown-it)、[KaTeX 插件](https://mdit-plugins.github.io/katex.html)、脚注与容器插件。

学术内容组织参考 [Jon Barron](https://jonbarron.info/)、[Chelsea Finn](https://ai.stanford.edu/~cbfinn/) 与 [Andrej Karpathy](https://karpathy.ai/)；视觉基于用户提供的幻灯片，未复制他人的照片、论文和履历。

## 全站公告与学术导航

在 `data/site.json` 中修改 `announcement`：

```json
{
  "enabled": true,
  "type": "danger",
  "label": "建设中",
  "message": "网站正在建设中，内容与功能将持续完善。"
}
```

- `enabled`：设为 `false` 关闭全站公告。
- `type`：`danger` 红色、`warning` 黄色、`info` 蓝色、`success` 绿色；每种均有标识。
- `label`：简短标题，留空采用类型默认标题；`message`：正文，按纯文本显示。

公告覆盖首页、学术页、博客索引、文章、附页和 404 页，滚动时置顶。修改后运行 `npm run build`，再执行发布脚本。样式位于 `src/styles/site.css`，高度同步逻辑位于 `src/scripts/site.js`。关闭公告后，首页恢复仅显示施工文字。

学术目录由 `scripts/templates.mjs` 的 `nav` 列表生成，位于主栏顶部；下翻时吸顶在公告下方。侧边栏仅保留照片、姓名、机构、联系方式与学术链接，桌面保持固定；较矮窗口自动缩小照片与留白。
