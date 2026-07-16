(function () {
  "use strict";

  var page = document.querySelector(".inner-page");
  if (!page) return;

  var header = document.querySelector(".inner-header");
  var nav = document.querySelector("[data-inner-nav]");
  var menuButton = document.querySelector("[data-menu-toggle]");

  function updateHeader() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 18);
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  if (nav && menuButton) {
    menuButton.addEventListener("click", function () {
      var open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.textContent = open ? "Close" : "Menu";
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        nav.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.textContent = "Menu";
      }
    });
  }

  var revealItems = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var revealObserver = null;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function showRevealItem(item, immediate) {
    var delay = immediate ? 0 : parseInt(item.style.getPropertyValue("--reveal-delay"), 10) || 0;
    if (!delay) {
      item.classList.add("is-visible");
      return;
    }
    window.setTimeout(function () {
      item.classList.add("is-visible");
    }, delay);
  }

  function showRevealItems() {
    revealItems.forEach(function (item) { showRevealItem(item, true); });
    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }
  }

  function observeRevealItems() {
    if (
      typeof window.IntersectionObserver !== "function" ||
      reducedMotion.matches ||
      document.documentElement.classList.contains("motion-paused")
    ) {
      showRevealItems();
      return;
    }

    try {
      revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          showRevealItem(entry.target, false);
          observer.unobserve(entry.target);
        }
      });
      }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
      revealItems.forEach(function (item) { revealObserver.observe(item); });
    } catch (error) {
      showRevealItems();
    }
  }

  observeRevealItems();

  document.addEventListener("focusin", function (event) {
    var item = event.target.closest ? event.target.closest(".reveal") : null;
    if (item) showRevealItem(item, true);
  });

  document.addEventListener("chel:motionchange", function (event) {
    if (event.detail && event.detail.paused) showRevealItems();
  });

  Array.prototype.slice.call(document.querySelectorAll("[data-filter-rail]")).forEach(function (rail) {
    var targetName = rail.getAttribute("data-filter-rail");
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-filter-group="' + targetName + '"]'));

    rail.addEventListener("click", function (event) {
      var button = event.target.closest("[data-filter]");
      if (!button) return;
      var value = button.getAttribute("data-filter");

      rail.querySelectorAll("[data-filter]").forEach(function (chip) {
        chip.setAttribute("aria-pressed", String(chip === button));
      });

      items.forEach(function (item) {
        var categories = (item.getAttribute("data-category") || "").split(" ");
        item.hidden = value !== "all" && categories.indexOf(value) === -1;
      });
    });
  });

  var orbitPreview = document.querySelector("[data-orbit-preview]");
  var projectNodes = Array.prototype.slice.call(document.querySelectorAll("[data-project-node]"));

  function setProjectPreview(node) {
    if (!orbitPreview || !node) return;
    projectNodes.forEach(function (item) { item.classList.toggle("is-active", item === node); });
    var image = orbitPreview.querySelector("img");
    var meta = orbitPreview.querySelector("[data-preview-meta]");
    var title = orbitPreview.querySelector("[data-preview-title]");
    var description = orbitPreview.querySelector("[data-preview-description]");
    if (image) {
      image.src = node.getAttribute("data-image");
      image.alt = node.getAttribute("data-title") + " project cover";
    }
    if (meta) meta.textContent = node.getAttribute("data-meta");
    if (title) title.textContent = node.getAttribute("data-title");
    if (description) description.textContent = node.getAttribute("data-description");
  }

  projectNodes.forEach(function (node) {
    node.addEventListener("mouseenter", function () { setProjectPreview(node); });
    node.addEventListener("focus", function () { setProjectPreview(node); });
    node.addEventListener("click", function () { setProjectPreview(node); });
  });
  if (projectNodes[0]) setProjectPreview(projectNodes[0]);

  var lightbox = document.querySelector("[data-lightbox]");
  var mediaTiles = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox-item]"));
  var lightboxIndex = 0;

  function visibleMedia() {
    return mediaTiles.filter(function (tile) { return !tile.hidden; });
  }

  function renderLightbox(index) {
    if (!lightbox) return;
    var items = visibleMedia();
    if (!items.length) return;
    lightboxIndex = (index + items.length) % items.length;
    var tile = items[lightboxIndex];
    var image = lightbox.querySelector("[data-lightbox-image]");
    var title = lightbox.querySelector("[data-lightbox-title]");
    var meta = lightbox.querySelector("[data-lightbox-meta]");
    var count = lightbox.querySelector("[data-lightbox-count]");
    if (image) {
      image.src = tile.getAttribute("data-full");
      image.alt = tile.getAttribute("data-title");
    }
    if (title) title.textContent = tile.getAttribute("data-title");
    if (meta) meta.textContent = tile.getAttribute("data-meta");
    if (count) count.textContent = String(lightboxIndex + 1).padStart(2, "0") + " / " + String(items.length).padStart(2, "0");
  }

  if (lightbox) {
    mediaTiles.forEach(function (tile) {
      tile.addEventListener("click", function () {
        lightboxIndex = visibleMedia().indexOf(tile);
        renderLightbox(lightboxIndex);
        lightbox.showModal();
      });
    });

    lightbox.querySelector("[data-lightbox-close]").addEventListener("click", function () { lightbox.close(); });
    lightbox.querySelector("[data-lightbox-prev]").addEventListener("click", function () { renderLightbox(lightboxIndex - 1); });
    lightbox.querySelector("[data-lightbox-next]").addEventListener("click", function () { renderLightbox(lightboxIndex + 1); });
    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) lightbox.close();
    });
    lightbox.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") renderLightbox(lightboxIndex - 1);
      if (event.key === "ArrowRight") renderLightbox(lightboxIndex + 1);
    });
  }

  var commandDialog = document.createElement("dialog");
  commandDialog.className = "command-menu";
  commandDialog.setAttribute("aria-label", "Quick navigation");
  commandDialog.innerHTML =
    '<div class="command-shell">' +
      '<div class="command-head"><strong>Quick navigation</strong><button type="button" data-command-close aria-label="Close quick navigation">Esc</button></div>' +
      '<nav class="command-links" aria-label="Quick navigation links">' +
        '<a href="index.html"><span class="command-number">00</span><span>Home</span><span class="command-key">H</span></a>' +
        '<a href="index.html#about"><span class="command-number">01</span><span>About</span><span class="command-key">A</span></a>' +
        '<a href="work.html"><span class="command-number">02</span><span>Work</span><span class="command-key">W</span></a>' +
        '<a href="projects.html"><span class="command-number">03</span><span>Projects</span><span class="command-key">P</span></a>' +
        '<a href="gallery.html"><span class="command-number">04</span><span>Gallery</span><span class="command-key">G</span></a>' +
        '<a href="mailto:iam.chel1021@gmail.com"><span class="command-number">05</span><span>Email Chel</span><span class="command-key">E</span></a>' +
      '</nav>' +
    '</div>';
  document.body.appendChild(commandDialog);

  function openCommandMenu() {
    if (!commandDialog.open) commandDialog.showModal();
  }

  document.querySelectorAll("[data-command-trigger]").forEach(function (button) {
    button.addEventListener("click", openCommandMenu);
  });
  commandDialog.querySelector("[data-command-close]").addEventListener("click", function () { commandDialog.close(); });
  commandDialog.addEventListener("click", function (event) {
    if (event.target === commandDialog) commandDialog.close();
  });

  window.addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openCommandMenu();
    }
  });

  document.querySelectorAll("[data-current-year]").forEach(function (item) {
    item.textContent = String(new Date().getFullYear());
  });
})();
