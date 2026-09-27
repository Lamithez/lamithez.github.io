/** 原生浏览器脚本：配色、全文搜索、分区筛选、URL 状态与阅读目录。 */
const themeButtons = [...document.querySelectorAll("[data-theme]")];
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButtons.forEach((button) =>
    button.setAttribute("aria-pressed", String(button.dataset.theme === theme)),
  );
  try {
    localStorage.setItem("paper-theme", theme);
  } catch {
    /* 禁用本地存储时仍可正常阅读。 */
  }
}
let theme = "blue";
try {
  theme = localStorage.getItem("paper-theme") || theme;
} catch {
  /* 默认冷白墨蓝。 */
}
// 将旧版第三套配色的偏好迁移到深色主题。
if (theme === "teal") theme = "dark";
setTheme(["paper", "blue", "dark"].includes(theme) ? theme : "blue");
themeButtons.forEach((button) =>
  button.addEventListener("click", () => setTheme(button.dataset.theme)),
);

const data = document.querySelector("#search-data");
if (data) {
  // 搜索索引已嵌入生成的 HTML：没有后端或 CDN 请求，支持中文全文。
  const posts = JSON.parse(data.textContent);
  const list = document.querySelector("#posts");
  const search = document.querySelector("#search");
  const normalize = (text) => text.normalize("NFKC").toLowerCase();
  const searchable = new Map(
    posts.map((post) => [
      post.slug,
      normalize(
        [post.title, post.description, post.tags.join(" "), post.text].join(
          " ",
        ),
      ),
    ]),
  );
  const categoryNames = ["全部", "专题", "札记", "随想"];
  let category = "全部";
  function readURL() {
    const params = new URLSearchParams(location.search);
    category = categoryNames.includes(params.get("category"))
      ? params.get("category")
      : "全部";
    search.value = params.get("q") || "";
  }
  // 使用 DOM API 写入文字，避免文章标题或摘要被当作 HTML 执行。
  function row(post) {
    const link = document.createElement("a");
    link.className = "post";
    link.href = post.url;
    const date = document.createElement("div");
    date.className = "post-date";
    const time = document.createElement("time");
    time.dateTime = post.date;
    time.textContent = post.date.replaceAll("-", ".");
    date.append(time, document.createElement("br"), post.category);
    const content = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = post.title;
    const summary = document.createElement("p");
    summary.textContent = post.description;
    const tags = document.createElement("span");
    tags.className = "post-tags";
    tags.textContent = post.tags.join(" / ");
    content.append(title, summary, tags);
    const length = document.createElement("span");
    length.className = "post-length";
    length.textContent = "约 " + post.minutes + " 分钟 ↗";
    link.append(date, content, length);
    return link;
  }
  function render(updateURL = true) {
    const query = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    const matches = posts.filter(
      (post) =>
        (category === "全部" || post.category === category) &&
        query.every((word) => searchable.get(post.slug).includes(word)),
    );
    list.replaceChildren(...matches.map(row));
    document.querySelector("#empty").hidden = matches.length > 0;
    document.querySelector("#search-status").textContent =
      `${matches.length} 篇文章${query.length ? " · 已搜索标题、标签与全文" : ""}`;
    document.querySelector("#list-label").textContent =
      category === "全部" ? "全部写作" : category + " / 写作索引";
    document.querySelector("#list-title").textContent = {
      全部: "最近写下的",
      专题: "把知识连成体系",
      札记: "沿途记录的问题",
      随想: "暂时停留的念头",
    }[category];
    document
      .querySelectorAll(".filters [data-category]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.category === category),
        ),
      );
    if (updateURL) {
      const url = new URL(location.href);
      if (category === "全部") url.searchParams.delete("category");
      else url.searchParams.set("category", category);
      if (search.value.trim()) url.searchParams.set("q", search.value.trim());
      else url.searchParams.delete("q");
      history.replaceState(null, "", url);
    }
  }
  readURL();
  render(false);
  search.addEventListener("input", () => render());
  document.querySelectorAll("[data-category]").forEach((button) =>
    button.addEventListener("click", (event) => {
      event.preventDefault();
      category = button.dataset.category;
      render();
      if (button.closest(".categories"))
        document.querySelector("#archive").scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
    }),
  );
  window.addEventListener("popstate", () => {
    readURL();
    render(false);
  });
}

const toc = document.querySelector("#toc");
if (toc && "IntersectionObserver" in window) {
  const links = [...toc.querySelectorAll("a")];
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible)
        links.forEach((link) =>
          link.setAttribute(
            "aria-current",
            String(
              decodeURIComponent(link.hash.slice(1)) === visible.target.id,
            ),
          ),
        );
    },
    { rootMargin: "-5% 0px -65% 0px" },
  );
  document
    .querySelectorAll("article h2[id], article h3[id]")
    .forEach((heading) => observer.observe(heading));
}
