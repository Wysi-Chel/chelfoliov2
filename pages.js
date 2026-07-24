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
    if (typeof window.IntersectionObserver !== "function") {
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

  Array.prototype.slice.call(document.querySelectorAll("[data-filter-rail]")).forEach(function (rail) {
    var targetName = rail.getAttribute("data-filter-rail");
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-filter-group="' + targetName + '"]'));
    var filterLayout = document.querySelector('[data-filter-layout="' + targetName + '"]');

    rail.addEventListener("click", function (event) {
      var button = event.target.closest("[data-filter]");
      if (!button) return;
      var value = button.getAttribute("data-filter");
      if (filterLayout) filterLayout.setAttribute("data-layout-filter", value);

      rail.querySelectorAll("[data-filter]").forEach(function (chip) {
        chip.setAttribute("aria-pressed", String(chip === button));
      });

      items.forEach(function (item) {
        var categories = (item.getAttribute("data-category") || "").split(" ");
        item.hidden = value !== "all" && categories.indexOf(value) === -1;
        var filteredVideo = item.querySelector("[data-video-preview]");
        if (!filteredVideo) return;
        if (item.hidden) pauseProjectVideo(filteredVideo);
        else if (filteredVideo.dataset.videoInView === "true") playProjectVideo(filteredVideo);
      });
    });
  });

  var projectVideos = Array.prototype.slice.call(document.querySelectorAll("[data-video-preview]"));

  function loadProjectVideo(video) {
    if (!video || video.dataset.videoLoaded === "true" || video.dataset.videoFailed === "true") return;
    var source = video.getAttribute("data-src");
    if (!source) return;
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    video.src = source;
    video.dataset.videoLoaded = "true";
    video.load();
  }

  function playProjectVideo(video) {
    if (!video || document.hidden || video.closest("[hidden]")) return;
    loadProjectVideo(video);
    var playAttempt = video.play();
    if (playAttempt && typeof playAttempt.then === "function") {
      playAttempt.then(function () {
        video.classList.add("is-playing");
      }).catch(function () {
        video.classList.remove("is-playing");
      });
    }
  }

  function pauseProjectVideo(video) {
    if (!video) return;
    video.pause();
    video.classList.remove("is-playing");
  }

  if (projectVideos.length) {
    var videoObserver = typeof window.IntersectionObserver === "function"
      ? new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            entry.target.dataset.videoInView = String(entry.isIntersecting);
            if (entry.isIntersecting) playProjectVideo(entry.target);
            else pauseProjectVideo(entry.target);
          });
        }, { threshold: 0.16, rootMargin: "160px 0px 120px" })
      : null;

    projectVideos.forEach(function (video) {
      video.defaultMuted = true;
      video.muted = true;
      video.playsInline = true;
      video.addEventListener("error", function () {
        video.classList.add("is-unavailable");
        video.dataset.videoFailed = "true";
        video.removeAttribute("src");
        video.load();
      });
      video.addEventListener("mouseenter", function () { playProjectVideo(video); });
      video.addEventListener("focusin", function () { playProjectVideo(video); });
      video.addEventListener("mouseleave", function () {
        if (video.dataset.videoInView !== "true") pauseProjectVideo(video);
      });
      if (videoObserver) videoObserver.observe(video);
      else loadProjectVideo(video);
    });

    document.addEventListener("visibilitychange", function () {
      projectVideos.forEach(function (video) {
        if (document.hidden) pauseProjectVideo(video);
        else if (video.dataset.videoInView === "true") playProjectVideo(video);
      });
    });
  }

  var reducedOrbitalMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  function createRadialOrbit(container, nodes, options) {
    if (!container || !nodes.length) return null;

    var settings = options || {};
    var rotation = Number(settings.initialRotation) || 0;
    var targetRotation = null;
    var activeIndex = -1;
    var autoRotate = !reducedOrbitalMotion;
    var isVisible = true;
    var animationFrame = 0;
    var previousTime = 0;
    var speed = Number(settings.speed) || 0.0045;

    container.classList.add(settings.containerClass || "radial-orbit-stage");
    if (settings.centerX) container.style.setProperty("--orbit-center-x", settings.centerX);
    if (settings.centerY) container.style.setProperty("--orbit-center-y", settings.centerY);

    nodes.forEach(function (node) {
      node.classList.add(settings.nodeClass || "radial-orbit-node");
      node.setAttribute("aria-pressed", "false");

      if (settings.energyHalos && !node.querySelector(":scope > .orbital-energy-halo")) {
        var energy = Math.max(0, Math.min(100, parseFloat(node.getAttribute("data-energy")) || 0));
        var halo = document.createElement("span");
        halo.className = "orbital-energy-halo";
        halo.setAttribute("aria-hidden", "true");
        node.style.setProperty("--orbit-energy-size", (40 + energy * 0.5).toFixed(1) + "px");
        node.prepend(halo);
      }

      if (settings.nodeLabels && !node.querySelector(":scope > .orbital-node-label")) {
        var label = document.createElement("span");
        label.className = "orbital-node-label";
        label.setAttribute("aria-hidden", "true");
        label.textContent = node.getAttribute("data-title") || node.textContent.trim();
        node.appendChild(label);
      }
    });

    function relatedIndexes(index) {
      if (nodes.length < 2 || index < 0) return [];
      if (settings.getRelatedIndexes) {
        return settings.getRelatedIndexes(nodes[index], index, nodes)
          .filter(function (relatedIndex, itemIndex, allIndexes) {
            return relatedIndex >= 0 &&
              relatedIndex < nodes.length &&
              relatedIndex !== index &&
              allIndexes.indexOf(relatedIndex) === itemIndex;
          });
      }
      var previous = (index - 1 + nodes.length) % nodes.length;
      var next = (index + 1) % nodes.length;
      return previous === next ? [previous] : [previous, next];
    }

    function updateNodeStates() {
      var related = relatedIndexes(activeIndex);
      nodes.forEach(function (node, index) {
        var active = index === activeIndex;
        node.classList.toggle("is-active", active);
        node.classList.toggle("is-related", related.indexOf(index) !== -1);
        node.setAttribute("aria-pressed", String(active));
      });
    }

    function getRadii(width, height) {
      if (settings.getRadii) return settings.getRadii(width, height);
      return {
        x: Math.min(235, Math.max(132, width * 0.37)),
        y: Math.min(175, Math.max(112, height * 0.29))
      };
    }

    function resolveCenter(value, size, fallback) {
      if (typeof value === "number") return value;
      if (typeof value === "string" && value.trim().endsWith("%")) {
        return size * (parseFloat(value) || 0) / 100;
      }
      if (typeof value === "string" && value.trim().endsWith("px")) {
        return parseFloat(value) || fallback;
      }
      return fallback;
    }

    function renderOrbit() {
      var width = container.clientWidth;
      var height = container.clientHeight;
      var radii = getRadii(width, height);
      var centerX = resolveCenter(settings.centerX, width, width / 2);
      var centerY = resolveCenter(settings.centerY, height, height / 2);
      var positions = [];

      nodes.forEach(function (node, index) {
        var baseAngle = index / nodes.length * 360;
        var angle = (baseAngle + rotation) % 360;
        var radians = angle * Math.PI / 180;
        var x = radii.x * Math.cos(radians);
        var y = radii.y * Math.sin(radians);
        var depth = (1 + Math.sin(radians)) / 2;
        var opacity = index === activeIndex ? 1 : Math.max(0.42, 0.42 + depth * 0.58);
        var scale = index === activeIndex ? 1 : 0.86 + depth * 0.14;
        var zIndex = index === activeIndex ? 12 : 4 + Math.round(3 * Math.cos(radians));

        node.style.setProperty("--orbit-x", x.toFixed(2) + "px");
        node.style.setProperty("--orbit-y", y.toFixed(2) + "px");
        node.style.setProperty("--orbit-opacity", opacity.toFixed(3));
        node.style.setProperty("--orbit-scale", scale.toFixed(3));
        node.style.setProperty("--orbit-z", String(zIndex));
        positions.push({
          node: node,
          index: index,
          x: centerX + x,
          y: centerY + y,
          angle: angle
        });
      });

      if (settings.onRender) {
        settings.onRender(positions, {
          width: width,
          height: height,
          centerX: centerX,
          centerY: centerY,
          radiusX: radii.x,
          radiusY: radii.y,
          activeIndex: activeIndex
        });
      }
    }

    function shortestTurn(current, target) {
      return (target - current + 540) % 360 - 180;
    }

    function requestOrbitFrame() {
      if (animationFrame || !isVisible || document.hidden) return;
      animationFrame = window.requestAnimationFrame(animateOrbit);
    }

    function animateOrbit(time) {
      animationFrame = 0;
      if (!isVisible || document.hidden) return;

      var elapsed = previousTime ? Math.min(time - previousTime, 40) : 16;
      previousTime = time;

      if (targetRotation !== null) {
        var turn = shortestTurn(rotation, targetRotation);
        if (Math.abs(turn) < 0.08) {
          rotation = targetRotation;
          targetRotation = null;
        } else {
          rotation += turn * 0.12;
        }
      } else if (autoRotate) {
        rotation = (rotation + elapsed * speed) % 360;
      }

      renderOrbit();
      if (autoRotate || targetRotation !== null) requestOrbitFrame();
    }

    function clearSelection() {
      activeIndex = -1;
      targetRotation = null;
      autoRotate = !reducedOrbitalMotion;
      updateNodeStates();
      if (settings.onClear) settings.onClear();
      requestOrbitFrame();
    }

    function selectNode(node) {
      var index = nodes.indexOf(node);
      if (index < 0) return;
      if (activeIndex === index) {
        clearSelection();
        return;
      }

      activeIndex = index;
      autoRotate = false;
      var centeredRotation = 270 - index / nodes.length * 360;
      if (reducedOrbitalMotion) {
        rotation = centeredRotation;
        targetRotation = null;
      } else {
        targetRotation = centeredRotation;
      }
      updateNodeStates();
      if (settings.onActivate) settings.onActivate(node, index);
      renderOrbit();
      requestOrbitFrame();
    }

    nodes.forEach(function (node) {
      node.addEventListener("click", function (event) {
        event.stopPropagation();
        selectNode(node);
      });
    });

    container.addEventListener("click", function (event) {
      if (event.target.closest && event.target.closest(settings.nodeSelector || ".radial-orbit-node")) return;
      var resetTarget = !settings.backgroundSelector ||
        (event.target.matches && event.target.matches(settings.backgroundSelector)) ||
        (event.target.closest && event.target.closest(settings.backgroundSelector));
      if (resetTarget) clearSelection();
    });

    window.addEventListener("resize", renderOrbit, { passive: true });
    document.addEventListener("visibilitychange", function () {
      previousTime = 0;
      if (!document.hidden) requestOrbitFrame();
    });

    if (typeof window.IntersectionObserver === "function") {
      var orbitObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.target !== container) return;
          isVisible = entry.isIntersecting;
          previousTime = 0;
          if (isVisible) requestOrbitFrame();
        });
      }, { threshold: 0.05 });
      orbitObserver.observe(container);
    }

    updateNodeStates();
    renderOrbit();
    requestOrbitFrame();

    return {
      clear: clearSelection,
      select: selectNode,
      render: renderOrbit
    };
  }

  var orbitPreview = document.querySelector("[data-orbit-preview]");
  var projectOrbit = document.querySelector(".project-constellation");
  var projectNodes = Array.prototype.slice.call(document.querySelectorAll("[data-project-node]"));
  var projectOrbitController = null;

  function relatedProjectNodes(node) {
    return (node.getAttribute("data-related") || "")
      .split(",")
      .map(function (id) { return projectNodes[parseInt(id, 10) - 1]; })
      .filter(Boolean);
  }

  var constellationSvg = projectOrbit
    ? projectOrbit.querySelector(".constellation-lines")
    : null;
  var constellationNetwork = constellationSvg
    ? constellationSvg.querySelector("[data-constellation-network]")
    : null;
  var constellationEdges = {};

  function renderProjectConnections(positions, geometry) {
    if (!constellationSvg || !constellationNetwork) return;
    var svgNamespace = "http://www.w3.org/2000/svg";
    var positionByNode = new Map();
    positions.forEach(function (position) {
      positionByNode.set(position.node, position);
    });

    constellationSvg.setAttribute("viewBox", "0 0 " + geometry.width + " " + geometry.height);

    var horizontalAxis = constellationSvg.querySelector('[data-constellation-axis="horizontal"]');
    var verticalAxis = constellationSvg.querySelector('[data-constellation-axis="vertical"]');
    if (horizontalAxis) {
      horizontalAxis.setAttribute("x1", "18");
      horizontalAxis.setAttribute("x2", String(Math.max(18, geometry.width - 18)));
      horizontalAxis.setAttribute("y1", geometry.centerY.toFixed(2));
      horizontalAxis.setAttribute("y2", geometry.centerY.toFixed(2));
    }
    if (verticalAxis) {
      verticalAxis.setAttribute("x1", geometry.centerX.toFixed(2));
      verticalAxis.setAttribute("x2", geometry.centerX.toFixed(2));
      verticalAxis.setAttribute("y1", "18");
      verticalAxis.setAttribute("y2", String(Math.max(18, geometry.height - 18)));
    }

    projectNodes.forEach(function (node, fromIndex) {
      relatedProjectNodes(node).forEach(function (relatedNode) {
        var toIndex = projectNodes.indexOf(relatedNode);
        if (toIndex < 0 || toIndex === fromIndex) return;
        var startIndex = Math.min(fromIndex, toIndex);
        var endIndex = Math.max(fromIndex, toIndex);
        var key = startIndex + "-" + endIndex;

        if (!constellationEdges[key]) {
          var line = document.createElementNS(svgNamespace, "line");
          line.classList.add("constellation-edge");
          line.setAttribute("data-from", String(startIndex));
          line.setAttribute("data-to", String(endIndex));
          constellationNetwork.appendChild(line);
          constellationEdges[key] = line;
        }
      });
    });

    Object.keys(constellationEdges).forEach(function (key) {
      var line = constellationEdges[key];
      var fromIndex = parseInt(line.getAttribute("data-from"), 10);
      var toIndex = parseInt(line.getAttribute("data-to"), 10);
      var from = positionByNode.get(projectNodes[fromIndex]);
      var to = positionByNode.get(projectNodes[toIndex]);
      if (!from || !to) return;
      line.setAttribute("x1", from.x.toFixed(2));
      line.setAttribute("y1", from.y.toFixed(2));
      line.setAttribute("x2", to.x.toFixed(2));
      line.setAttribute("y2", to.y.toFixed(2));
      var touchesActive = geometry.activeIndex === fromIndex || geometry.activeIndex === toIndex;
      line.classList.toggle("is-active", touchesActive);
      line.classList.toggle("is-dimmed", geometry.activeIndex >= 0 && !touchesActive);
    });
  }

  function setProjectPreview(node, expanded) {
    if (!orbitPreview || !node) return;
    var image = orbitPreview.querySelector("img");
    var meta = orbitPreview.querySelector("[data-preview-meta]");
    var status = orbitPreview.querySelector("[data-preview-status]");
    var title = orbitPreview.querySelector("[data-preview-title]");
    var description = orbitPreview.querySelector("[data-preview-description]");
    var energy = orbitPreview.querySelector("[data-preview-energy]");
    var energyBar = orbitPreview.querySelector("[data-preview-energy-bar]");
    var connections = orbitPreview.querySelector("[data-preview-connections]");
    var energyValue = Math.max(0, Math.min(100, parseFloat(node.getAttribute("data-energy")) || 0));
    if (image) {
      image.src = node.getAttribute("data-image");
      image.alt = node.getAttribute("data-title") + " project cover";
    }
    if (meta) meta.textContent = node.getAttribute("data-meta");
    if (status) status.textContent = node.getAttribute("data-status") || "Complete";
    if (title) title.textContent = node.getAttribute("data-title");
    if (description) description.textContent = node.getAttribute("data-description");
    if (energy) energy.textContent = String(energyValue) + "%";
    if (energyBar) {
      energyBar.style.width = "0";
      window.requestAnimationFrame(function () {
        energyBar.style.width = String(energyValue) + "%";
      });
    }

    if (connections) {
      connections.replaceChildren();
      relatedProjectNodes(node).forEach(function (relatedNode) {
        var button = document.createElement("button");
        button.className = "orbit-related-link";
        button.type = "button";
        button.textContent = relatedNode.getAttribute("data-title");
        button.addEventListener("click", function (event) {
          event.stopPropagation();
          if (projectOrbitController) projectOrbitController.select(relatedNode);
        });
        connections.appendChild(button);
      });
    }

    if (expanded) {
      orbitPreview.classList.add("is-expanded");
      orbitPreview.setAttribute("aria-hidden", "false");
    }
  }

  projectNodes.forEach(function (node) {
    node.addEventListener("mouseenter", function () {
      if (!orbitPreview || !orbitPreview.classList.contains("is-expanded")) setProjectPreview(node, false);
    });
    node.addEventListener("focus", function () {
      if (!orbitPreview || !orbitPreview.classList.contains("is-expanded")) setProjectPreview(node, false);
    });
  });

  projectOrbitController = createRadialOrbit(projectOrbit, projectNodes, {
    containerClass: "is-radial-orbit",
    nodeClass: "radial-project-node",
    nodeSelector: "[data-project-node]",
    backgroundSelector: ".project-constellation, .constellation-orbit, .constellation-lines, .orbit-core",
    centerX: "53%",
    centerY: "44%",
    speed: 0.006,
    energyHalos: true,
    nodeLabels: true,
    onRender: renderProjectConnections,
    getRelatedIndexes: function (node) {
      return relatedProjectNodes(node).map(function (relatedNode) {
        return projectNodes.indexOf(relatedNode);
      });
    },
    getRadii: function (width, height) {
      return {
        x: Math.min(245, Math.max(145, width * 0.34)),
        y: Math.min(180, Math.max(118, height * 0.29))
      };
    },
    onActivate: function (node) {
      setProjectPreview(node, true);
    },
    onClear: function () {
      if (!orbitPreview) return;
      orbitPreview.classList.remove("is-expanded");
      orbitPreview.setAttribute("aria-hidden", "true");
      var energyBar = orbitPreview.querySelector("[data-preview-energy-bar]");
      if (energyBar) energyBar.style.width = "0";
    }
  });

  Array.prototype.slice.call(document.querySelectorAll(".orbit-stage")).forEach(function (stage) {
    var tags = Array.prototype.slice.call(stage.querySelectorAll(":scope > .orbit-tag"));
    if (!tags.length) return;

    var detail = document.createElement("article");
    detail.className = "orbit-node-detail";
    detail.setAttribute("aria-live", "polite");
    detail.setAttribute("aria-hidden", "true");
    detail.innerHTML =
      '<span>Selected orbit</span>' +
      '<h3 data-orbit-detail-title></h3>' +
      '<p data-orbit-detail-content></p>';
    stage.appendChild(detail);

    createRadialOrbit(stage, tags, {
      containerClass: "radial-orbit-stage",
      nodeClass: "radial-orbit-node",
      nodeSelector: ".radial-orbit-node",
      backgroundSelector: ".orbit-stage, .orbit-ring, .orbit-core",
      speed: 0.0035,
      onActivate: function (node) {
        var detailTitle = detail.querySelector("[data-orbit-detail-title]");
        var detailContent = detail.querySelector("[data-orbit-detail-content]");
        if (detailTitle) detailTitle.textContent = node.textContent.trim();
        if (detailContent) detailContent.textContent = node.getAttribute("data-orbit-content") || "";
        detail.classList.add("is-expanded");
        detail.setAttribute("aria-hidden", "false");
      },
      onClear: function () {
        detail.classList.remove("is-expanded");
        detail.setAttribute("aria-hidden", "true");
      }
    });
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
