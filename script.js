(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

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
    if (meta) meta.content = resolved === "dark" ? "#030818" : "#ffffff";
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

  /* ---------- Video previews (load on demand, never autoplay) ---------- */

  function playVideo(video) {
    if (!video || video.dataset.failed) return;
    if (!video.src) {
      video.src = video.dataset.src;
      video.muted = true;
    }
    const media = video.closest(".media");
    const attempt = video.play();
    if (attempt) {
      attempt
        .then(() => {
          video.classList.add("is-playing");
          media.classList.add("is-playing");
        })
        .catch(() => {});
    }
  }

  function stopVideo(video) {
    if (!video) return;
    video.pause();
    video.classList.remove("is-playing");
    const media = video.closest(".media");
    if (media) media.classList.remove("is-playing");
  }

  $$("video[data-src]").forEach((video) => {
    const card = video.closest(".project, .deck-card") || video.closest(".media");
    const button = $(".media__play", video.closest(".media"));

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

    if (button) {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (video.paused) playVideo(video);
        else stopVideo(video);
      });
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) $$("video[data-src]").forEach(stopVideo);
  });

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
        requestAnimationFrame(() => document.getElementById(value).scrollIntoView({ block: "start" }));
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

    const pad = (value) => String(value).padStart(2, "0");

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
