// 紹介ページの動き（make_lp.py が書き出す）。JS が無い・IntersectionObserver が無い端末では、動かない形のまま見せる。
(function () {
  if (!("IntersectionObserver" in window)) return;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");
  document.addEventListener("DOMContentLoaded", function () {
    // 1 一番上：かけらが出たあと、それぞれの行の真ん中へ飛ぶ（飛ぶ先は実際の行の位置から測る）
    var hero = document.getElementById("hero");
    var bits = hero.querySelectorAll(".bit");
    bits.forEach(function (b, n) { b.style.setProperty("--n", n); });
    function aim() {
      bits.forEach(function (b) {
        var t = document.getElementById(b.dataset.to).getBoundingClientRect(), r = b.getBoundingClientRect();
        b.style.setProperty("--dx", (t.left + t.width / 2 - (r.left + r.width / 2)) + "px");
        b.style.setProperty("--dy", (t.top + t.height / 2 - (r.top + r.height / 2)) + "px");
      });
    }
    if (reduce) { hero.classList.add("go"); } else { setTimeout(function () { aim(); hero.classList.add("go"); }, 1500); }

    // 下の段：画面に入ったら1回だけ出す
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } });
    }, { threshold: 0.3 });
    document.querySelectorAll(".rv").forEach(function (el) { io.observe(el); });

    // 2〜4 スクロールで進む場面
    var story = document.getElementById("story");
    var D = JSON.parse(story.dataset.steps), N = D.steps.length;
    var caps = story.querySelectorAll(".cp"), layers = story.querySelectorAll(".L"), frames = story.querySelectorAll(".wf");
    var rips = {}; story.querySelectorAll(".rip").forEach(function (r) { rips[r.dataset.r] = r; });
    var note = story.querySelector(".img-note"), bar = story.querySelector(".bar i");
    var cur = -1, curFrame = "";
    function setStep(s, f) {
      var st = D.steps[s];
      if (s !== cur) {
        caps.forEach(function (c) { c.classList.toggle("vis", +c.dataset.c === st.cap); });
        layers.forEach(function (l) { l.classList.toggle("vis", l.dataset.l === st.layer); });
        note.classList.toggle("vis", st.layer === "join" || st.layer === "login");
        // 進んだ時だけ、押した所に波紋（戻る時は出さない）
        if (st.rip && s > cur && !reduce) { var r = rips[st.rip]; r.classList.remove("go"); void r.offsetWidth; r.classList.add("go"); }
        cur = s;
      }
      // 書く画面：その画面の 0〜j コマ目までを重ねて見せる（前のコマを消さないので白くならない）
      var key = "";
      if (st.type !== undefined) {
        var len = D.type[st.type], j = Math.min(len - 1, Math.floor(f * len * 1.25));
        key = st.type + ":" + j;
      }
      if (key !== curFrame) {
        frames.forEach(function (w) {
          w.classList.toggle("vis", st.type !== undefined && +w.dataset.t === st.type && +w.dataset.j <= j);
        });
        curFrame = key;
      }
    }
    var ticking = false;
    function update() {
      ticking = false;
      var r = story.getBoundingClientRect(), total = story.offsetHeight - innerHeight;
      var p = Math.min(Math.max(-r.top / total, 0), 0.9999);
      bar.parentNode.style.setProperty("--p", p);
      bar.style.setProperty("--p", p);
      var x = p * N, s = Math.floor(x);
      setStep(s, x - s);
    }
    addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener("resize", update);
    update();
  });
})();
