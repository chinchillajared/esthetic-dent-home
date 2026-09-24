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

  /* Every panel hangs from the left edge of its nav item, so they all open
     the same way. The ones near the end of the row would reach past the
     viewport at the narrowest desktop width, where html{overflow-x:hidden}
     would silently shear off their right edge — so they are pulled back with
     a negative margin-left. margin, not transform: the open/close transition
     already owns the transform. Panels are laid out even while hidden, so
     they can be measured without opening them. */
  var EDGE_GAP = 16;

  function clampDropdowns() {
    Array.prototype.slice
      .call(document.querySelectorAll("[data-desktop-nav] .dropdown"))
      .forEach(function (menu) {
        menu.style.marginLeft = "";
        var limit = document.documentElement.clientWidth - EDGE_GAP;
        var overflow = menu.getBoundingClientRect().right - limit;
        if (overflow > 0) menu.style.marginLeft = "-" + Math.ceil(overflow) + "px";
      });
  }

  clampDropdowns();
  window.addEventListener("resize", clampDropdowns);

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
   * Step carousel (The Process...): one slide at a time, moved by arrows
   * ------------------------------------------------------------------- */
  var stepCarousel = document.querySelector("[data-process-carousel]");
  if (stepCarousel) {
    var stepTrack = stepCarousel.querySelector("[data-process-track]");
    var stepSlides = stepCarousel.querySelectorAll("[data-process-slide]");
    var stepPrev = stepCarousel.querySelector("[data-process-prev]");
    var stepNext = stepCarousel.querySelector("[data-process-next]");
    var stepCount = stepCarousel.querySelector("[data-process-count]");
    var stepIndex = 0;

    function updateStepCarousel() {
      if (!stepTrack) return;
      stepTrack.style.transform = "translateX(-" + stepIndex * 100 + "%)";
      if (stepCount)
        stepCount.textContent = stepIndex + 1 + " / " + stepSlides.length;
    }

    if (stepPrev) {
      stepPrev.addEventListener("click", function () {
        stepIndex = (stepIndex - 1 + stepSlides.length) % stepSlides.length;
        updateStepCarousel();
      });
    }
    if (stepNext) {
      stepNext.addEventListener("click", function () {
        stepIndex = (stepIndex + 1) % stepSlides.length;
        updateStepCarousel();
      });
    }

    updateStepCarousel();
  }

  /* ---------------------------------------------------------------------
   * Photo carousels: one photo at a time, moved by arrows. Unlike the two
   * carousels above there can be several on a page, so each one is wired
   * up independently and wraps around at the ends instead of disabling.
   * ------------------------------------------------------------------- */
  Array.prototype.slice
    .call(document.querySelectorAll("[data-photo-carousel]"))
    .forEach(function (photoCarousel) {
      var track = photoCarousel.querySelector("[data-photo-track]");
      var photoSlides = photoCarousel.querySelectorAll("[data-photo-slide]");
      var photoPrev = photoCarousel.querySelector("[data-photo-prev]");
      var photoNext = photoCarousel.querySelector("[data-photo-next]");
      var photoCount = photoCarousel.querySelector("[data-photo-count]");
      var photoDots = Array.prototype.slice.call(
        photoCarousel.querySelectorAll("[data-photo-dot]")
      );
      var photoIndex = 0;
      /* Some galleries (the hotel cards) are only a carousel on narrow
       * screens and fall back to a static grid above the width named in
       * data-photo-static-above, where every photo is on show. There the
       * track must not be moved and no slide may be hidden. */
      var staticAbove = photoCarousel.getAttribute("data-photo-static-above");
      var staticQuery = staticAbove
        ? window.matchMedia("(min-width: " + staticAbove + ")")
        : null;

      if (!track || !photoSlides.length) return;

      function showPhoto(index) {
        photoIndex = (index + photoSlides.length) % photoSlides.length;
        var isStatic = !!(staticQuery && staticQuery.matches);
        track.style.transform = isStatic
          ? ""
          : "translateX(-" + photoIndex * 100 + "%)";
        Array.prototype.slice.call(photoSlides).forEach(function (slide, i) {
          if (isStatic) slide.removeAttribute("aria-hidden");
          else
            slide.setAttribute(
              "aria-hidden",
              i === photoIndex ? "false" : "true"
            );
        });
        if (photoCount)
          photoCount.textContent =
            photoIndex + 1 + " / " + photoSlides.length;
        photoDots.forEach(function (dot, i) {
          dot.classList.toggle("is-active", i === photoIndex);
          dot.setAttribute("aria-selected", i === photoIndex ? "true" : "false");
        });
      }

      if (photoPrev) {
        photoPrev.addEventListener("click", function () {
          showPhoto(photoIndex - 1);
        });
      }
      if (photoNext) {
        photoNext.addEventListener("click", function () {
          showPhoto(photoIndex + 1);
        });
      }
      photoDots.forEach(function (dot, index) {
        dot.addEventListener("click", function () {
          showPhoto(index);
        });
      });
      if (staticQuery) {
        var onLayoutChange = function () {
          showPhoto(photoIndex);
        };
        if (staticQuery.addEventListener)
          staticQuery.addEventListener("change", onLayoutChange);
        else if (staticQuery.addListener) staticQuery.addListener(onLayoutChange);
      }

      showPhoto(0);
    });

  /* ---------------------------------------------------------------------
   * Photo lightbox: clicking a photo button opens the page's <dialog> with
   * that photo full size. The set the arrows walk through is whatever other
   * photo buttons share its [data-lightbox-group] container, so each gallery
   * on the page steps through its own photos and nothing else.
   *
   * A native <dialog> brings Esc, the focus trap and returning focus to the
   * photo that was clicked; where showModal is missing the buttons are left
   * unwired and the photos stay exactly as they render without JS.
   * ------------------------------------------------------------------- */
  var lightbox = document.querySelector("[data-lightbox]");
  if (lightbox && typeof lightbox.showModal === "function") {
    var lightboxImg = lightbox.querySelector("[data-lightbox-img]");
    var lightboxCaption = lightbox.querySelector("[data-lightbox-caption]");
    var lightboxCount = lightbox.querySelector("[data-lightbox-count]");
    var lightboxPrev = lightbox.querySelector("[data-lightbox-prev]");
    var lightboxNext = lightbox.querySelector("[data-lightbox-next]");
    var lightboxClose = lightbox.querySelector("[data-lightbox-close]");
    var lightboxStage = lightbox.querySelector("[data-lightbox-stage]");
    var lightboxGroup = [];
    var lightboxIndex = 0;

    function showLightboxPhoto(index) {
      if (!lightboxGroup.length || !lightboxImg) return;
      lightboxIndex = (index + lightboxGroup.length) % lightboxGroup.length;
      var photo = lightboxGroup[lightboxIndex].querySelector("img");
      if (!photo) return;
      /* currentSrc, so a photo the browser picked from a srcset opens as the
         file it actually downloaded rather than as a second request. */
      lightboxImg.src = photo.currentSrc || photo.src;
      lightboxImg.alt = photo.alt;
      if (lightboxCaption) lightboxCaption.textContent = photo.alt;
      /* One photo on its own needs no arrows and no counter. */
      var alone = lightboxGroup.length < 2;
      if (lightboxCount) {
        lightboxCount.textContent =
          lightboxIndex + 1 + " / " + lightboxGroup.length;
        lightboxCount.classList.toggle("hidden", alone);
      }
      if (lightboxPrev) lightboxPrev.classList.toggle("hidden", alone);
      if (lightboxNext) lightboxNext.classList.toggle("hidden", alone);
    }

    /* Delegated: galleries that only exist on some pages, and any photo added
       to one later, are covered by this single listener. */
    document.addEventListener("click", function (event) {
      var trigger =
        event.target && event.target.closest
          ? event.target.closest("[data-lightbox-open]")
          : null;
      if (!trigger) return;
      var group = trigger.closest("[data-lightbox-group]");
      lightboxGroup = Array.prototype.slice.call(
        (group || document).querySelectorAll("[data-lightbox-open]")
      );
      showLightboxPhoto(lightboxGroup.indexOf(trigger));
      lightbox.showModal();
      document.body.classList.add("overflow-hidden");
    });

    if (lightboxPrev) {
      lightboxPrev.addEventListener("click", function () {
        showLightboxPhoto(lightboxIndex - 1);
      });
    }
    if (lightboxNext) {
      lightboxNext.addEventListener("click", function () {
        showLightboxPhoto(lightboxIndex + 1);
      });
    }
    /* Every way out goes through here, Esc included, rather than through the
       dialog's close event: the page scroll has to be given back exactly
       once, whichever control the visitor used. */
    function closeLightbox() {
      document.body.classList.remove("overflow-hidden");
      lightbox.close();
    }

    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    /* Only a click on the stage itself, never one that landed on the photo or
       on a control sitting over it. */
    if (lightboxStage) {
      lightboxStage.addEventListener("click", function (event) {
        if (event.target === lightboxStage) closeLightbox();
      });
    }
    lightbox.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showLightboxPhoto(lightboxIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showLightboxPhoto(lightboxIndex + 1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      }
    });
    /* Belt and braces for any close the browser performs on its own. */
    lightbox.addEventListener("close", function () {
      document.body.classList.remove("overflow-hidden");
    });
  }

  /* ---------------------------------------------------------------------
   * Before/after compare sliders: the range input's value is written to
   * --compare, which main.css uses to clip the "before" photo and to
   * position the handle. Several of these can live on one page.
   * ------------------------------------------------------------------- */
  Array.prototype.slice
    .call(document.querySelectorAll("[data-compare-slider]"))
    .forEach(function (slider) {
      var input = slider.querySelector("[data-compare-input]");
      if (!input) return;

      function update() {
        slider.style.setProperty("--compare", input.value + "%");
      }

      input.addEventListener("input", update);
      update();
    });

  /* ---------------------------------------------------------------------
   * Footer copyright year — kept current without editing the markup
   * ------------------------------------------------------------------- */
  Array.prototype.slice
    .call(document.querySelectorAll("[data-current-year]"))
    .forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });

  /* ---------------------------------------------------------------------
   * FAQ browser: topic chips + full-text search over questions AND answers
   *
   * The answers live inside collapsed <details>, so a search that only read
   * the <summary> would keep hiding the very sentence that matched. This
   * indexes the whole item — question, answer, and the data-search keyword
   * list the markup carries for wording a patient might use but the copy
   * does not ("bone", "how many days") — then opens the matches and marks
   * the terms inside them, so the hit is visible without a second click.
   * ------------------------------------------------------------------- */
  var faqList = document.getElementById("faq-list");
  if (faqList) {
    var faqInput = document.getElementById("faq-search");
    var faqCount = document.getElementById("faq-count");
    var faqEmpty = document.getElementById("faq-empty");
    var faqChips = Array.prototype.slice.call(
      document.querySelectorAll(".faq-chip")
    );

    var faqGroups = Array.prototype.slice
      .call(faqList.querySelectorAll(".faq-group"))
      .map(function (group) {
        return {
          el: group,
          topic: group.getAttribute("data-topic") || "",
          items: Array.prototype.slice
            .call(group.querySelectorAll(".faq-item"))
            .map(function (item) {
              return {
                el: item,
                /* Snapshot of every child taken before anything is marked, so
                   clearing the search restores the original markup exactly
                   rather than trying to unpick nested <mark> elements. */
                parts: Array.prototype.slice.call(item.children).map(
                  function (part) {
                    return { el: part, html: part.innerHTML };
                  }
                ),
                /* textContent covers the question and the answer in one go,
                   because <summary> is a child of <details>. */
                haystack: (
                  item.textContent +
                  " " +
                  (item.getAttribute("data-search") || "")
                )
                  .toLowerCase()
                  .replace(/\s+/g, " "),
                marked: false,
                openedBySearch: false,
              };
            }),
        };
      });

    var faqTopic = "all";

    function faqEscape(term) {
      return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    /* Terms are ANDed: "how many days" should find the item containing all
       three words, not every item that happens to say "many". */
    function faqTerms(value) {
      return value
        .toLowerCase()
        .split(/\s+/)
        .filter(function (term) {
          return term.length > 0;
        });
    }

    function faqClearMarks(item) {
      if (!item.marked) return;
      item.parts.forEach(function (part) {
        part.el.innerHTML = part.html;
      });
      item.marked = false;
    }

    /* Wraps every occurrence of the query terms in <mark>, walking text nodes
       so the existing markup — the links inside a couple of answers —
       survives untouched. */
    function faqMark(item, pattern) {
      item.parts.forEach(function (part) {
        var walker = document.createTreeWalker(
          part.el,
          NodeFilter.SHOW_TEXT,
          null
        );
        var nodes = [];
        var node;
        while ((node = walker.nextNode())) nodes.push(node);

        nodes.forEach(function (textNode) {
          var text = textNode.nodeValue;
          pattern.lastIndex = 0;
          if (!pattern.test(text)) return;

          pattern.lastIndex = 0;
          var fragment = document.createDocumentFragment();
          var last = 0;
          var match;
          while ((match = pattern.exec(text))) {
            if (match.index > last) {
              fragment.appendChild(
                document.createTextNode(text.slice(last, match.index))
              );
            }
            var mark = document.createElement("mark");
            mark.textContent = match[0];
            fragment.appendChild(mark);
            last = match.index + match[0].length;
          }
          if (last < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(last)));
          }
          textNode.parentNode.replaceChild(fragment, textNode);
        });
      });
      item.marked = true;
    }

    function faqRender() {
      var query = faqInput ? faqInput.value.trim() : "";
      var terms = faqTerms(query);
      var pattern = terms.length
        ? new RegExp(terms.map(faqEscape).join("|"), "gi")
        : null;
      var visible = 0;

      faqGroups.forEach(function (group) {
        var inTopic = faqTopic === "all" || faqTopic === group.topic;
        var shown = 0;

        group.items.forEach(function (item) {
          var matches =
            inTopic &&
            terms.every(function (term) {
              return item.haystack.indexOf(term) !== -1;
            });

          faqClearMarks(item);
          item.el.hidden = !matches;

          if (matches && pattern) {
            shown++;
            faqMark(item, pattern);
            /* Open it so the highlighted answer is actually on screen, and
               remember that we did — a question the visitor opened by hand
               stays open once the search is cleared. */
            if (!item.el.open) {
              item.el.open = true;
              item.openedBySearch = true;
            }
            return;
          }

          if (matches) shown++;
          if (item.openedBySearch) {
            item.el.open = false;
            item.openedBySearch = false;
          }
        });

        group.el.hidden = shown === 0;
        visible += shown;
      });

      if (faqEmpty) faqEmpty.classList.toggle("hidden", visible > 0);

      if (faqCount) {
        if (!query && faqTopic === "all") {
          faqCount.textContent = "";
        } else if (visible === 0) {
          faqCount.textContent = "No matching questions";
        } else {
          faqCount.textContent =
            visible + (visible === 1 ? " question" : " questions") + " found";
        }
      }
    }

    function faqSetTopic(topic) {
      faqTopic = topic;
      faqChips.forEach(function (chip) {
        chip.setAttribute(
          "aria-pressed",
          (chip.getAttribute("data-filter") || "all") === topic ? "true" : "false"
        );
      });
    }

    faqChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        faqSetTopic(chip.getAttribute("data-filter") || "all");
        faqRender();
      });
    });

    /* Typing searches the whole page, not the topic that happened to be
       selected: a visitor who filters to Travel and then searches "warranty"
       means the warranty questions, not nothing. So the chips snap back to
       All topics as soon as the field is used, and the reset is visible
       rather than an invisible override of what the chips still show. */
    function faqSearchInput() {
      faqSetTopic("all");
      faqRender();
    }

    if (faqInput) {
      faqInput.addEventListener("input", faqSearchInput);
      /* Safari fires `search` — not `input` — for the native clear button. */
      faqInput.addEventListener("search", faqSearchInput);
      faqInput.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && faqInput.value) {
          e.stopPropagation();
          faqInput.value = "";
          faqSearchInput();
        }
      });
    }

    faqRender();
  }

  /* ---------------------------------------------------------------------
   * Sticky topbar: shadow once the page has scrolled at all, and a shorter
   * logo row past a bigger threshold so the shrink doesn't flicker in and
   * out at the very top of the page.
   * ------------------------------------------------------------------- */
  var topbar = document.querySelector("[data-topbar]");
  if (topbar) {
    var onScroll = function () {
      topbar.classList.toggle("shadow-card", window.scrollY > 8);
      topbar.classList.toggle("is-scrolled", window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------------------
   * Deep links to an anchor on another page (e.g. "Compare Prices" ->
   * prices-and-financing#comparison): with html{scroll-behavior:smooth}
   * set, Chrome's native jump-to-fragment on load is unreliable and often
   * leaves the page scrolled to the top. Do it ourselves once the page
   * has fully laid out, forcing an instant jump so it isn't cut off.
   * ------------------------------------------------------------------- */
  if (location.hash) {
    var deepLinkTarget = document.getElementById(location.hash.slice(1));
    if (deepLinkTarget) {
      var jumpToDeepLink = function () {
        var root = document.documentElement;
        var prevBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        deepLinkTarget.scrollIntoView({ block: "start" });
        root.style.scrollBehavior = prevBehavior;
      };
      if (document.readyState === "complete") {
        jumpToDeepLink();
      } else {
        window.addEventListener("load", jumpToDeepLink);
      }
    }
  }

  /* ---------------------------------------------------------------------
   * "Cookie settings": reopens HubSpot's consent banner so a visitor can
   * change what they previously agreed to.
   *
   * HubSpot hands this out as a <button onclick="..."> to paste in, and that
   * snippet cannot work on this site: the CSP carries script-src-attr 'none',
   * which is the directive that blocks inline event handlers specifically.
   * Same _hsp call, bound as a real listener instead.
   *
   * Delegated from the document so the one handler covers the footer of every
   * page, static or blog-rendered, with no per-page wiring.
   * ------------------------------------------------------------------- */
  document.addEventListener("click", function (event) {
    var trigger =
      event.target && event.target.closest
        ? event.target.closest("[data-cookie-settings]")
        : null;
    if (!trigger) return;
    /* Created here if the banner script has not run yet, exactly as HubSpot's
       own snippet does: the queue is drained once that script loads. */
    var hsp = (window._hsp = window._hsp || []);
    hsp.push(["showBanner"]);
  });

  /* ---------------------------------------------------------------------
   * Hero videos (data-hero-video): plays only while on screen, only from
   * tablet width up, and never for visitors who asked for reduced motion or
   * reduced data — same rationale as the landing pages' data-lp-video.
   * ------------------------------------------------------------------- */
  var heroVideos = Array.prototype.slice.call(document.querySelectorAll("[data-hero-video]"));
  if (heroVideos.length) {
    var heroWide = window.matchMedia("(min-width: 768px)");
    var heroCalm = window.matchMedia("(prefers-reduced-motion: reduce)");
    var heroSaveData = !!(navigator.connection && navigator.connection.saveData);

    heroVideos.forEach(function (video) {
      var visible = false;
      function sync() {
        if (visible && heroWide.matches && !heroCalm.matches && !heroSaveData) {
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
      heroWide.addEventListener("change", sync);
      heroCalm.addEventListener("change", sync);
    });
  }

  /* ---------------------------------------------------------------------
   * Click-to-play card videos (.card-video): silent, no native controls. The
   * overlay button toggles play/pause, and only one clip plays at a time.
   * ------------------------------------------------------------------- */
  var cardVideos = Array.prototype.slice.call(document.querySelectorAll(".card-video"));
  cardVideos.forEach(function (box) {
    var video = box.querySelector("video");
    var toggle = box.querySelector(".card-video-toggle");
    if (!video || !toggle) return;

    function label(playing) {
      toggle.setAttribute("aria-label", toggle.getAttribute(playing ? "data-label-pause" : "data-label-play"));
    }
    video.muted = true;
    video.addEventListener("play", function () {
      box.classList.add("is-playing");
      label(true);
      cardVideos.forEach(function (other) {
        var v = other.querySelector("video");
        if (v && v !== video && !v.paused) v.pause();
      });
    });
    function stopped() {
      box.classList.remove("is-playing");
      label(false);
    }
    video.addEventListener("pause", stopped);
    video.addEventListener("ended", stopped);
    toggle.addEventListener("click", function () {
      if (video.paused) {
        var attempt = video.play();
        if (attempt && typeof attempt.catch === "function") attempt.catch(function () {});
      } else {
        video.pause();
      }
    });
  });
})();

/* image-progress (PROVISIONAL): eliminar este bloque junto con image-progress.js */
(function () {
  var cs = document.currentScript;
  if (!cs || !cs.src) return;
  var s = document.createElement("script");
  s.src = cs.src.replace(/main\.js.*$/, "image-progress.js");
  document.body.appendChild(s);
})();
