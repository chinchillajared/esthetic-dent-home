/* PROVISIONAL: barra de progreso de imagenes del sitio.
 * Se elimina al terminar de agregar imagenes: borrar este archivo y los
 * bloques marcados "image-progress" en main.js y landing-pages.js. */
(function () {
  "use strict";
  if (document.getElementById("img-progress-banner")) return;

  var EMPTY_RE = /(^|\/)empty\.webp(\?|#|$)/i;
  var REFRESH_MS = 60000;
  var CONCURRENCY = 6;

  var css = document.createElement("style");
  css.textContent =
    "#img-progress-banner{position:relative;z-index:60;background:#0f172a;color:#fff;font:600 14px/1.2 system-ui,sans-serif;padding:12px 16px;display:flex;align-items:center;gap:12px}" +
    "#img-progress-banner .ipb-label{white-space:nowrap;opacity:.85}" +
    "#img-progress-banner .ipb-track{flex:1;height:24px;background:rgba(255,255,255,.18);border-radius:999px;overflow:hidden;min-width:60px}" +
    "#img-progress-banner .ipb-fill{height:100%;width:0;border-radius:999px;background-color:#10b981;background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.35) 0,rgba(255,255,255,.35) 6px,transparent 6px,transparent 18px);background-size:18px 100%;transition:width .8s ease;animation:ipb-move .8s linear infinite}" +
    "#img-progress-banner .ipb-pct{min-width:56px;text-align:right;font-variant-numeric:tabular-nums}" +
    "#img-progress-banner .ipb-count{opacity:.7;white-space:nowrap;font-variant-numeric:tabular-nums}" +
    "@keyframes ipb-move{from{background-position:0 0}to{background-position:18px 0}}" +
    "@media(max-width:560px){#img-progress-banner .ipb-count{display:none}}" +
    "@media(prefers-reduced-motion:reduce){#img-progress-banner .ipb-fill{animation:none}}";
  document.head.appendChild(css);

  var bar = document.createElement("div");
  bar.id = "img-progress-banner";
  bar.setAttribute("role", "status");
  bar.innerHTML =
    '<span class="ipb-label">Imágenes agregadas (provisional)</span>' +
    '<div class="ipb-track"><div class="ipb-fill"></div></div>' +
    '<span class="ipb-pct">0%</span><span class="ipb-count"></span>';
  document.body.insertBefore(bar, document.body.firstChild);

  var fill = bar.querySelector(".ipb-fill");
  var pctEl = bar.querySelector(".ipb-pct");
  var countEl = bar.querySelector(".ipb-count");
  var shown = 0;
  var raf = 0;

  function render(real, total, pages) {
    var target = total ? (real / total) * 100 : 0;
    fill.style.width = target + "%";
    countEl.textContent = real + " / " + total + " imágenes · " + pages + " páginas";
    cancelAnimationFrame(raf);
    (function step() {
      var diff = target - shown;
      if (Math.abs(diff) < 0.05) shown = target;
      else shown += diff * 0.08;
      pctEl.textContent = shown.toFixed(1) + "%";
      if (shown !== target) raf = requestAnimationFrame(step);
    })();
  }

  function keyOf(u) {
    return u.pathname.replace(/index\.html$/, "");
  }

  function countImgs(doc) {
    var real = 0, empty = 0;
    Array.prototype.forEach.call(doc.querySelectorAll("img"), function (img) {
      var src = img.getAttribute("src") || img.getAttribute("data-src") || "";
      if (!src) return;
      if (EMPTY_RE.test(src)) empty++; else real++;
    });
    return { real: real, empty: empty };
  }

  function links(doc, base) {
    var out = [];
    Array.prototype.forEach.call(doc.querySelectorAll("a[href]"), function (a) {
      var u;
      try { u = new URL(a.getAttribute("href"), base); } catch (e) { return; }
      if (u.origin !== location.origin) return;
      if (/\/(maintenance|cr)\//.test(u.pathname)) return;
      if (!/(\/|\.html)$/.test(u.pathname)) return;
      u.hash = ""; u.search = "";
      out.push(u);
    });
    return out;
  }

  var DATA_URL = document.currentScript.src.replace(/image-progress\.js.*$/, "image-progress-data.js");
  var CACHE_KEY = "img-progress-total";
  var ROOTS = ["/en/", "/es/", "/landing-pages/"];

  function scan() {
    var seen = {}, queue = [], real = 0, empty = 0, active = 0, pages = 0;
    var hasCache = false;
    try { hasCache = !!localStorage.getItem(CACHE_KEY); } catch (e) {}

    function enqueue(u) {
      var k = keyOf(u);
      if (seen[k]) return;
      seen[k] = 1;
      queue.push(u);
    }
    ROOTS.forEach(function (r) { enqueue(new URL(r, location.origin)); });

    return new Promise(function (resolve) {
      function pump() {
        while (active < CONCURRENCY && queue.length) run(queue.shift());
        if (!active && !queue.length) {
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ real: real, total: real + empty, pages: pages })); } catch (e) {}
          render(real, real + empty, pages);
          resolve();
        }
      }
      function run(u) {
        active++;
        fetch(u.href, { cache: "no-store" })
          .then(function (r) { return r.ok ? r.text() : ""; })
          .then(function (html) {
            if (!html) return;
            var doc = new DOMParser().parseFromString(html, "text/html");
            var c = countImgs(doc);
            real += c.real; empty += c.empty; pages++;
            links(doc, u.href).forEach(enqueue);
            if (!hasCache) render(real, real + empty, pages);
          })
          .catch(function () {})
          .then(function () { active--; pump(); });
      }
      pump();
    });
  }

  try {
    var c = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (c) render(c.real, c.total, c.pages);
  } catch (e) {}

  // file:// bloquea fetch: se lee image-progress-data.js (lo genera
  // scripts/image-progress.py, con --watch se mantiene al dia).
  function loadData() {
    var sc = document.createElement("script");
    sc.src = DATA_URL + "?t=" + Date.now();
    sc.onload = function () {
      var d = window.__IMG_PROGRESS;
      if (d) render(d.real, d.total, d.pages);
      sc.remove();
      setTimeout(loadData, 3000);
    };
    sc.onerror = function () { sc.remove(); setTimeout(loadData, 3000); };
    document.head.appendChild(sc);
  }

  function loop() {
    scan().then(function () { setTimeout(loop, REFRESH_MS); });
  }
  if (location.protocol === "file:") loadData(); else loop();
})();
