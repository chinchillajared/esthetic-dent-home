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

    btn.addEventListener("mouseenter", function () {
      closeAllNav(btn);
      btn.setAttribute("aria-expanded", "true");
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
