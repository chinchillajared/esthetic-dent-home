/* =============================================================================
 * site.js — progressive enhancement for the static pages
 * =============================================================================
 *
 * Loaded by the edge proxy, which injects
 *
 *     <script src="/assets/js/site.js" defer nonce="..."></script>
 *
 * before </body> on every HTML response.
 *
 * What this file does:
 *
 *   1. Mounts the right HubSpot consultation form into every
 *      [data-hubspot-form] container on the page. The site runs two of them —
 *      the international pages and the domestic /cr pages are separate HubSpot
 *      forms feeding separate pipelines.
 *   2. Remembers which of the two sites the visitor picked from the header
 *      switcher, in a cookie the edge reads when someone arrives at `/`. The
 *      switcher's links work without it; the cookie only stops the edge
 *      guessing at a visitor who has already told it.
 *   3. Pushes page and form events into the GTM dataLayer.
 *
 * Consultation requests do NOT come to this platform. The form is a HubSpot
 * form: HubSpot renders it and HubSpot receives it, which is where the sales
 * team works the leads. The backend endpoint that used to take them,
 * `POST /api/v1/leads`, was removed along with everything behind it — the spam
 * scoring, the attachment uploads and the lead tables.
 *
 * Every feature degrades. With JavaScript off, with the embed blocked, or on a
 * deployment where the HubSpot ids are not configured, the fallback paragraph
 * inside each container stays on the page and points the visitor at WhatsApp
 * and e-mail — which is why that text lives in the markup rather than here.
 *
 * Note: the static pages are not CMS-editable. Home, contact and FAQ copy is
 * changed by editing the markup and deploying.
 * ========================================================================== */
