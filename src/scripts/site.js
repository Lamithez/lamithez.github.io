// 自定义消息或手机换行会改变公告高度；动态同步，避免覆盖导航和内容。
const notice = document.querySelector(".site-announcement");
function updateNoticeHeight() {
  document.documentElement.style.setProperty(
    "--notice-height",
    `${notice?.getBoundingClientRect().height || 0}px`,
  );
}
updateNoticeHeight();
if (notice && "ResizeObserver" in window)
  new ResizeObserver(updateNoticeHeight).observe(notice);
else window.addEventListener("resize", updateNoticeHeight);
