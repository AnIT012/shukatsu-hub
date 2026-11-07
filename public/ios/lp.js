// 紹介ページの動き（make_lp.py が書き出す）。段が画面に入ったら .on を付ける（1回だけ）。
// IntersectionObserver の無い端末では何もしない（動かない形のまま見せる）。
(function () {
  if (!("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("js");
  document.addEventListener("DOMContentLoaded", function () {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } });
    }, { threshold: 0.35 });
    document.querySelectorAll(".rv").forEach(function (el) { io.observe(el); });
  });
})();
