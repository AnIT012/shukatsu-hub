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
    // 録画：画面に入ったら頭から流す（押す所から見えるように）。出たら止める
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var vo = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { if (!reduce) { v.currentTime = 0; var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
        else { v.pause(); }
      });
    }, { threshold: 0.6 });
    document.querySelectorAll("video").forEach(function (v) { vo.observe(v); });
  });
})();
