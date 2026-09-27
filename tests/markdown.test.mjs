import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createMarkdown, renderMarkdown } from "../scripts/markdown.mjs";
import { root, basePath } from "../scripts/lib.mjs";

// 回归检查解析器边界：提示块嵌套、公式与部署前缀容易在修改主题时被影响。
const source = path.join(root, "content/blog/notes/path.md");
const target = path.join(root, "content/blog/topics/observation.md");
const markdown = () =>
  createMarkdown("/MainPage/", new Map([[target, "blog/posts/observation/"]]));
const render = (content) => renderMarkdown(markdown(), content, source).html;

test("引用式提示块保留类型、标题与正文", () => {
  for (const [name, className] of [
    ["NOTE", "note"],
    ["TIP", "tip"],
    ["WARNING", "warning"],
    ["CAUTION", "danger"],
    ["IMPORTANT", "important"],
    ["DEFINITION", "definition"],
  ]) {
    const html = render(`> [!${name}] Custom title\n> Body\n\nEnd.`);
    assert(html.includes(`class="callout ${className}"`));
    assert(html.includes("Custom title"));
    assert(html.includes("Body"));
    assert(!html.includes(`[!${name}]`));
  }
});
test("嵌套提示块不会吞掉后续段落", () => {
  const html = render(
    "> [!NOTE] Outer\n> Text\n>\n> > [!WARNING] Inner\n> > Inner text\n\nAfter.",
  );
  assert.equal((html.match(/class="callout /g) || []).length, 2);
  assert(html.includes("<p>After.</p>"));
});
test("折叠状态与容器语法", () => {
  assert(render("> [!TIP]- Fold\n> Details.").includes("<details"));
  assert(!render("> [!TIP]- Fold\n> Details.").includes('open=""'));
  assert(render("> [!TIP]+ Open\n> Details.").includes('open=""'));
  assert(
    render("::: details Extra\nProof.\n:::").includes(
      "<summary>Extra</summary>",
    ),
  );
});
test("行内和带编号公式正确渲染", () => {
  const html = render("Inline $x^2$.\n\n$$\n\\bar{x}=10 \\tag{1}\n$$");
  assert(html.includes("katex"));
  assert(html.includes("<math"));
  assert(!html.includes("katex-error"));
});
test("源文件链接与图片携带项目路径前缀", () => {
  const html = render(
    "[Related](../topics/observation.md) ![Image](../../assets/example.svg)",
  );
  assert(html.includes("/MainPage/blog/posts/observation/"));
  assert(html.includes("/MainPage/assets/content/assets/example.svg"));
  assert.throws(() => render("[escape](../../../../package.json)"), /越界/);
});
test("HTML 字符转义与基础路径校验", () => {
  assert(render("<script>alert(1)</script>").includes("&lt;script&gt;"));
  assert.equal(basePath("/"), "/");
  assert.equal(basePath("MainPage"), "/MainPage/");
  assert.throws(() => basePath("/../"));
});
