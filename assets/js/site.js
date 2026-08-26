/* =============================================================================
 * site.js — backend integration for the static pages
 * =============================================================================
 *
 * Loaded by the edge proxy, which injects
 *
 *     <script src="/assets/js/site.js" defer nonce="..."></script>
 *
 * before </body> on every HTML response. Nothing in the existing markup was
 * changed to make this work, which is the point: index.html stays exactly as
 * the designer left it.
 *
 * What this file does:
 *
 *   1. Turns the consultation form into a real submission against
 *      POST /api/v1/leads, with client-side checks that mirror the server's.
 *   2. Replaces window.alert with a dialog built from the site's own palette
 *      and button shapes.
 *   3. Pushes form events into the GTM dataLayer.
 *
 * Every feature degrades: with JavaScript off the page renders exactly as it
 * does today.
 *
 * Note: the static pages are no longer CMS-editable. The previous CMS could
 * patch a heading or a photo here by CSS selector; Ghost has no equivalent, so
 * home, contact and FAQ copy is changed by editing the markup and deploying.
 * ========================================================================== */
(function () {
  "use strict";

  var API_BASE = "/api/v1";

  /* Mirrors backend/app/core/config.py. Duplicated on purpose — the server is
     the authority, this copy only saves the visitor a round trip. */
  var MAX_FILES = 5;
  var MAX_FILE_BYTES = 10 * 1024 * 1024;
  var ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf"];

  var pageLoadedAt = Date.now();

  /* -------------------------------------------------------------------------
   * Locale: /es/... is Spanish, everything else English. Matches the two
   * directories the site is published under.
   * ---------------------------------------------------------------------- */
  var locale = document.documentElement.lang === "es" ||
    window.location.pathname.indexOf("/es/") === 0
    ? "es"
    : "en";

  var T = {
    en: {
      sending: "Sending…",
      submit: "Request My Free Consultation",
      successTitle: "Thank you",
      errorTitle: "We could not send your request",
      networkError:
        "We could not reach our server. Please check your connection and try again.",
      tooManyFiles: "Please attach at most " + MAX_FILES + " files.",
      fileTooLarge: "Each file must be 10 MB or smaller: ",
      badFileType: "Only JPG, PNG and PDF files are accepted: ",
      rateLimited:
        "You have already sent several requests. Please wait a little while before trying again.",
      close: "Close",
      reference: "Your reference number is"
    },
    es: {
      sending: "Enviando…",
      submit: "Solicitar mi consulta gratuita",
      successTitle: "Gracias",
      errorTitle: "No pudimos enviar su solicitud",
      networkError:
        "No pudimos conectar con el servidor. Revise su conexión e inténtelo de nuevo.",
      tooManyFiles: "Adjunte un máximo de " + MAX_FILES + " archivos.",
      fileTooLarge: "Cada archivo debe pesar 10 MB o menos: ",
      badFileType: "Solo se aceptan archivos JPG, PNG o PDF: ",
      rateLimited:
        "Ya envió varias solicitudes. Espere un momento antes de intentarlo de nuevo.",
      close: "Cerrar",
      reference: "Su número de referencia es"
    }
  }[locale];

  /* =========================================================================
   * Branded dialog
   * =========================================================================
   * The project rules require that every alert look like the rest of the site,
   * so window.alert is never used. Built with the same palette, rounded
   * corners and button shapes as the page, and made accessible: focus moves
   * into the dialog, Escape closes it, and focus returns to wherever it was.
   * ====================================================================== */
  var lastFocused = null;

  function closeDialog() {
    var existing = document.querySelector("[data-ed-dialog]");
    if (!existing) return;
    existing.remove();
    document.body.classList.remove("overflow-hidden");
    document.removeEventListener("keydown", onDialogKeydown);
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  function onDialogKeydown(event) {
    if (event.key === "Escape") {
      closeDialog();
      return;
    }
    /* Focus trap: Tab must not walk out of the dialog into the page behind. */
    if (event.key !== "Tab") return;
    var dialog = document.querySelector("[data-ed-dialog]");
    if (!dialog) return;
    var focusable = dialog.querySelectorAll(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function showDialog(options) {
    closeDialog();
    lastFocused = document.activeElement;

    var isError = options.tone === "error";

    var overlay = document.createElement("div");
    overlay.setAttribute("data-ed-dialog", "");
    overlay.className =
      "fixed inset-0 z-[200] flex items-center justify-center bg-navy/60 px-4 backdrop-blur-sm";

    var panel = document.createElement("div");
    panel.className =
      "w-full max-w-md rounded-2xl bg-white p-6 shadow-card sm:p-8";
    panel.setAttribute("role", "alertdialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "ed-dialog-title");
    panel.setAttribute("aria-describedby", "ed-dialog-body");

    var badge = document.createElement("span");
    badge.className = isError
      ? "inline-flex items-center gap-1.5 rounded-full bg-blue/10 px-3.5 py-1.5 font-display text-[0.8rem] font-semibold uppercase tracking-wide text-blue"
      : "badge";
    badge.textContent = isError ? "!" : "✓";

    var heading = document.createElement("h2");
    heading.id = "ed-dialog-title";
    heading.className = "mt-4 font-display text-2xl font-bold text-navy";
    heading.textContent = options.title;

    var body = document.createElement("p");
    body.id = "ed-dialog-body";
    body.className = "mt-3 font-body text-[15px] leading-relaxed text-ink";
    /* textContent, never innerHTML: these strings can carry a server message. */
    body.textContent = options.message;

    var actions = document.createElement("div");
    actions.className = "mt-6 flex justify-end";

    var button = document.createElement("button");
    button.type = "button";
    button.className = "btn-primary";
    button.textContent = T.close;
    button.addEventListener("click", closeDialog);

    actions.appendChild(button);
    panel.appendChild(badge);
    panel.appendChild(heading);
    panel.appendChild(body);

    if (options.detail) {
      var detail = document.createElement("p");
      detail.className = "mt-2 font-body text-[0.8rem] text-ink/60";
      detail.textContent = options.detail;
      panel.appendChild(detail);
    }

    panel.appendChild(actions);
    overlay.appendChild(panel);

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) closeDialog();
    });

    document.body.appendChild(overlay);
    document.body.classList.add("overflow-hidden");
    document.addEventListener("keydown", onDialogKeydown);
    button.focus();
  }

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

  /* =========================================================================
   * Consultation form
   * ====================================================================== */
  function extension(filename) {
    var parts = String(filename || "").toLowerCase().split(".");
    return parts.length > 1 ? parts.pop() : "";
  }

  /* Client-side mirror of the server's upload rules. The server re-checks all
     of it by sniffing magic bytes; this only spares the visitor a 10 MB upload
     that was always going to be rejected. */
  function validateFiles(input) {
    if (!input || !input.files || !input.files.length) return null;
    var files = input.files;

    if (files.length > MAX_FILES) return T.tooManyFiles;

    for (var i = 0; i < files.length; i++) {
      if (ALLOWED_EXTENSIONS.indexOf(extension(files[i].name)) === -1) {
        return T.badFileType + files[i].name;
      }
      if (files[i].size > MAX_FILE_BYTES) {
        return T.fileTooLarge + files[i].name;
      }
    }
    return null;
  }

  function readAttribution() {
    var params = new URLSearchParams(window.location.search);
    return {
      page_url: window.location.href.split("#")[0],
      referrer: document.referrer || "",
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_term: params.get("utm_term") || "",
      utm_content: params.get("utm_content") || "",
      gclid: params.get("gclid") || ""
    };
  }

  function fieldErrorText(fields) {
    var messages = [];
    for (var key in fields || {}) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        messages.push(fields[key]);
      }
    }
    return messages.join(" ");
  }

  function setupLeadForm(form) {
    /* Honeypot. Added by script so it never appears in the served markup, and
       hidden from assistive technology as well as from sight — a screen-reader
       user must not be offered a field that disqualifies their submission. */
    var honeypot = document.createElement("input");
    honeypot.type = "text";
    honeypot.name = "website";
    honeypot.tabIndex = -1;
    honeypot.autocomplete = "off";
    honeypot.setAttribute("aria-hidden", "true");
    honeypot.style.cssText =
      "position:absolute;left:-9999px;width:1px;height:1px;opacity:0";
    form.appendChild(honeypot);

    var submitButton = form.querySelector("button[type='submit']");
    var originalLabel = submitButton ? submitButton.textContent : T.submit;
    var fileInput = form.querySelector("input[type='file']");
    var submitting = false;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (submitting) return;

      /* Let the browser's own constraint validation run first: it produces
         better, more familiar messages than anything built here would. */
      if (typeof form.reportValidity === "function" && !form.reportValidity()) {
        return;
      }

      var fileProblem = validateFiles(fileInput);
      if (fileProblem) {
        showDialog({ tone: "error", title: T.errorTitle, message: fileProblem });
        track("lead_validation_failed", { reason: "files" });
        return;
      }

      var payload = new FormData(form);
      var attribution = readAttribution();
      for (var key in attribution) {
        if (attribution[key]) payload.set(key, attribution[key]);
      }
      payload.set("locale", locale);
      /* How long the form was on screen. The server scores a sub-second fill
         as automated. */
      payload.set("elapsed_ms", String(Date.now() - pageLoadedAt));

      submitting = true;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = T.sending;
      }
      track("lead_submit_started", { locale: locale });

      fetch(API_BASE + "/leads", {
        method: "POST",
        body: payload,
        /* No credentials: the endpoint is anonymous and cookie-free, which is
           also why it needs no CSRF token. */
        credentials: "omit",
        headers: { Accept: "application/json" }
      })
        .then(function (response) {
          return response
            .json()
            .catch(function () {
              return {};
            })
            .then(function (data) {
              return { status: response.status, data: data };
            });
        })
        .then(function (result) {
          if (result.status === 201 || result.status === 200) {
            form.reset();
            showDialog({
              tone: "success",
              title: T.successTitle,
              message: result.data.message || T.successTitle,
              detail: result.data.reference
                ? T.reference + " " + result.data.reference
                : ""
            });
            track("lead_submitted", {
              locale: locale,
              attachments: result.data.attachments_received || 0
            });
            return;
          }

          if (result.status === 429) {
            showDialog({
              tone: "error",
              title: T.errorTitle,
              message: T.rateLimited
            });
            track("lead_submit_failed", { reason: "rate_limited" });
            return;
          }

          var error = result.data.error || {};
          showDialog({
            tone: "error",
            title: T.errorTitle,
            message:
              fieldErrorText(error.fields) || error.message || T.networkError,
            detail: result.data.request_id
              ? "Ref: " + result.data.request_id
              : ""
          });
          track("lead_submit_failed", {
            reason: error.code || String(result.status)
          });
        })
        .catch(function () {
          /* Network-level failure. No console.error: the project rules ask for
             a dialog the visitor can actually read. */
          showDialog({
            tone: "error",
            title: T.errorTitle,
            message: T.networkError
          });
          track("lead_submit_failed", { reason: "network" });
        })
        .then(function () {
          submitting = false;
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalLabel;
          }
        });
    });
  }

  function currentPageKey() {
    var path = window.location.pathname;
    if (/\/blog\/[^/]+\/?$/.test(path)) return "blog-post";
    if (/\/blog\/?$/.test(path)) return "blog";
    return "home";
  }

  /* =========================================================================
   * Wire-up
   * ====================================================================== */
  function init() {
    /* The consultation form is the one with a file input and a treatment
       select; matching on those rather than on an id means the markup needs no
       hook attribute added to it. */
    var forms = document.querySelectorAll("form");
    for (var i = 0; i < forms.length; i++) {
      if (forms[i].querySelector("[name='treatment'], [name='email']")) {
        setupLeadForm(forms[i]);
      }
    }

    track("page_view_enhanced", { locale: locale, page: currentPageKey() });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