(function () {
  "use strict";

  /* HubSpot's embed loader, one script per portal. It scans the document for
     elements carrying `hs-form-frame` and renders the form named by their data
     attributes — the snippet HubSpot hands out under Marketing > Forms >
     Share. The form is embedded rather than posted to HubSpot's JSON forms API
     because that API refuses file uploads, and patients attach X-rays. */
  function embedUrl(portalId) {
    return "https://js.hsforms.net/forms/embed/" + encodeURIComponent(portalId) + ".js";
  }

  /* Written by the edge proxy from the HUBSPOT_* variables, the same way GTM_ID
     is (see nginx/docker-entrypoint.d/30-assemble-config.sh). The ids are a
     deployment setting rather than a source change, and an unconfigured
     deployment renders the fallback instead of a broken form. Shape:

       { portalId, formId, region,                      <- the default form
         forms: { cr: { portalId, formId, region } } }  <- the named ones

     A named form carries its own portalId because the two forms are not
     necessarily in the same HubSpot account; when they are, the edge writes the
     same portal id into both and nothing downstream has to care. */
  var config = window.__ESTHETIC_HUBSPOT__ || {};
  var namedForms = config.forms || {};

  /* Which form a container is asking for. `data-hubspot-form` carries the name
     ("cr" for the domestic site); an empty attribute means the default form,
     which is the international one. Names rather than ids live in the markup:
     the page says which audience it serves, and swapping the HubSpot form
     behind that name stays a deployment setting.

     Returns null when nothing usable is configured, which leaves the fallback
     paragraph on the page. A container asking for a name this deployment does
     not have never falls back to the default form — a domestic enquiry landing
     silently in the international pipeline is worse than no form at all. */
  function resolveForm(container) {
    var name = (container.getAttribute("data-hubspot-form") || "").trim();
    var named = name ? namedForms[name] : null;
    if (name && !named) return null;

    var source = named || config;
    var portalId = source.portalId || config.portalId;
    var formId =
      container.getAttribute("data-hubspot-form-id") || source.formId;
    if (!portalId || !formId) return null;

    return {
      name: name || "default",
      portalId: portalId,
      formId: formId,
      region:
        container.getAttribute("data-hubspot-region") ||
        source.region ||
        config.region ||
        "na1"
    };
  }

  /* -------------------------------------------------------------------------
   * Locale: /es/... is Spanish, everything else English. Matches the two
   * directories the site is published under.
   * ---------------------------------------------------------------------- */
  var locale = document.documentElement.lang === "es" ||
    window.location.pathname.indexOf("/es/") === 0
    ? "es"
    : "en";

  /* =========================================================================
   * Analytics
   * =========================================================================
   * dataLayer is created here rather than assumed, so an event fired before
   * GTM finishes loading is queued instead of lost — and everything still
   * works when GTM_ID is unset and no container is injected at all.
   * ====================================================================== */
  function track(eventName, payload) {
    window.dataLayer = window.dataLayer || [];
    var entry = { event: eventName };
    for (var key in payload || {}) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        entry[key] = payload[key];
      }
    }
    window.dataLayer.push(entry);
  }

  function currentPageKey() {
    var path = window.location.pathname;
    if (/\/blog\/[^/]+\/?$/.test(path)) return "blog-post";
    if (/\/blog\/?$/.test(path)) return "blog";
    return "home";
  }

  /* =========================================================================
   * Site switcher
   * =========================================================================
   * One domain carries two sites — /cr/ for patients already in Costa Rica,
   * /en/ and /es/ for patients travelling in — and the header of every page of
   * both carries a switcher between them.
   *
   * The links work on their own: they are ordinary hrefs to the other site's
   * home page, so the switcher functions with JavaScript off, and a crawler
   * follows them. All this adds is MEMORY. Without a cookie the edge would go
   * on guessing from the visitor's address every time they came back to the
   * bare domain, and would go on guessing wrong for the Costa Rican who wants
   * the international site or the expatriate who wants the nacional one.
   *
   * Which is the whole contract: the address is consulted once, at `/`, to
   * pick an opening guess; the moment the visitor expresses a preference it is
   * recorded and the guess is never made again. No page of either site is ever
   * withheld from any address.
   * ====================================================================== */
  var SITE_COOKIE = "ed_site";
  /* A year. Shorter would quietly start re-guessing for a patient whose
     treatment plan spans months, which is exactly the population this site
     serves. */
  var SITE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

  function rememberSite(site) {
    /* Anything else would be written straight into a Set-Cookie header. Only
       the two values the edge understands are ever sent. */
    if (site !== "cr" && site !== "intl") return;

    var cookie = SITE_COOKIE + "=" + site +
      "; path=/" +
      "; max-age=" + SITE_COOKIE_MAX_AGE +
      /* Lax, not Strict: arriving from a Google result or an email link is the
         normal way in, and Strict would withhold the cookie on exactly those
         visits — the visitor would be re-guessed at despite having chosen. */
      "; samesite=lax";

    /* Secure only where there is HTTPS to be secure about. A local plaintext
       deployment sets the attribute and the browser drops the cookie, which
       makes the feature untestable in development for no gain. */
    if (window.location.protocol === "https:") cookie += "; secure";

    try {
      document.cookie = cookie;
    } catch (err) {
      /* Cookies disabled. The link still navigates; only the memory is lost. */
    }
  }

  function wireSiteSwitch() {
    var links = document.querySelectorAll("a[data-site-switch]");

    for (var i = 0; i < links.length; i++) {
      /* No preventDefault anywhere in here. The cookie is written during the
         click, the browser then follows the href by itself, and a middle-click
         or a ctrl-click opens the other site in a new tab with the preference
         already recorded. */
      links[i].addEventListener("click", function () {
        var target = this.getAttribute("data-site-switch");
        rememberSite(target);
        track("site_switch", { from: currentSite(), to: target });
      });
    }
  }

  function currentSite() {
    return window.location.pathname.indexOf("/cr/") === 0 ? "cr" : "intl";
  }

  /* =========================================================================
   * Consultation form
   * ====================================================================== */
  function loadEmbed(portalId, onDone) {
    var script = document.createElement("script");
    script.src = embedUrl(portalId);
    script.defer = true;
    /* Carry the per-request nonce over from the tag that loaded this file. The
       CSP allows js.hsforms.net by host, so this is belt-and-braces — but it is
       what keeps the embed working if script-src is ever tightened. */
    var nonced = document.querySelector("script[nonce]");
    if (nonced) {
      script.setAttribute("nonce", nonced.nonce || nonced.getAttribute("nonce"));
    }
    script.onload = function () {
      onDone(true);
    };
    script.onerror = function () {
      onDone(false);
    };
    document.head.appendChild(script);
  }

  /* Ten seconds, polled twice a second. Long enough for a slow connection,
     short enough that a visitor staring at a broken form is not left there. */
  var FRAME_TIMEOUT_MS = 10000;

  /* HubSpot's iframe carries `scrolling="no"`, and that turns out to be
     final: browsers apply `overflow: clip` to it from their own stylesheet at
     a priority even an author `!important` rule cannot beat, and rewriting the
     `scrolling` attribute back to `yes` from here changes nothing either —
     confirmed by testing both directly. There is no way, from this side of a
     cross-origin frame, to recover content that does not fit, which is why
     this pads HubSpot's own number rather than trying to make the overflow
     recoverable.

     A single worst-case constant was tried first and rejected: sized for the
     narrowest column this form ever renders in, it left a wide desktop card
     with a wall of empty space below a form a third that tall — correct in
     the failure case, wrong in the ordinary one, and the ordinary one is what
     almost every visitor sees.

     HubSpot writes its own measurement to the container's inline `height`
     (never `min-height` — that property is exclusively ours, so reading
     `style.height` gets HubSpot's number even after this has already padded
     it). That measurement is not reliable, but it is not USELESS either:
     watched directly, the same form on the same page settled on `0`, on a
     number short by almost exactly one submit button, and — later, after the
     bot check finished loading — the correct one, on different loads with
     nothing else different. It is close more often than it is absent, so the
     fix is to trust it but not exactly: keep watching for as long as HubSpot
     might still revise it, and every time its number grows, set OUR floor to
     that number plus a safety margin — enough to absorb the "short by one
     control" case without re-introducing the wall of white space a blind
     worst-case guess produced. Only if HubSpot never reports anything usable
     does a moderate, height-agnostic default step in, so the form is at least
     scrollable-into-view rather than a blank card. */
  var HEIGHT_SAFETY_MARGIN_PX = 200;
  var HEIGHT_WATCH_MS = 20000;
  var HEIGHT_POLL_MS = 500;
  var FALLBACK_FLOOR_PX = 900;

  /* An <iframe> in the container proves nothing: a frame the browser refuses —
     blocked by CSP, by an extension, by a corporate proxy — still sits in the
     DOM. What separates the two is the origin. A refused frame stays on
     about:blank, which is same-origin and readable; HubSpot's real frame is
     cross-origin, so the browser refusing to hand over its document IS the
     success signal. */
  function frameIsHubspots(frame) {
    try {
      return frame.contentDocument === null;
    } catch (error) {
      return true;
    }
  }

  function ensureUsableHeight(container) {
    /* Seeded from the floor the skeleton already reserved, so a low reading
       from HubSpot can only raise the container, never shrink it back and
       drag the page up under the visitor. */
    var appliedFrom = parseFloat(container.style.minHeight) || 0;
    var elapsed = 0;

    var raise = function (hubspotHeight, isFinal) {
      var target = hubspotHeight > 0
        ? hubspotHeight + HEIGHT_SAFETY_MARGIN_PX
        : (isFinal ? FALLBACK_FLOOR_PX : 0);
      if (target <= appliedFrom) return;
      appliedFrom = target;
      container.style.minHeight = target + "px";
      track("lead_form_floor_applied", { locale: locale, measured: Math.round(hubspotHeight) });
    };

    var timer = window.setInterval(function () {
      elapsed += HEIGHT_POLL_MS;
      var hubspotHeight = parseFloat(container.style.height) || 0;
      var finished = elapsed >= HEIGHT_WATCH_MS;
      raise(hubspotHeight, finished);
      if (finished) window.clearInterval(timer);
    }, HEIGHT_POLL_MS);
  }

  /* The placeholder traces the real form: a heading, a paragraph of
     instructions, name/e-mail and phone/treatment side by side, the X-ray
     upload block with its explanatory lines, the message box, then submit.
     Following that shape is what makes it read as the form arriving rather
     than as a generic spinner. See the .form-skeleton note in the stylesheet
     for why it is built here and not written into the markup. */
  function buildSkeleton() {
    var root = document.createElement("div");
    root.className = "form-skeleton";
    root.setAttribute("data-hubspot-form-skeleton", "");
    /* Decorative. The accessible announcement is the fallback paragraph, which
       stays in the DOM as sr-only for as long as this is on screen. */
    root.setAttribute("aria-hidden", "true");

    var bars = 0;
    function bar(parent, width, height) {
      var el = document.createElement("div");
      el.className = "form-skeleton-bar";
      el.style.width = width;
      el.style.height = height;
      /* Capped so the last bars are not still waiting to start their first
         cycle while the first ones are on their second. */
      el.style.animationDelay = Math.min(bars * 0.06, 0.6) + "s";
      bars += 1;
      parent.appendChild(el);
      return el;
    }

    function block(className) {
      var el = document.createElement("div");
      el.className = className;
      root.appendChild(el);
      return el;
    }

    /* Heading, two lines. */
    var heading = block("form-skeleton-row");
    bar(heading, "70%", "1.75rem");
    bar(heading, "45%", "1.75rem");

    /* The paragraph under it. */
    var intro = block("form-skeleton-row");
    bar(intro, "100%", "0.625rem");
    bar(intro, "96%", "0.625rem");
    bar(intro, "62%", "0.625rem");

    /* Two rows of paired fields. */
    for (var p = 0; p < 2; p++) {
      var pair = block("form-skeleton-pair");
      for (var c = 0; c < 2; c++) {
        var cell = document.createElement("div");
        cell.className = "form-skeleton-row";
        bar(cell, c ? "42%" : "38%", "0.75rem");
        bar(cell, "100%", "2.75rem");
        pair.appendChild(cell);
      }
    }

    /* Upload: a label, the two lines explaining that it is optional, then the
       control itself. */
    var upload = block("form-skeleton-row");
    bar(upload, "52%", "0.75rem");
    bar(upload, "98%", "0.625rem");
    bar(upload, "74%", "0.625rem");
    bar(upload, "100%", "2.75rem");

    /* The message box. */
    var message = block("form-skeleton-row");
    bar(message, "34%", "0.75rem");
    bar(message, "100%", "9rem");

    var button = document.createElement("div");
    button.className = "form-skeleton-button";
    button.style.animationDelay = "0.66s";
    root.appendChild(button);

    return root;
  }

  function watchFrame(container, form) {
    var fallback = container.querySelector("[data-hubspot-form-fallback]");
    var skeleton = container.querySelector("[data-hubspot-form-skeleton]");
    var attempts = 0;

    var removeSkeleton = function () {
      if (skeleton && skeleton.parentNode) {
        skeleton.parentNode.removeChild(skeleton);
      }
    };

    var timer = window.setInterval(function () {
      attempts += 1;
      var frame = container.querySelector("iframe");

      if (frame && frameIsHubspots(frame)) {
        window.clearInterval(timer);
        removeSkeleton();
        if (fallback && fallback.parentNode) {
          fallback.parentNode.removeChild(fallback);
        }
        ensureUsableHeight(container);
        track("lead_form_ready", { locale: locale, form: form.name });
        return;
      }

      if (attempts * 500 >= FRAME_TIMEOUT_MS) {
        /* Whatever went wrong — a blocked script, a refused frame, a form id
           that no longer exists — the fallback comes back on screen, so the
           visitor keeps a way to reach the clinic, and the failure is visible
           in the dataLayer rather than only in someone's console. The skeleton
           goes with it: left running it would promise a form that is no longer
           coming. */
        window.clearInterval(timer);
        removeSkeleton();
        /* And give the reserved height back: nothing is coming to fill it, and
           a one-line paragraph stranded in a 900px box looks like the failure
           it is trying to soften. */
        container.style.minHeight = "";
        if (fallback) {
          fallback.className = fallback.className
            .replace(/(^|\s)sr-only(\s|$)/, "$1$2")
            .replace(/\s+/g, " ")
            .replace(/^\s|\s$/g, "");
        }
        track("lead_form_load_failed", { locale: locale, form: form.name });
      }
    }, 500);
  }

  function prepare(container, index, form) {
    if (!container.id) container.id = "hs-consultation-form-" + index;

    /* HubSpot reads the ids off the element itself. Writing them here rather
       than into the markup is what keeps a HubSpot account id out of the
       repository: the markup names the form, resolveForm turns that name into
       the ids this deployment was given. */
    container.className += (container.className ? " " : "") + "hs-form-frame";
    container.setAttribute("data-portal-id", form.portalId);
    container.setAttribute("data-form-id", form.formId);
    container.setAttribute("data-region", form.region);

    /* From here on something IS loading, so the placeholder earns its place.
       The fallback paragraph is not thrown away, only taken off screen: it is
       what a screen reader announces while the skeleton is up ("Loading the
       consultation form…"), and what comes back if the load never finishes. */
    var fallback = container.querySelector("[data-hubspot-form-fallback]");
    if (fallback) {
      fallback.className += (fallback.className ? " " : "") + "sr-only";
    }
    container.appendChild(buildSkeleton());

    /* Reserve the room the form is going to need, so arriving does not shove
       the rest of the page down. FALLBACK_FLOOR_PX is the number
       ensureUsableHeight settles on when HubSpot reports nothing usable —
       which is exactly what this deployment does, verified in the browser: the
       embed reports height 0 and the container ends up on the floor. Starting
       there means the placeholder occupies the same box the form will. */
    container.style.minHeight = FALLBACK_FLOOR_PX + "px";

    watchFrame(container, form);
  }

  /* HubSpot's form runs in an iframe and reports back by postMessage. Only the
     dataLayer is touched here — nothing arriving from another origin is allowed
     to change the page, and only HubSpot's own origins are listened to at all. */
  function listenForSubmissions(mounted) {
    window.addEventListener("message", function (event) {
      if (!/^https:\/\/([a-z0-9-]+\.)*hsforms\.(com|net)$/.test(String(event.origin))) {
        return;
      }
      var data = event.data;
      if (!data || data.type !== "hsFormCallback") return;
      if (data.eventName !== "onFormSubmitted") return;

      /* Which of the two forms was submitted. The message names the window it
         came from, and that window belongs to exactly one container on the
         page. Comparing window references across origins is allowed; reading
         anything out of the frame is not, and nothing here does. */
      var name = mounted.length === 1 ? mounted[0].form.name : "";
      for (var i = 0; i < mounted.length; i++) {
        var frame = mounted[i].container.querySelector("iframe");
        if (frame && frame.contentWindow === event.source) {
          name = mounted[i].form.name;
          break;
        }
      }

      track("lead_submitted", {
        locale: locale,
        page: currentPageKey(),
        form: name
      });
    });
  }

  function mountForms() {
    var containers = document.querySelectorAll("[data-hubspot-form]");
    if (!containers.length) return;

    var mounted = [];
    var portals = [];

    for (var i = 0; i < containers.length; i++) {
      var form = resolveForm(containers[i]);
      if (!form) {
        /* This deployment has no usable ids for the form this container asks
           for. The fallback paragraph stays: no broken form, and no console
           noise a visitor could not act on anyway. The name rides along so an
           unconfigured /cr deployment is distinguishable in the dataLayer from
           an unconfigured international one. */
        track("lead_form_unconfigured", {
          locale: locale,
          form: containers[i].getAttribute("data-hubspot-form") || "default"
        });
        continue;
      }

      prepare(containers[i], i, form);
      mounted.push({ container: containers[i], form: form });
      if (portals.indexOf(form.portalId) === -1) portals.push(form.portalId);
    }

    if (!mounted.length) return;
    listenForSubmissions(mounted);

    /* One embed script per portal, which is how HubSpot's loader is scoped: it
       renders the containers naming its own portal and ignores the rest. Two
       forms in one HubSpot account therefore load a single script; two accounts
       load one each. */
    for (var p = 0; p < portals.length; p++) {
      loadEmbed(portals[p], function (loaded) {
        if (!loaded) track("lead_form_load_failed", { locale: locale });
      });
    }
  }

  /* =========================================================================
   * Wire-up
   * ====================================================================== */
  function init() {
    wireSiteSwitch();
    mountForms();
    track("page_view_enhanced", {
      locale: locale,
      site: currentSite(),
      page: currentPageKey()
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
