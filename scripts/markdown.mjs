import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import footnote from "markdown-it-footnote";
import container from "markdown-it-container";
import { katex } from "@mdit/plugin-katex-slim";
import hljs from "highlight.js";
import path from "node:path";
import { escape, root, slugify, within } from "./lib.mjs";

const labels = {
  info: "说明",
  note: "说明",
  definition: "定义",
  tip: "实践",
  warning: "注意",
  important: "重要",
  danger: "边界",
  caution: "警示",
  details: "补充说明",
};
const classes = {
  info: "note",
  note: "note",
  definition: "definition",
  tip: "tip",
  warning: "warning",
  important: "important",
  danger: "danger",
  caution: "danger",
};

/** 创建构建期解析器。正文不启用原始 HTML，避免脚本混入静态文章。 */
export function createMarkdown(base, routes) {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: false,
    highlight(code, language) {
      const content =
        language && hljs.getLanguage(language)
          ? hljs.highlight(code, { language, ignoreIllegals: true }).value
          : escape(code);
      return `<pre class="hljs"><code>${content}</code></pre>`;
    },
  })
    .use(footnote)
    .use(anchor, { level: [2, 3], slugify })
    .use(katex, {
      throwOnError: true,
      trust: false,
      output: "htmlAndMathml",
      transformer: (html, display) =>
        display ? `<div class="equation">${html}</div>` : html,
    });

  // 同时兼容 ::: 容器与 Typora / Obsidian 常用的引用式 Callout。
  for (const type of Object.keys(labels)) {
    md.use(container, type, {
      validate: (params) => params.trim().split(/\s+/)[0] === type,
      render(tokens, index) {
        if (tokens[index].nesting === -1)
          return type === "details" ? "</details>\n" : "</div>\n";
        const title =
          tokens[index].info.trim().slice(type.length).trim() || labels[type];
        return type === "details"
          ? `<details class="callout details"><summary>${md.renderInline(title)}</summary>\n`
          : `<div class="callout ${classes[type]}"><p class="callout-title">${md.renderInline(title)}</p>\n`;
      },
    });
  }
  md.core.ruler.before("inline", "quoted_callouts", (state) => {
    for (let i = 0; i < state.tokens.length; i++) {
      const open = state.tokens[i];
      if (
        open.type !== "blockquote_open" ||
        state.tokens[i + 1]?.type !== "paragraph_open"
      )
        continue;
      const inline = state.tokens[i + 2];
      const match = inline?.content.match(
        /^\[!(NOTE|INFO|TIP|IMPORTANT|WARNING|CAUTION|DANGER|DEFINITION)\]([+-]?)([^\n]*)(?:\n([\s\S]*))?$/i,
      );
      if (!match) continue;
      let closeIndex = i + 1,
        depth = 1;
      for (; closeIndex < state.tokens.length; closeIndex++) {
        if (state.tokens[closeIndex].type === "blockquote_open") depth++;
        if (
          state.tokens[closeIndex].type === "blockquote_close" &&
          --depth === 0
        )
          break;
      }
      const type = match[1].toLowerCase(),
        folded = Boolean(match[2]);
      open.tag = folded ? "details" : "div";
      open.attrSet(
        "class",
        `callout ${classes[type]}${folded ? " details" : ""}`,
      );
      if (match[2] === "+") open.attrSet("open", "");
      state.tokens[closeIndex].tag = open.tag;
      const titleOpen = new state.Token(
        "paragraph_open",
        folded ? "summary" : "p",
        1,
      );
      if (!folded) titleOpen.attrSet("class", "callout-title");
      const title = new state.Token("inline", "", 0);
      title.content = match[3].trim() || labels[type];
      title.children = [];
      const titleClose = new state.Token("paragraph_close", titleOpen.tag, -1);
      if (match[4]) inline.content = match[4];
      else state.tokens.splice(i + 1, 3);
      state.tokens.splice(i + 1, 0, titleOpen, title, titleClose);
      i += 3;
    }
  });

  // 重写源文件链接：Markdown -> 独立文章地址，内容图片 -> 本地发布资源。
  const resolveLink = (href, env) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href)) return href;
    if (href.startsWith("/")) return base + href.replace(/^\/+/, "");
    const split = href.search(/[?#]/),
      raw = split === -1 ? href : href.slice(0, split),
      suffix = split === -1 ? "" : href.slice(split);
    const file = path.resolve(
      path.dirname(env.sourcePath),
      decodeURIComponent(raw),
    );
    if (!within(path.join(root, "content"), file))
      throw new Error("内容链接越界：" + href);
    if (routes.has(file)) return base + routes.get(file) + suffix;
    if (/\.(?:png|jpe?g|webp|avif|gif|svg|pdf)$/i.test(raw))
      return (
        base +
        "assets/content/" +
        path
          .relative(path.join(root, "content"), file)
          .split(path.sep)
          .map(encodeURIComponent)
          .join("/") +
        suffix
      );
    throw new Error(
      "未找到内容链接，请使用 .md、站内绝对路径或完整 URL：" + href,
    );
  };
  const linkOpen =
    md.renderer.rules.link_open ||
    ((tokens, i, options, env, self) => self.renderToken(tokens, i, options));
  md.renderer.rules.link_open = (tokens, i, options, env, self) => {
    const token = tokens[i];
    token.attrSet("href", resolveLink(token.attrGet("href"), env));
    if (/^https?:/i.test(token.attrGet("href")))
      token.attrSet("rel", "noopener noreferrer");
    return linkOpen(tokens, i, options, env, self);
  };
  const image = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, i, options, env, self) => {
    tokens[i].attrSet("src", resolveLink(tokens[i].attrGet("src"), env));
    tokens[i].attrSet("loading", "lazy");
    return image(tokens, i, options, env, self);
  };
  md.renderer.rules.table_open = () =>
    '<div class="table-wrap" tabindex="0" role="region" aria-label="文章表格，可横向滚动"><table>\n';
  md.renderer.rules.table_close = () => "</table></div>\n";
  return md;
}

export function renderMarkdown(md, content, sourcePath) {
  const env = { sourcePath };
  const tokens = md.parse(content, env);
  const headings = tokens.flatMap((token, i) =>
    token.type === "heading_open" && token.attrGet("id")
      ? [
          {
            id: token.attrGet("id"),
            level: token.tag,
            title: tokens[i + 1].content,
          },
        ]
      : [],
  );
  const html = md.renderer.render(tokens, md.options, env);
  // 用解析后的 token 收集全文，避免将 KaTeX HTML、CSS 与公式的重复辅助层加入搜索。
  const text = tokens
    .filter((token) => token.type === "inline" || token.type === "fence")
    .map((token) =>
      token.type === "fence"
        ? token.content
        : (token.children || [])
            .filter(
              (child) => child.type === "text" || child.type === "code_inline",
            )
            .map((child) => child.content)
            .join(""),
    )
    .join(" ");
  return { html, headings, text };
}
