/* =============================================================================
 * landing-pages.js — the few behaviours the landing pages add on top of main.js
 * ========================================================================== */
(function () {
  "use strict";

  /* Header: transparent over the hero, solid once the page moves. */
  var header = document.querySelector("[data-lp-header]");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* Hero render: plays only while on screen, only from tablet width up, and
     never for visitors who asked for reduced motion or reduced data. Everyone
     else keeps the first frame, which preload="metadata" fetches for a few
     kilobytes instead of the whole 3 MB file. */
  var video = document.querySelector("[data-lp-video]");
  if (!video) return;

  var wide = window.matchMedia("(min-width: 768px)");
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var visible = false;

  function sync() {
    if (visible && wide.matches && !calm.matches && !saveData) {
      var attempt = video.play();
      if (attempt && typeof attempt.catch === "function") attempt.catch(function () {});
    } else if (!video.paused) {
      video.pause();
    }
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.15 }).observe(video);
  } else {
    visible = true;
    sync();
  }

  [wide, calm].forEach(function (query) {
    if (query.addEventListener) query.addEventListener("change", sync);
    else if (query.addListener) query.addListener(sync);
  });
})();

/* image-progress (PROVISIONAL): eliminar este bloque junto con image-progress.js */
(function () {
  var cs = document.currentScript;
  if (!cs || !cs.src) return;
  var s = document.createElement("script");
  s.src = cs.src.replace(/landing-pages\.js.*$/, "image-progress.js");
  document.body.appendChild(s);
})();
