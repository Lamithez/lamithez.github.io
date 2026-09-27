// 内容保留在 HTML 中：无 JavaScript 时也能完整阅读。
const filters = [...document.querySelectorAll("[data-filter]")];
const publications = [...document.querySelectorAll(".publication")];
filters.forEach((button) =>
  button.addEventListener("click", () => {
    const type = button.dataset.filter;
    filters.forEach((item) =>
      item.setAttribute("aria-pressed", String(item === button)),
    );
    publications.forEach((item) => {
      item.hidden = type !== "all" && item.dataset.type !== type;
    });
    const count = publications.filter((item) => !item.hidden).length;
    document.querySelector("#filter-status").textContent =
      "显示 " + count + " 条著作";
  }),
);
const links = [...document.querySelectorAll(".section-nav a")];
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      links.forEach((link) =>
        link.setAttribute(
          "aria-current",
          String(link.hash === "#" + visible.target.id),
        ),
      );
    },
    { rootMargin: "-5% 0px -55% 0px" },
  );
  document
    .querySelectorAll("main .section")
    .forEach((section) => observer.observe(section));
}

// 按实际导航高度预留锚点位置，手机导航换行时也不遮住章节标题。
const navigation = document.querySelector(".section-nav");
function updateNavigationHeight() {
  document.documentElement.style.setProperty(
    "--scholar-nav-height",
    navigation.getBoundingClientRect().height + "px",
  );
}
updateNavigationHeight();
if ("ResizeObserver" in window)
  new ResizeObserver(updateNavigationHeight).observe(navigation);
links.forEach((link) =>
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.hash);
    if (!target) return;
    event.preventDefault();
    history.pushState(null, "", link.hash);
    const offset =
      parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) ||
      0;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - offset,
    });
  }),
);
