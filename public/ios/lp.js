// 紹介ページの動き：段が画面に入ったら .on を付ける（1回だけ）。
// 動きを減らす設定・IntersectionObserver の無い端末では何もしない（最後の形のまま見せる）。
(function () {
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.documentElement.classList.add("js");
  document.addEventListener("DOMContentLoaded", function () {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } });
    }, { threshold: 0.3 });
    document.querySelectorAll("[data-play]").forEach(function (el) { io.observe(el); });
  });
})();
