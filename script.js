(function () {
  "use strict";

  var landing = document.querySelector(".landing");
  var canvas = document.querySelector(".star-field");
  var toggle = document.querySelector("[data-star-toggle]");

  document.querySelectorAll("[data-current-year]").forEach(function (item) {
    item.textContent = String(new Date().getFullYear());
  });

  if (!landing || !canvas || !toggle) return;

  var context = canvas.getContext("2d", { alpha: true });
  var root = document.documentElement;
  var stars = [];
  var animationFrame = 0;
  var isInnerPage = landing.classList.contains("inner-page");
  var starsReduced = false;

  root.classList.add("motion-enhanced");

  try {
    starsReduced = window.localStorage.getItem("chel-stars-reduced") === "true";
    window.localStorage.removeItem("chel-stars-amplified");
    window.localStorage.removeItem("chel-motion-preference");
    window.localStorage.removeItem("chel-motion-paused");
  } catch (error) {
    starsReduced = false;
  }
  var previousTime = 0;

  function getCanvasSize() {
    return {
      width: isInnerPage ? window.innerWidth : landing.clientWidth,
      height: isInnerPage ? window.innerHeight : landing.clientHeight
    };
  }

  function randomFactory(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function makeStars(width, height) {
    var random = randomFactory(starsReduced ? 75271 : 74531);
    var baseCount = Math.min(310, Math.max(160, (width * height) / 5000));
    var count = Math.round(starsReduced ? Math.max(72, baseCount * 0.46) : baseCount);
    var result = [];

    for (var index = 0; index < count; index += 1) {
      var bright = random() > 0.86;
      result.push({
        x: random() * width,
        y: random() * height,
        radius: bright ? 1.15 + random() * 1.45 : 0.45 + random() * 0.82,
        alpha: bright ? 0.58 + random() * 0.4 : 0.21 + random() * 0.46,
        phase: random() * Math.PI * 2,
        speed: 0.0003 + random() * 0.00055,
        blue: random() > 0.72
      });
    }

    return result;
  }

  function resizeCanvas() {
    var size = getCanvasSize();
    var width = size.width;
    var height = size.height;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    stars = makeStars(width, height);
    drawStars(performance.now());
  }

  function drawStars(time) {
    var size = getCanvasSize();
    var width = size.width;
    var height = size.height;
    context.clearRect(0, 0, width, height);

    for (var index = 0; index < stars.length; index += 1) {
      var star = stars[index];
      var energy = starsReduced ? 0.72 : 1;
      var radius = star.radius * (starsReduced ? 0.88 : 1);
      var pulseSpeed = starsReduced ? 0.74 : 1;
      var pulse = 0.68 + Math.sin(star.phase + time * star.speed * pulseSpeed) * 0.28;
      var opacity = Math.min(1, Math.max(0.06, star.alpha * pulse * energy));

      if (radius > 1.35) {
        var glowRadius = radius * (starsReduced ? 3.8 : 4.6);
        var glow = context.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowRadius);
        glow.addColorStop(0, "rgba(240,248,255," + Math.min(1, opacity * 1.5) + ")");
        glow.addColorStop(0.22, "rgba(213,235,255," + opacity + ")");
        glow.addColorStop(1, "rgba(112,173,224,0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(star.x, star.y, glowRadius, 0, Math.PI * 2);
        context.fill();

      } else {
        context.fillStyle = star.blue
          ? "rgba(143,196,235," + opacity + ")"
          : "rgba(228,236,244," + opacity + ")";
        context.beginPath();
        context.arc(star.x, star.y, radius, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function animate(time) {
    animationFrame = 0;
    if (document.hidden) return;

    if (time - previousTime > 30) {
      drawStars(time);
      previousTime = time;
    }
    animationFrame = window.requestAnimationFrame(animate);
  }

  function stopAnimation() {
    if (!animationFrame) return;
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function startAnimation() {
    if (animationFrame || document.hidden) return;
    animationFrame = window.requestAnimationFrame(animate);
  }

  function updateStarToggle() {
    root.classList.toggle("stars-reduced", starsReduced);
    landing.classList.toggle("stars-reduced", starsReduced);
    toggle.setAttribute("aria-pressed", String(starsReduced));
    var actionLabel = starsReduced ? "Restore standard star field" : "Reduce star field";
    toggle.setAttribute("aria-label", actionLabel);
    toggle.title = actionLabel;

    document.dispatchEvent(new CustomEvent("chel:starchange", {
      detail: { reduced: starsReduced }
    }));
  }

  toggle.addEventListener("click", function () {
    starsReduced = !starsReduced;
    try {
      window.localStorage.setItem("chel-stars-reduced", String(starsReduced));
    } catch (error) {
      // The star-density control still works when storage is unavailable.
    }
    updateStarToggle();
    resizeCanvas();
    startAnimation();
  });

  window.addEventListener("resize", resizeCanvas, { passive: true });
  window.addEventListener("pagehide", function () {
    stopAnimation();
  });
  window.addEventListener("pageshow", startAnimation);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopAnimation();
    else startAnimation();
  });

  updateStarToggle();
  resizeCanvas();
  startAnimation();
})();

(function () {
  "use strict";

  var root = document.documentElement;

  root.classList.add("motion-enhanced");

  var existingRevealItems = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  existingRevealItems.forEach(function (item, index) {
    item.style.setProperty("--reveal-delay", String(index % 4 * 55) + "ms");
  });

  var homeRevealItems = Array.prototype.slice.call(document.querySelectorAll(
    ".home-about-intro > *, " +
    ".home-about .metric, " +
    ".home-about .section-heading > *, " +
    ".home-about .discipline-card, " +
    ".home-about .skill-card, " +
    ".home-about .study-card, " +
    ".home-about-actions"
  ));

  homeRevealItems.forEach(function (item, index) {
    item.classList.add("scroll-reveal");
    item.style.setProperty("--reveal-delay", String(index % 4 * 65) + "ms");
  });

  var revealObserver = null;

  function showHomeItem(item, immediate) {
    var delay = immediate ? 0 : parseInt(item.style.getPropertyValue("--reveal-delay"), 10) || 0;
    if (!delay) {
      item.classList.add("is-in-view");
      return;
    }
    window.setTimeout(function () {
      item.classList.add("is-in-view");
    }, delay);
  }

  function revealHomeItems() {
    homeRevealItems.forEach(function (item) {
      showHomeItem(item, true);
    });
    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }
  }

  function observeHomeItems() {
    if (typeof window.IntersectionObserver !== "function") {
      revealHomeItems();
      return;
    }

    revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          showHomeItem(entry.target, false);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });

    homeRevealItems.forEach(function (item) {
      revealObserver.observe(item);
    });
  }

  observeHomeItems();

  document.addEventListener("focusin", function (event) {
    var target = event.target.closest ? event.target.closest(".scroll-reveal") : null;
    if (target) showHomeItem(target, true);
  });

  var scrollFrame = 0;
  var targetScroll = window.scrollY || document.documentElement.scrollTop || 0;
  var renderedScroll = targetScroll;

  function applyScrollMotion(scrollTop) {
    var scrollRange = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    root.style.setProperty("--scroll-parallax", String((scrollTop * 0.075) % 72) + "px");
    root.style.setProperty("--hero-scroll-lift", String(Math.max(scrollTop * -0.035, -24)) + "px");
    root.style.setProperty("--aurora-scroll-y", String(Math.max(scrollTop * -0.018, -80)) + "px");
    root.style.setProperty("--inner-copy-scroll-y", String(Math.max(scrollTop * -0.024, -32)) + "px");
    root.style.setProperty("--inner-visual-scroll-y", String(Math.max(scrollTop * -0.04, -52)) + "px");
    root.style.setProperty("--scroll-progress", String(Math.min(1, Math.max(0, scrollTop / scrollRange))));
  }

  function renderScrollMotion() {
    scrollFrame = 0;
    var delta = targetScroll - renderedScroll;
    renderedScroll += delta * 0.12;
    if (Math.abs(delta) < 0.1) renderedScroll = targetScroll;
    applyScrollMotion(renderedScroll);
    if (renderedScroll !== targetScroll) {
      scrollFrame = window.requestAnimationFrame(renderScrollMotion);
    }
  }

  function requestScrollMotion() {
    targetScroll = window.scrollY || document.documentElement.scrollTop || 0;
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(renderScrollMotion);
  }

  window.addEventListener("scroll", requestScrollMotion, { passive: true });
  applyScrollMotion(renderedScroll);

  var homeDock = document.querySelector(".portfolio-nav");
  var homeDockLink = homeDock ? homeDock.querySelector('a[href="#home"]') : null;
  var aboutDockLink = homeDock ? homeDock.querySelector('a[href="#about"]') : null;
  var aboutSection = document.querySelector("#about");

  if (homeDockLink && aboutDockLink && aboutSection && typeof window.IntersectionObserver === "function") {
    var navigationObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target !== aboutSection) return;
        if (entry.isIntersecting) {
          homeDockLink.removeAttribute("aria-current");
          aboutDockLink.setAttribute("aria-current", "page");
        } else if (window.scrollY < aboutSection.offsetTop) {
          aboutDockLink.removeAttribute("aria-current");
          homeDockLink.setAttribute("aria-current", "page");
        }
      });
    }, { threshold: 0, rootMargin: "-34% 0px -56% 0px" });
    navigationObserver.observe(aboutSection);
  }

  var landing = document.querySelector(".landing:not(.inner-page)");
  var pointerFrame = 0;
  var pointerX = window.innerWidth / 2;
  var pointerY = window.innerHeight / 2;
  var smoothPointerX = pointerX;
  var smoothPointerY = pointerY;
  var pointerDetailsDirty = false;
  var nextCard = null;
  var activeCard = null;
  var nextButton = null;
  var activeButton = null;
  var nextGlassTarget = null;
  var activeGlassTarget = null;
  var nextOrbitSurface = null;
  var activeOrbitSurface = null;

  var auraLayers = [];
  Array.prototype.slice.call(document.querySelectorAll(".landing, .inner-page")).forEach(function (surface) {
    var aura = document.createElement("div");
    aura.className = "cursor-aura";
    aura.setAttribute("aria-hidden", "true");
    surface.prepend(aura);
    auraLayers.push(aura);
  });

  var pointerCards = Array.prototype.slice.call(document.querySelectorAll(
    ".project-card, .media-tile, .skill-card, .study-card, .discipline-card"
  ));

  pointerCards.forEach(function (card) {
    card.classList.add("pointer-reactive", "glow-card");
    if (!card.querySelector(":scope > .glow-card-layer")) {
      var glowLayer = document.createElement("span");
      glowLayer.className = "glow-card-layer";
      glowLayer.setAttribute("aria-hidden", "true");
      card.appendChild(glowLayer);
    }
  });

  var orbitSurfaces = Array.prototype.slice.call(document.querySelectorAll(
    ".portrait-orbit, .orbit-stage, .project-constellation"
  ));

  orbitSurfaces.forEach(function (surface) {
    var rings = surface.matches(".portrait-orbit")
      ? [surface]
      : Array.prototype.slice.call(surface.querySelectorAll(
        ":scope > .orbit-ring, :scope > .constellation-orbit"
      ));

    surface._glowRings = rings;
    rings.forEach(function (ring) {
      ring.classList.add("orbit-glow-target");
      if (!ring.querySelector(":scope > .orbit-glow-layer")) {
        var orbitGlow = document.createElement("span");
        orbitGlow.className = "orbit-glow-layer";
        orbitGlow.setAttribute("aria-hidden", "true");
        ring.appendChild(orbitGlow);
      }
    });
  });

  function resetCard(card) {
    if (!card) return;
    card.classList.remove("is-pointer-active");
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
  }

  function resetOrbit(surface) {
    if (!surface || !surface._glowRings) return;
    surface._glowRings.forEach(function (ring) {
      ring.classList.remove("is-orbit-active");
    });
  }

  function findOrbitSurface(x, y, eventTarget) {
    var closestSurface = eventTarget && eventTarget.closest
      ? eventTarget.closest(".orbit-stage, .project-constellation")
      : null;

    if (closestSurface) return closestSurface;

    for (var index = 0; index < orbitSurfaces.length; index += 1) {
      var surface = orbitSurfaces[index];
      if (!surface.matches(".portrait-orbit")) continue;
      var bounds = surface.getBoundingClientRect();
      if (
        x >= bounds.left &&
        x <= bounds.right &&
        y >= bounds.top &&
        y <= bounds.bottom
      ) {
        return surface;
      }
    }

    return null;
  }

  function resetButton(button) {
    if (!button) return;
    button.style.setProperty("--magnetic-x", "0px");
    button.style.setProperty("--magnetic-y", "0px");
  }

  function resetGlassTarget(target) {
    if (!target) return;
    target.style.setProperty("--glass-x", "50%");
    target.style.setProperty("--glass-y", "50%");
    target.style.setProperty("--button-glow-hue", "205");
  }

  function resetPointerMotion() {
    if (pointerFrame) {
      window.cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
    }
    resetCard(activeCard);
    resetButton(activeButton);
    activeCard = null;
    nextCard = null;
    activeButton = null;
    nextButton = null;
    resetGlassTarget(activeGlassTarget);
    activeGlassTarget = null;
    nextGlassTarget = null;
    resetOrbit(activeOrbitSurface);
    activeOrbitSurface = null;
    nextOrbitSurface = null;
    pointerDetailsDirty = false;
    if (landing) {
      landing.style.setProperty("--portrait-shift-x", "0px");
      landing.style.setProperty("--portrait-shift-y", "0px");
    }
  }

  function renderPointerMotion() {
    pointerFrame = 0;

    if (document.hidden) {
      resetPointerMotion();
      return;
    }

    var deltaX = pointerX - smoothPointerX;
    var deltaY = pointerY - smoothPointerY;
    smoothPointerX = Math.round(smoothPointerX + deltaX * 0.05);
    smoothPointerY = Math.round(smoothPointerY + deltaY * 0.05);
    var normalizedX = smoothPointerX / Math.max(window.innerWidth, 1) - 0.5;
    var normalizedY = smoothPointerY / Math.max(window.innerHeight, 1) - 0.5;

    auraLayers.forEach(function (aura) {
      aura.style.setProperty("--cursor-aura-x", String(smoothPointerX) + "px");
      aura.style.setProperty("--cursor-aura-y", String(smoothPointerY) + "px");
      aura.classList.add("is-active");
    });

    if (landing) {
      landing.style.setProperty("--portrait-shift-x", String(normalizedX * 14) + "px");
      landing.style.setProperty("--portrait-shift-y", String(normalizedY * 10) + "px");
    }

    if (pointerDetailsDirty) {
      var cardBounds = nextCard ? nextCard.getBoundingClientRect() : null;
      var buttonBounds = nextButton ? nextButton.getBoundingClientRect() : null;
      var glassBounds = nextGlassTarget ? nextGlassTarget.getBoundingClientRect() : null;

      if (activeCard !== nextCard) resetCard(activeCard);
      activeCard = nextCard;
      if (activeCard && cardBounds) {
        var localX = (pointerX - cardBounds.left) / Math.max(cardBounds.width, 1);
        var localY = (pointerY - cardBounds.top) / Math.max(cardBounds.height, 1);
        var cardBase = parseFloat(
          window.getComputedStyle(activeCard).getPropertyValue("--glow-base")
        ) || 220;
        var cardSpread = parseFloat(
          window.getComputedStyle(activeCard).getPropertyValue("--glow-spread")
        ) || 200;
        activeCard.style.setProperty("--tilt-x", String((0.5 - localY) * 3.2) + "deg");
        activeCard.style.setProperty("--tilt-y", String((localX - 0.5) * 4.2) + "deg");
        activeCard.style.setProperty("--glow-x", String(pointerX - cardBounds.left) + "px");
        activeCard.style.setProperty("--glow-y", String(pointerY - cardBounds.top) + "px");
        activeCard.style.setProperty(
          "--glow-hue",
          String(cardBase + pointerX / Math.max(window.innerWidth, 1) * cardSpread)
        );
        activeCard.classList.add("is-pointer-active");
      }

      if (activeButton !== nextButton) resetButton(activeButton);
      activeButton = nextButton;
      if (activeButton && buttonBounds) {
        var offsetX = (pointerX - (buttonBounds.left + buttonBounds.width / 2)) * 0.075;
        var offsetY = (pointerY - (buttonBounds.top + buttonBounds.height / 2)) * 0.09;
        activeButton.style.setProperty("--magnetic-x", String(Math.max(-4, Math.min(4, offsetX))) + "px");
        activeButton.style.setProperty("--magnetic-y", String(Math.max(-3, Math.min(3, offsetY))) + "px");
      }

      if (activeGlassTarget !== nextGlassTarget) resetGlassTarget(activeGlassTarget);
      activeGlassTarget = nextGlassTarget;
      if (activeGlassTarget && glassBounds) {
        var glassX = pointerX - glassBounds.left;
        var glassProgress = glassX / Math.max(glassBounds.width, 1);
        activeGlassTarget.style.setProperty("--glass-x", String(glassX) + "px");
        activeGlassTarget.style.setProperty("--glass-y", String(pointerY - glassBounds.top) + "px");
        activeGlassTarget.style.setProperty("--button-glow-hue", String(195 + glassProgress * 70));
      }

      if (activeOrbitSurface !== nextOrbitSurface) resetOrbit(activeOrbitSurface);
      activeOrbitSurface = nextOrbitSurface;
      if (activeOrbitSurface && activeOrbitSurface._glowRings) {
        activeOrbitSurface._glowRings.forEach(function (ring) {
          var ringBounds = ring.getBoundingClientRect();
          var ringX = pointerX - ringBounds.left;
          var ringY = pointerY - ringBounds.top;
          var ringProgress = ringX / Math.max(ringBounds.width, 1);
          ring.style.setProperty("--glow-x", String(ringX) + "px");
          ring.style.setProperty("--glow-y", String(ringY) + "px");
          ring.style.setProperty("--glow-hue", String(195 + ringProgress * 90));
          ring.classList.add("is-orbit-active");
        });
      }
      pointerDetailsDirty = false;
    }

    if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
      pointerFrame = window.requestAnimationFrame(renderPointerMotion);
    }
  }

  document.addEventListener("mousemove", function (event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    nextCard = event.target.closest ? event.target.closest(".pointer-reactive") : null;
    nextButton = event.target.closest ? event.target.closest(".button, .page-button") : null;
    nextGlassTarget = event.target.closest ? event.target.closest(
      ".button, .page-button, .command-trigger, .filter-chip, .orbit-related-link, " +
      ".project-node, .orbit-tag, " +
      ".lightbox-close, .lightbox-nav, .command-head button"
    ) : null;
    nextOrbitSurface = findOrbitSurface(pointerX, pointerY, event.target);
    pointerDetailsDirty = true;
    if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderPointerMotion);
  }, { passive: true });

  document.documentElement.addEventListener("mouseleave", resetPointerMotion);
  window.addEventListener("blur", resetPointerMotion);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) resetPointerMotion();
  });

})();
