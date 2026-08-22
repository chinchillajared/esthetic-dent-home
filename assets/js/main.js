(function () {
  "use strict";

  /* ---------------------------------------------------------------------
   * Desktop horizontal nav: dropdown menus
   * ------------------------------------------------------------------- */
  var navTriggers = Array.prototype.slice.call(
    document.querySelectorAll(".nav-trigger[data-nav]")
  );

  function closeAllNav(except) {
    navTriggers.forEach(function (btn) {
      if (btn !== except) btn.setAttribute("aria-expanded", "false");
    });
  }

  navTriggers.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var isOpen = btn.getAttribute("aria-expanded") === "true";
      closeAllNav(btn);
      btn.setAttribute("aria-expanded", isOpen ? "false" : "true");
      e.stopPropagation();
    });
  });

  /* Hover is tracked on every nav item — including the ones that are plain
     links with no dropdown — so moving the cursor onto a neighbour always
     closes whatever was open, instead of leaving a stale menu behind. */
  Array.prototype.slice
    .call(document.querySelectorAll("[data-desktop-nav] .nav-item"))
    .forEach(function (item) {
      var trigger = item.querySelector(".nav-trigger[data-nav]");
      item.addEventListener("mouseenter", function () {
        closeAllNav(trigger);
        if (trigger) trigger.setAttribute("aria-expanded", "true");
      });
      item.addEventListener("mouseleave", function () {
        if (trigger) trigger.setAttribute("aria-expanded", "false");
      });
    });

  var desktopNav = document.querySelector("[data-desktop-nav]");
  if (desktopNav) {
    desktopNav.addEventListener("mouseleave", function () {
      closeAllNav(null);
    });
  }

  document.addEventListener("click", function () {
    closeAllNav(null);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAllNav(null);
  });

  /* ---------------------------------------------------------------------
   * Mobile drawer: hamburger + accordion categories
   * ------------------------------------------------------------------- */
  var drawerToggle = document.querySelector("[data-drawer-toggle]");
  var drawer = document.querySelector("[data-drawer]");
  var drawerClose = document.querySelector("[data-drawer-close]");
  var drawerBackdrop = document.querySelector("[data-drawer-backdrop]");

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.remove("translate-x-full");
    document.body.classList.add("overflow-hidden");
    if (drawerToggle) drawerToggle.setAttribute("aria-expanded", "true");
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.add("translate-x-full");
    document.body.classList.remove("overflow-hidden");
    if (drawerToggle) drawerToggle.setAttribute("aria-expanded", "false");
  }

  if (drawerToggle) drawerToggle.addEventListener("click", openDrawer);
  if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeDrawer);

  var accordions = Array.prototype.slice.call(
    document.querySelectorAll("[data-accordion-trigger]")
  );
  accordions.forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      var panel = document.getElementById(
        trigger.getAttribute("aria-controls")
      );
      var isOpen = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", isOpen ? "false" : "true");
      if (panel) panel.classList.toggle("hidden", isOpen);
      var chevron = trigger.querySelector("[data-chevron]");
      if (chevron) chevron.classList.toggle("rotate-180", !isOpen);
    });
  });

  /* ---------------------------------------------------------------------
   * Hero photo carousel: auto-advance with fade. Only pauses while the
   * cursor/focus/touch is actually on the carousel; resumes as soon as it
   * leaves, regardless of whether the user clicked an arrow or dot.
   * ------------------------------------------------------------------- */
  var carouselEl = document.querySelector("[data-carousel]");
  if (carouselEl) {
    var slides = Array.prototype.slice.call(
      carouselEl.querySelectorAll("[data-slide]")
    );
    var dots = Array.prototype.slice.call(
      carouselEl.querySelectorAll("[data-carousel-dot]")
    );
    var prevBtn = carouselEl.querySelector("[data-carousel-prev]");
    var nextBtn = carouselEl.querySelector("[data-carousel-next]");
    var current = 0;
    var autoplayId = null;
    var prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    function goTo(index) {
      index = (index + slides.length) % slides.length;
      if (index === current) return;
      slides[current].classList.remove("is-active");
      dots[current].classList.remove("is-active");
      dots[current].setAttribute("aria-selected", "false");
      current = index;
      slides[current].classList.add("is-active");
      dots[current].classList.add("is-active");
      dots[current].setAttribute("aria-selected", "true");
    }

    function startAutoplay() {
      if (prefersReducedMotion || autoplayId) return;
      autoplayId = window.setInterval(function () {
        goTo(current + 1);
      }, 5500);
    }

    function stopAutoplay() {
      if (autoplayId) {
        window.clearInterval(autoplayId);
        autoplayId = null;
      }
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        goTo(current - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        goTo(current + 1);
      });
    }
    dots.forEach(function (dot, index) {
      dot.addEventListener("click", function () {
        goTo(index);
      });
    });

    carouselEl.addEventListener("mouseenter", stopAutoplay);
    carouselEl.addEventListener("mouseleave", startAutoplay);
    carouselEl.addEventListener("touchstart", stopAutoplay, { passive: true });
    carouselEl.addEventListener("touchend", startAutoplay);
    carouselEl.addEventListener("touchcancel", startAutoplay);
    carouselEl.addEventListener("focusin", stopAutoplay);
    carouselEl.addEventListener("focusout", function () {
      if (!carouselEl.contains(document.activeElement)) startAutoplay();
    });

    startAutoplay();
  }

  /* ---------------------------------------------------------------------
   * Footer copyright year — kept current without editing the markup
   * ------------------------------------------------------------------- */
  Array.prototype.slice
    .call(document.querySelectorAll("[data-current-year]"))
    .forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });

  /* ---------------------------------------------------------------------
   * Sticky topbar shadow on scroll
   * ------------------------------------------------------------------- */
  var topbar = document.querySelector("[data-topbar]");
  if (topbar) {
    var onScroll = function () {
      topbar.classList.toggle("shadow-card", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
})();
