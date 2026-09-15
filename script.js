(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const pad = (value) => String(value).padStart(2, "0");

  /* ---------- Theme ---------- */

  const THEME_KEY = "chel-theme";
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function storedTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || "dark";
    } catch (error) {
      return "dark";
    }
  }

  function applyTheme(preference) {
    const resolved = preference === "system" ? (darkQuery.matches ? "dark" : "light") : preference;
    document.documentElement.dataset.theme = resolved;
    $$("[data-theme-set]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.themeSet === preference));
    });
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = resolved === "dark" ? "#01030a" : "#ffffff";
  }

  $$("[data-theme-set]").forEach((button) => {
    button.addEventListener("click", () => {
      const preference = button.dataset.themeSet;
      try {
        localStorage.setItem(THEME_KEY, preference);
      } catch (error) {
        /* storage unavailable: theme still applies for this page view */
      }
      applyTheme(preference);
    });
  });

  darkQuery.addEventListener("change", () => {
    if (storedTheme() === "system") applyTheme("system");
  });

  applyTheme(storedTheme());

  /* ---------- Mobile menu ---------- */

  const mobileNav = $("#mobile-nav");
  const menuOpen = $("[data-menu-open]");

  function setMenu(open) {
    if (!mobileNav) return;
    mobileNav.classList.toggle("is-open", open);
    mobileNav.setAttribute("aria-hidden", String(!open));
    mobileNav.inert = !open;
    document.body.style.overflow = open ? "hidden" : "";
    if (menuOpen) menuOpen.setAttribute("aria-expanded", String(open));
    if (open) $("[data-menu-close]", mobileNav).focus();
    else if (menuOpen) menuOpen.focus({ preventScroll: true });
  }

  if (mobileNav) {
    mobileNav.inert = true;
    menuOpen.addEventListener("click", () => setMenu(true));
    $("[data-menu-close]", mobileNav).addEventListener("click", () => setMenu(false));
    $$("a", mobileNav).forEach((link) => link.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && mobileNav.classList.contains("is-open")) setMenu(false);
    });
  }

  /* ---------- Smooth scroll ---------- */

  // Wheel scrolling glides toward where it is heading instead of jumping in notches, and links to a
  // section of the same page ease there. Touch keeps its native momentum, and visitors who ask for
  // less motion keep the browser's own scrolling.
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fineQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const WHEEL_EASE = 200; // ms to close about two thirds of the remaining distance
  let scrollCurrent = 0;
  let scrollTarget = 0;
  let scrollTime = 0;
  let scrollFrame = 0;
  let scrollGlide = null;

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const maxScroll = () => document.documentElement.scrollHeight - document.documentElement.clientHeight;

  function stopSmoothScroll() {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    scrollGlide = null;
  }

  // An inner panel that can still move in this direction gets the wheel instead of the page.
  function canScrollInside(node, delta) {
    for (; node && node !== document.body; node = node.parentElement) {
      if (!/auto|scroll|overlay/.test(getComputedStyle(node).overflowY) || node.scrollHeight <= node.clientHeight) continue;
      if (delta > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 1 : node.scrollTop > 0) return true;
    }
    return false;
  }

  // A glide to a section follows a timed ease; the wheel chases its target with a steady ease-out.
  function scrollStep() {
    // Something else moved the page (scrollbar, keys, the browser), so let it lead.
    if (Math.abs(window.scrollY - scrollCurrent) > 2) {
      scrollFrame = 0;
      scrollGlide = null;
      return;
    }
    const now = performance.now();
    if (scrollGlide) {
      const progress = Math.min(1, (now - scrollGlide.start) / scrollGlide.duration);
      scrollCurrent = progress === 1 ? scrollTarget : scrollGlide.from + (scrollTarget - scrollGlide.from) * easeInOut(progress);
      if (progress === 1) scrollGlide = null;
    } else {
      scrollCurrent += (scrollTarget - scrollCurrent) * (1 - Math.exp(-Math.min(now - scrollTime, 64) / WHEEL_EASE));
      if (Math.abs(scrollTarget - scrollCurrent) < 0.5) scrollCurrent = scrollTarget;
    }
    scrollTime = now;
    window.scrollTo({ top: scrollCurrent, behavior: "instant" });
    scrollFrame = scrollGlide || scrollCurrent !== scrollTarget ? requestAnimationFrame(scrollStep) : 0;
  }

  function startScroll() {
    if (scrollFrame) return;
    scrollCurrent = scrollTarget = window.scrollY;
    scrollTime = performance.now();
    scrollFrame = requestAnimationFrame(scrollStep);
  }

  // Lands a section just below the scroll padding, where a plain anchor jump would put it.
  function scrollToSection(section) {
    if (motionQuery.matches) {
      section.scrollIntoView({ block: "start" });
      return;
    }
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const top = Math.round(Math.min(maxScroll(), Math.max(0, section.getBoundingClientRect().top + window.scrollY - padding)));
    // A repeat request for the same spot (a link that also switches the project filters) keeps the glide going.
    if (scrollGlide && Math.abs(scrollTarget - top) < 1) return;
    startScroll();
    const distance = Math.abs(top - scrollCurrent);
    if (distance < 1) return;
    scrollGlide = { from: scrollCurrent, start: performance.now(), duration: Math.min(1400, 500 + distance * 0.25) };
    scrollTarget = top;
  }

  window.addEventListener(
    "wheel",
    (event) => {
      if (motionQuery.matches || !fineQuery.matches || event.defaultPrevented || event.ctrlKey || event.shiftKey) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      // Open dialogs and the mobile menu handle their own scrolling while the page stays put.
      if (document.querySelector("dialog[open]") || document.body.style.overflow === "hidden") return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      if (canScrollInside(event.target, delta)) return;
      event.preventDefault();
      startScroll();
      // The wheel takes over from a section glide wherever the page happens to be.
      if (scrollGlide) {
        scrollGlide = null;
        scrollTarget = scrollCurrent;
      }
      scrollTarget = Math.min(maxScroll(), Math.max(0, scrollTarget + delta));
    },
    { passive: false }
  );

  const pagePath = (path) => path.replace(/index\.html$/, "");

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href*="#"]');
    // Keyboard activation (detail 0) keeps the native jump, which also moves focus into the section.
    if (!link || event.defaultPrevented || event.detail === 0 || event.button > 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target) return;
    if (link.origin !== location.origin || pagePath(link.pathname) !== pagePath(location.pathname)) return;
    const section = link.hash && document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!section || motionQuery.matches) return;
    event.preventDefault();
    if (link.hash !== location.hash) {
      history.pushState(null, "", link.hash);
      // pushState is silent, so let hash listeners such as the project filters catch up.
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
    scrollToSection(section);
  });

  window.addEventListener("pointerdown", stopSmoothScroll);
  window.addEventListener("keydown", stopSmoothScroll);

  /* ---------- Command palette ---------- */

  const destinations = [
    ["00", "Home", "index.html"],
    ["01", "About", "index.html#about"],
    ["02", "Development work", "projects.html#development"],
    ["03", "Image editing work", "projects.html#editing"],
    ["04", "Experience", "work.html"],
    ["05", "Photography gallery", "gallery.html"],
    ["06", "Full profile", "about.html"],
    ["07", "Download résumé", "assets/live/profile/gadores-resume.pdf"],
    ["08", "Email Chel", "mailto:chellegdrs@gmail.com"],
    ["09", "GitHub", "https://github.com/Wysi-Chel"],
    ["10", "LinkedIn", "https://www.linkedin.com/in/rachelle-gadores-589840248/"]
  ];

  const palette = document.createElement("dialog");
  palette.className = "palette";
  palette.setAttribute("aria-label", "Quick navigation");
  palette.innerHTML =
    '<div class="palette__inner">' +
    '<p class="palette__title">where to?</p>' +
    '<input class="palette__input" type="text" placeholder="type a page, e.g. editing" autocomplete="off" spellcheck="false" aria-label="Filter destinations" aria-controls="palette-list" />' +
    '<ul class="palette__list" id="palette-list" role="listbox"></ul>' +
    '<p class="palette__hint"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></p>' +
    "</div>";
  document.body.appendChild(palette);

  const paletteInput = $(".palette__input", palette);
  const paletteList = $(".palette__list", palette);
  let paletteMatches = [];
  let paletteIndex = 0;

  function renderPalette() {
    const query = paletteInput.value.trim().toLowerCase();
    paletteMatches = destinations.filter(([, label]) => label.toLowerCase().includes(query));
    paletteIndex = Math.min(paletteIndex, Math.max(paletteMatches.length - 1, 0));
    paletteList.innerHTML = paletteMatches.length
      ? paletteMatches
          .map(
            ([number, label, href], index) =>
              '<li><a class="palette__item" role="option" href="' + href + '" aria-selected="' + (index === paletteIndex) + '"' +
              (href.startsWith("http") ? ' target="_blank" rel="noreferrer"' : "") +
              "><span>" + number + "</span><span>" + label + "</span><span>" + (href.startsWith("http") ? "↗" : "→") + "</span></a></li>"
          )
          .join("")
      : '<li class="palette__empty">nothing matches that.</li>';
  }

  function openPalette() {
    if (palette.open) return;
    paletteInput.value = "";
    paletteIndex = 0;
    renderPalette();
    palette.showModal();
    paletteInput.focus();
  }

  paletteInput.addEventListener("input", () => {
    paletteIndex = 0;
    renderPalette();
  });

  paletteInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!paletteMatches.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      paletteIndex = (paletteIndex + step + paletteMatches.length) % paletteMatches.length;
      renderPalette();
    }
    if (event.key === "Enter") {
      const active = $('[aria-selected="true"]', paletteList);
      if (active) active.click();
    }
  });

  palette.addEventListener("click", (event) => {
    if (event.target === palette) palette.close();
    if (event.target.closest("a")) palette.close();
  });

  $$("[data-command-open]").forEach((button) => button.addEventListener("click", openPalette));

  if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
    $$("[data-mod-key]").forEach((key) => (key.textContent = "⌘"));
  }

  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (mobileNav && mobileNav.classList.contains("is-open")) setMenu(false);
      openPalette();
    }
  });

  /* ---------- Deck ---------- */

  $$("[data-deck]").forEach((deck) => {
    const cards = $$(".deck-card", deck);

    // Deal the cards out of a stack the first time the deck scrolls into view.
    if ("IntersectionObserver" in window) {
      deck.classList.add("is-stacked");
      const observer = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        setTimeout(() => deck.classList.remove("is-stacked"), 120);
      }, { threshold: 0.35 });
      observer.observe(deck);
    }

    function activate(card) {
      if (card.classList.contains("is-center")) return;
      const center = $(".deck-card.is-center", deck);
      const slot = card.classList.contains("is-left") ? "is-left" : "is-right";
      center.classList.replace("is-center", slot);
      card.classList.remove("is-left", "is-right");
      card.classList.add("is-center");
      cards.forEach((item) => item.setAttribute("aria-current", String(item === card)));
      stopVideo($("video", center));
    }

    cards.forEach((card) => {
      card.addEventListener("click", () => activate(card));
      card.addEventListener("keydown", (event) => {
        if (event.target !== card) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate(card);
        }
      });
    });
  });

  /* ---------- Card motion ---------- */

  $$("[data-card-motion]").forEach((grid) => {
    if (!("IntersectionObserver" in window)) return;
    const cards = $$(".project--motion", grid);
    cards.forEach((card, index) => {
      card.style.setProperty("--i", String(index));
      card.style.setProperty("--tilt", index % 2 ? "4deg" : "-4deg");
      card.classList.add("is-pending");
    });

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      cards.forEach((card) => {
        card.classList.replace("is-pending", "is-entering");
        card.addEventListener("animationend", () => card.classList.remove("is-entering"), { once: true });
      });
    }, { threshold: 0.15 });
    observer.observe(grid);
  });

  /* ---------- Scroll reveal ---------- */

  // Content below the fold rises into place as it scrolls into view. Whatever is on screen at load
  // arrives with the page itself, and the deck and development cards keep their own entrances.
  const REVEAL = [
    ".stats > .stat",
    ".section-head",
    ".track-head",
    ".subhead",
    ".section > .card-title",
    ".prose",
    ".quote",
    ".rows > .row",
    ".chips > .chip",
    ".cards > .soft-card",
    ".timeline > .entry",
    ".shots > .shot",
    ".editing-feature > *",
    ".project-grid > .project:not(.project--motion)",
    ".masonry > .tile",
    ".deck-hint",
    ".contact > *",
    ".section > .actions",
    ".footer"
  ].join(", ");

  if ("IntersectionObserver" in window && !motionQuery.matches) {
    const revealer = new IntersectionObserver(
      (entries) => {
        let order = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const node = entry.target;
          revealer.unobserve(node);
          // Items that arrive together follow one another in.
          node.style.setProperty("--reveal-delay", Math.min(order++, 6) * 70 + "ms");
          node.classList.replace("is-pending", "is-entering");
          node.addEventListener("animationend", function settle(event) {
            if (event.target !== node) return;
            node.removeEventListener("animationend", settle);
            node.classList.remove("reveal", "is-entering");
            node.style.removeProperty("--reveal-delay");
          });
        });
      },
      { rootMargin: "0px 0px -32px 0px" }
    );

    // Measure everything before marking anything, so the page only lays out once. A target inside
    // another target moves with its parent.
    $$(REVEAL)
      .filter((node) => !node.parentElement.closest(REVEAL) && node.getBoundingClientRect().top > window.innerHeight)
      .forEach((node) => {
        node.classList.add("reveal", "is-pending");
        revealer.observe(node);
      });
  }

  /* ---------- Video previews (load on demand, never autoplay) ---------- */

  function playVideo(video) {
    if (!video || video.dataset.failed) return;
    if (!video.src) {
      video.src = video.dataset.src;
      video.muted = true;
    }
    const attempt = video.play();
    if (attempt) attempt.then(() => video.classList.add("is-playing")).catch(() => {});
  }

  function stopVideo(video) {
    if (!video) return;
    video.pause();
    video.classList.remove("is-playing");
  }

  $$("video[data-src]").forEach((video) => {
    const card = video.closest(".project, .deck-card") || video.closest(".media");
    const button = $("[data-video-open]", video.closest(".media"));

    video.addEventListener("error", () => {
      video.dataset.failed = "true";
      if (button) button.hidden = true;
    });

    card.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse") return;
      if (card.classList.contains("deck-card") && !card.classList.contains("is-center")) return;
      playVideo(video);
    });
    card.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") stopVideo(video);
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) $$("video[data-src]").forEach(stopVideo);
  });

  /* ---------- Recording viewer (full screen, zoomable) ---------- */

  const previews = $$("video[data-src]");

  if (previews.length) {
    const ZOOM_STEPS = [1, 1.5, 2, 3, 4];
    const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];

    const viewer = document.createElement("dialog");
    viewer.className = "lightbox viewer";
    viewer.setAttribute("aria-label", "Recording viewer");
    viewer.innerHTML =
      '<div class="lightbox__bar">' +
      '<span class="lightbox__count" aria-live="polite"></span>' +
      '<div class="lightbox__tools">' +
      '<button class="lightbox__tool viewer__step" type="button" data-zoom-step="-1" aria-label="Zoom out">−</button>' +
      '<button class="lightbox__tool viewer__level" type="button" data-zoom-fit>fit</button>' +
      '<button class="lightbox__tool viewer__step" type="button" data-zoom-step="1" aria-label="Zoom in">+</button>' +
      '<button class="lightbox__tool" type="button" data-lb-close aria-label="Close viewer">close ✕</button>' +
      "</div></div>" +
      '<div class="lightbox__stage viewer__stage">' +
      '<video class="viewer__video" muted loop playsinline preload="metadata"></video>' +
      '<button class="lightbox__nav lightbox__nav--prev" type="button" data-viewer-prev aria-label="Previous recording">←</button>' +
      '<button class="lightbox__nav lightbox__nav--next" type="button" data-viewer-next aria-label="Next recording">→</button>' +
      "</div>" +
      '<div class="viewer__controls">' +
      '<button class="lightbox__tool viewer__play" type="button" data-viewer-play></button>' +
      '<input class="viewer__seek" type="range" min="0" max="1000" step="1" value="0" aria-label="Seek" />' +
      '<span class="viewer__time">0:00 / 0:00</span>' +
      "</div>" +
      '<div class="lightbox__foot">' +
      '<div><p class="lightbox__title"></p><p class="lightbox__meta"></p></div>' +
      '<p class="viewer__hint"><span class="viewer__hint--mouse">click or scroll to zoom · drag to pan</span>' +
      '<span class="viewer__hint--touch">tap or pinch to zoom · drag to pan</span></p>' +
      "</div>";
    document.body.appendChild(viewer);

    const stage = $(".viewer__stage", viewer);
    const video = $(".viewer__video", viewer);
    const count = $(".lightbox__count", viewer);
    const title = $(".lightbox__title", viewer);
    const meta = $(".lightbox__meta", viewer);
    const level = $("[data-zoom-fit]", viewer);
    const zoomOut = $('[data-zoom-step="-1"]', viewer);
    const zoomIn = $('[data-zoom-step="1"]', viewer);
    const play = $("[data-viewer-play]", viewer);
    const seek = $(".viewer__seek", viewer);
    const time = $(".viewer__time", viewer);
    const pointers = new Map();
    let items = [];
    let index = 0;
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let resumeAt = 0;
    let gesture = null;
    let wheelTimer = 0;

    video.muted = true;

    const clock = (seconds) => {
      const whole = Math.floor(seconds || 0);
      return Math.floor(whole / 60) + ":" + pad(whole % 60);
    };

    // Pan limits stop a magnified recording from being dragged past its own edges.
    function render() {
      const limitX = Math.max(0, (video.offsetWidth * scale - stage.clientWidth) / 2);
      const limitY = Math.max(0, (video.offsetHeight * scale - stage.clientHeight) / 2);
      panX = Math.min(limitX, Math.max(-limitX, panX));
      panY = Math.min(limitY, Math.max(-limitY, panY));
      video.style.transform = scale > 1 ? "translate(" + panX + "px, " + panY + "px) scale(" + scale + ")" : "";
      viewer.classList.toggle("is-magnified", scale > 1);
      level.textContent = scale > 1 ? Math.round(scale * 10) / 10 + "×" : "fit";
      level.setAttribute("aria-label", scale > 1 ? "Zoomed to " + level.textContent + ", reset to fit" : "Fit to screen");
      zoomOut.setAttribute("aria-disabled", String(scale <= 1));
      zoomIn.setAttribute("aria-disabled", String(scale >= MAX_ZOOM));
    }

    // Zooms toward a screen point (the stage centre by default) so that point stays put.
    function zoomTo(next, clientX, clientY) {
      next = Math.min(MAX_ZOOM, Math.max(1, next));
      if (next < 1.02) next = 1;
      const box = stage.getBoundingClientRect();
      const offsetX = clientX === undefined ? 0 : clientX - box.left - box.width / 2;
      const offsetY = clientY === undefined ? 0 : clientY - box.top - box.height / 2;
      panX = offsetX - (next / scale) * (offsetX - panX);
      panY = offsetY - (next / scale) * (offsetY - panY);
      scale = next;
      render();
    }

    function stepZoom(direction) {
      const next =
        direction > 0
          ? ZOOM_STEPS.find((value) => value > scale + 0.01)
          : ZOOM_STEPS.findLast((value) => value < scale - 0.01);
      if (next) zoomTo(next);
    }

    function togglePlay() {
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    }

    function syncPlay() {
      play.textContent = video.paused ? "▶ play" : "‖ pause";
      play.setAttribute("aria-label", video.paused ? "Play recording" : "Pause recording");
    }

    function syncTime() {
      seek.value = video.duration ? String((video.currentTime / video.duration) * 1000) : "0";
      seek.setAttribute("aria-valuetext", clock(video.currentTime) + " of " + clock(video.duration));
      time.textContent = clock(video.currentTime) + " / " + clock(video.duration);
    }

    function show(nextIndex) {
      index = (nextIndex + items.length) % items.length;
      const preview = items[index];
      const media = preview.closest(".media");
      const card = preview.closest(".project, .deck-card") || media;
      const poster = $("img", media);
      const heading = $(".card-title", card);
      const label = $(".project__top span:last-child, .card-tags .tag", card);

      // Pick up where the hover preview left off.
      resumeAt = preview.currentTime || 0;
      stopVideo(preview);
      scale = 1;
      panX = 0;
      panY = 0;
      render();
      video.poster = poster ? poster.currentSrc || poster.src : "";
      video.src = preview.dataset.src;
      video.play().catch(() => {});
      syncTime();
      title.textContent = heading ? heading.textContent : "";
      meta.textContent = label ? label.textContent : "";
      count.textContent = pad(index + 1) + " / " + pad(items.length);
    }

    previews.forEach((preview) => {
      const media = preview.closest(".media");
      // Deck side cards take the first click to come forward; everywhere else a click opens the viewer.
      media.addEventListener("click", (event) => {
        const deckCard = media.closest(".deck-card");
        if (preview.dataset.failed || (deckCard && !deckCard.classList.contains("is-center"))) return;
        event.stopPropagation();
        items = previews.filter((item) => !item.dataset.failed && !item.closest("[hidden]"));
        viewer.classList.toggle("is-single", items.length < 2);
        show(items.indexOf(preview));
        viewer.showModal();
      });
    });

    video.addEventListener("loadedmetadata", () => {
      if (resumeAt && resumeAt < video.duration) video.currentTime = resumeAt;
      resumeAt = 0;
      render();
    });
    video.addEventListener("timeupdate", syncTime);
    video.addEventListener("durationchange", syncTime);
    video.addEventListener("play", syncPlay);
    video.addEventListener("pause", syncPlay);
    video.addEventListener("error", () => {
      if (video.getAttribute("src")) meta.textContent = "this recording could not be loaded";
    });

    seek.addEventListener("input", () => {
      if (video.duration) video.currentTime = (seek.value / 1000) * video.duration;
    });
    play.addEventListener("click", togglePlay);
    level.addEventListener("click", () => zoomTo(1));
    zoomOut.addEventListener("click", () => stepZoom(-1));
    zoomIn.addEventListener("click", () => stepZoom(1));
    $("[data-viewer-prev]", viewer).addEventListener("click", () => show(index - 1));
    $("[data-viewer-next]", viewer).addEventListener("click", () => show(index + 1));
    $("[data-lb-close]", viewer).addEventListener("click", () => viewer.close());

    viewer.addEventListener("close", () => {
      video.pause();
      // Drop the source so a large recording stops downloading once the viewer is closed.
      video.removeAttribute("src");
      video.load();
      // load() discards the queued pause event, so sync the button directly.
      syncPlay();
      scale = 1;
      panX = 0;
      panY = 0;
      render();
    });

    window.addEventListener("resize", () => {
      if (viewer.open) render();
    });

    viewer.addEventListener("keydown", (event) => {
      const key = event.key;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target === seek && /^(Arrow|Home|End|Page)/.test(key)) return;
      if (key === "+" || key === "=") stepZoom(1);
      else if (key === "-" || key === "_") stepZoom(-1);
      else if (key === "0") zoomTo(1);
      else if (key.toLowerCase() === "z") zoomTo(scale > 1 ? 1 : 2);
      else if (key === " " && !event.target.closest("button")) {
        event.preventDefault();
        togglePlay();
      } else if (key.startsWith("Arrow") && scale > 1) {
        event.preventDefault();
        panX += key === "ArrowLeft" ? 80 : key === "ArrowRight" ? -80 : 0;
        panY += key === "ArrowUp" ? 80 : key === "ArrowDown" ? -80 : 0;
        render();
      } else if ((key === "ArrowLeft" || key === "ArrowRight") && items.length > 1) {
        show(index + (key === "ArrowRight" ? 1 : -1));
      }
    });

    /* Click or tap toggles zoom at that point, drag pans, pinch and wheel zoom, and an
       unzoomed touch swipe moves between recordings. */

    const spread = () => {
      const [a, b] = Array.from(pointers.values());
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
    };

    stage.addEventListener("pointerdown", (event) => {
      if (event.button > 0 || event.target.closest("button") || pointers.size > 1) return;
      stage.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      viewer.classList.add("is-gesturing");
      if (pointers.size === 1) {
        gesture = { type: "tap", x: event.clientX, y: event.clientY, onVideo: event.target === video };
      } else {
        gesture = { type: "pinch", distance: spread().distance, scale };
      }
    });

    stage.addEventListener("pointermove", (event) => {
      const last = pointers.get(event.pointerId);
      if (!last) return;
      const before = pointers.size === 2 ? spread() : null;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (before) {
        const after = spread();
        panX += after.x - before.x;
        panY += after.y - before.y;
        zoomTo(gesture.scale * (after.distance / gesture.distance), after.x, after.y);
        return;
      }
      if (gesture.type === "tap" && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6) {
        gesture.type = "drag";
      }
      if (scale > 1) {
        panX += event.clientX - last.x;
        panY += event.clientY - last.y;
        render();
      }
    });

    function release(event) {
      if (!pointers.delete(event.pointerId) || pointers.size) return;
      viewer.classList.remove("is-gesturing");
      if (event.type === "pointercancel") return;
      if (gesture.type === "tap" && gesture.onVideo) {
        zoomTo(scale > 1 ? 1 : 2, event.clientX, event.clientY);
      } else if (gesture.type === "drag" && scale === 1 && event.pointerType !== "mouse" && items.length > 1) {
        const deltaX = event.clientX - gesture.x;
        if (Math.abs(deltaX) > 50) show(index + (deltaX < 0 ? 1 : -1));
      }
    }

    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);

    stage.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
        viewer.classList.add("is-gesturing");
        // Trackpad pinches arrive as ctrl + wheel with small deltas, so they get a faster rate.
        zoomTo(scale * Math.exp(-delta * (event.ctrlKey ? 0.01 : 0.0015)), event.clientX, event.clientY);
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => {
          if (!pointers.size) viewer.classList.remove("is-gesturing");
        }, 150);
      },
      { passive: false }
    );

    syncPlay();
    render();
  }

  /* ---------- Before / after ---------- */

  $$(".compare").forEach((compare) => {
    const range = $(".compare__range", compare);
    const update = () => {
      compare.style.setProperty("--pos", range.value + "%");
      range.setAttribute("aria-valuetext", range.value + "% before, " + (100 - range.value) + "% after");
    };
    range.addEventListener("input", update);
    update();
  });

  /* ---------- Filters ---------- */

  $$("[data-filters]").forEach((rail) => {
    const name = rail.dataset.filters;
    const items = $$('[data-group="' + name + '"]');
    const buttons = $$("[data-filter]", rail);
    const useHash = rail.hasAttribute("data-filter-hash");

    function select(value, updateHash) {
      buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.filter === value)));
      items.forEach((item) => {
        const categories = item.dataset.category.split(" ");
        item.hidden = value !== "all" && !categories.includes(value);
        if (item.hidden) $$("video", item).forEach(stopVideo);
      });
      if (useHash && updateHash) {
        history.replaceState(null, "", value === "all" ? location.pathname + location.search : "#" + value);
      }
    }

    buttons.forEach((button) => button.addEventListener("click", () => select(button.dataset.filter, true)));

    if (useHash) {
      const fromHash = () => {
        const value = location.hash.slice(1);
        if (!buttons.some((button) => button.dataset.filter === value)) return;
        select(value, false);
        // Hiding the other track shifts the layout, so re-align with the requested section.
        requestAnimationFrame(() => scrollToSection(document.getElementById(value)));
      };
      window.addEventListener("hashchange", fromHash);
      fromHash();
    }
  });

  /* ---------- Lightbox ---------- */

  const lightbox = $("[data-lightbox]");

  if (lightbox) {
    const image = $(".lightbox__img", lightbox);
    const title = $(".lightbox__title", lightbox);
    const meta = $(".lightbox__meta", lightbox);
    const count = $(".lightbox__count", lightbox);
    const original = $("[data-lb-original]", lightbox);
    const zoom = $("[data-lb-zoom]", lightbox);
    const stage = $(".lightbox__stage", lightbox);
    const triggers = $$("[data-lightbox-item]");
    let list = [];
    let index = 0;

    function setZoom(on, event) {
      lightbox.classList.toggle("is-zoomed", on);
      zoom.setAttribute("aria-pressed", String(on));
      zoom.textContent = on ? "fit to screen" : "zoom 100%";
      if (on && event && image.naturalWidth) {
        const rect = image.getBoundingClientRect();
        const rx = (event.clientX - rect.left) / rect.width;
        const ry = (event.clientY - rect.top) / rect.height;
        requestAnimationFrame(() => {
          stage.scrollLeft = rx * image.naturalWidth - stage.clientWidth / 2;
          stage.scrollTop = ry * image.naturalHeight - stage.clientHeight / 2;
        });
      }
    }

    function show(nextIndex) {
      index = (nextIndex + list.length) % list.length;
      const item = list[index];
      setZoom(false);
      image.classList.add("is-loading");
      image.src = item.dataset.full;
      image.alt = item.dataset.title;
      title.textContent = item.dataset.title;
      meta.textContent = item.dataset.meta || "";
      count.textContent = pad(index + 1) + " / " + pad(list.length);
      original.href = item.dataset.original || item.dataset.full;
      [list[index + 1], list[index - 1]].forEach((neighbour) => {
        if (neighbour) new Image().src = neighbour.dataset.full;
      });
    }

    image.addEventListener("load", () => image.classList.remove("is-loading"));

    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const group = trigger.dataset.lightboxItem;
        list = triggers.filter((item) => item.dataset.lightboxItem === group && !item.closest("[hidden]"));
        lightbox.classList.toggle("is-single", list.length < 2);
        show(list.indexOf(trigger));
        lightbox.showModal();
      });
    });

    $("[data-lb-prev]", lightbox).addEventListener("click", () => show(index - 1));
    $("[data-lb-next]", lightbox).addEventListener("click", () => show(index + 1));
    $("[data-lb-close]", lightbox).addEventListener("click", () => lightbox.close());
    zoom.addEventListener("click", () => setZoom(!lightbox.classList.contains("is-zoomed")));
    image.addEventListener("click", (event) => setZoom(!lightbox.classList.contains("is-zoomed"), event));

    lightbox.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" && list.length > 1) show(index - 1);
      if (event.key === "ArrowRight" && list.length > 1) show(index + 1);
      if (event.key.toLowerCase() === "z") setZoom(!lightbox.classList.contains("is-zoomed"));
    });

    lightbox.addEventListener("close", () => setZoom(false));

    let startX = null;
    stage.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse") startX = event.clientX;
    });
    stage.addEventListener("pointerup", (event) => {
      if (startX === null || lightbox.classList.contains("is-zoomed") || list.length < 2) return;
      const delta = event.clientX - startX;
      startX = null;
      if (Math.abs(delta) > 50) show(index + (delta < 0 ? 1 : -1));
    });
  }

  /* ---------- Copy email ---------- */

  $$("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const label = button.textContent;
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = "Copied";
        if (window.siteSound) window.siteSound.play("success");
      } catch (error) {
        button.textContent = "Press Ctrl+C";
        const range = document.createRange();
        range.selectNodeContents(button.previousElementSibling);
        getSelection().removeAllRanges();
        getSelection().addRange(range);
      }
      setTimeout(() => (button.textContent = label), 1800);
    });
  });

  $$("[data-year]").forEach((node) => (node.textContent = String(new Date().getFullYear())));
})();
