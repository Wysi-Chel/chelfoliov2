(function () {
  "use strict";

  var landing = document.querySelector(".landing");
  var canvas = document.querySelector(".star-field");
  var toggle = document.querySelector(".motion-toggle");

  document.querySelectorAll("[data-current-year]").forEach(function (item) {
    item.textContent = String(new Date().getFullYear());
  });

  if (!landing || !canvas || !toggle) return;

  var context = canvas.getContext("2d", { alpha: true });
  var root = document.documentElement;
  var stars = [];
  var animationFrame = 0;
  var isInnerPage = landing.classList.contains("inner-page");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var storedPreference = null;
  try {
    storedPreference = window.localStorage.getItem("chel-motion-paused");
  } catch (error) {
    storedPreference = null;
  }
  var userPaused = storedPreference === "true";
  var isPaused = reducedMotion.matches || userPaused;
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
    var random = randomFactory(74531);
    var count = Math.round(Math.min(310, Math.max(160, (width * height) / 5000)));
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
      var pulse = isPaused ? 0.78 : 0.68 + Math.sin(star.phase + time * star.speed) * 0.28;
      var opacity = Math.max(0.06, star.alpha * pulse);

      if (star.radius > 1.35) {
        var glow = context.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 4.6);
        glow.addColorStop(0, "rgba(240,248,255," + Math.min(1, opacity * 1.5) + ")");
        glow.addColorStop(0.22, "rgba(213,235,255," + opacity + ")");
        glow.addColorStop(1, "rgba(112,173,224,0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(star.x, star.y, star.radius * 4.6, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillStyle = star.blue
          ? "rgba(143,196,235," + opacity + ")"
          : "rgba(228,236,244," + opacity + ")";
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function animate(time) {
    animationFrame = 0;
    if (isPaused || document.hidden) return;

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
    if (animationFrame || isPaused || document.hidden) return;
    animationFrame = window.requestAnimationFrame(animate);
  }

  function updateToggle() {
    isPaused = reducedMotion.matches || userPaused;
    root.classList.toggle("motion-paused", isPaused);
    landing.classList.toggle("motion-paused", isPaused);
    toggle.setAttribute("aria-pressed", String(isPaused));
    toggle.disabled = reducedMotion.matches;
    toggle.setAttribute(
      "aria-label",
      reducedMotion.matches
        ? "Site motion follows reduced-motion preference"
        : isPaused ? "Resume site motion" : "Pause site motion"
    );
    drawStars(performance.now());

    if (isPaused) stopAnimation();
    else startAnimation();

    document.dispatchEvent(new CustomEvent("chel:motionchange", {
      detail: { paused: isPaused, reduced: reducedMotion.matches }
    }));
  }

  toggle.addEventListener("click", function () {
    userPaused = !userPaused;
    try {
      window.localStorage.setItem("chel-motion-paused", String(userPaused));
    } catch (error) {
      // Animation control still works when storage is unavailable.
    }
    updateToggle();
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

  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", updateToggle);
  } else if (typeof reducedMotion.addListener === "function") {
    reducedMotion.addListener(updateToggle);
  }

  resizeCanvas();
  updateToggle();
})();

(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
    if (root.classList.contains("motion-paused") || reduceMotion.matches) {
      revealHomeItems();
      return;
    }

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

  function updateScrollMotion() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    root.style.setProperty("--scroll-parallax", String((scrollTop * 0.075) % 72) + "px");
    root.style.setProperty("--hero-scroll-lift", String(Math.max(scrollTop * -0.035, -24)) + "px");
    scrollFrame = 0;
  }

  window.addEventListener("scroll", function () {
    if (root.classList.contains("motion-paused")) return;
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScrollMotion);
  }, { passive: true });
  updateScrollMotion();

  document.addEventListener("chel:motionchange", function (event) {
    if (event.detail && event.detail.paused) revealHomeItems();
  });

  var pointerMedia = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 821px)");
  if (!pointerMedia.matches) return;

  var landing = document.querySelector(".landing:not(.inner-page)");
  var pointerFrame = 0;
  var pointerX = window.innerWidth / 2;
  var pointerY = window.innerHeight / 2;
  var nextCard = null;
  var activeCard = null;
  var nextButton = null;
  var activeButton = null;

  var pointerCards = Array.prototype.slice.call(document.querySelectorAll(
    ".project-card, .media-tile, .skill-card, .study-card, .discipline-card"
  ));

  pointerCards.forEach(function (card) {
    card.classList.add("pointer-reactive");
  });

  function resetCard(card) {
    if (!card) return;
    card.classList.remove("is-pointer-active");
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
  }

  function resetButton(button) {
    if (!button) return;
    button.style.setProperty("--magnetic-x", "0px");
    button.style.setProperty("--magnetic-y", "0px");
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
    if (landing) {
      landing.style.setProperty("--portrait-shift-x", "0px");
      landing.style.setProperty("--portrait-shift-y", "0px");
    }
  }

  function renderPointerMotion() {
    pointerFrame = 0;

    if (root.classList.contains("motion-paused") || !pointerMedia.matches || document.hidden) {
      resetPointerMotion();
      return;
    }

    var normalizedX = pointerX / Math.max(window.innerWidth, 1) - 0.5;
    var normalizedY = pointerY / Math.max(window.innerHeight, 1) - 0.5;
    var cardBounds = nextCard ? nextCard.getBoundingClientRect() : null;
    var buttonBounds = nextButton ? nextButton.getBoundingClientRect() : null;

    if (landing) {
      landing.style.setProperty("--portrait-shift-x", String(normalizedX * 14) + "px");
      landing.style.setProperty("--portrait-shift-y", String(normalizedY * 10) + "px");
    }

    if (activeCard !== nextCard) resetCard(activeCard);
    activeCard = nextCard;
    if (activeCard && cardBounds) {
      var localX = (pointerX - cardBounds.left) / Math.max(cardBounds.width, 1);
      var localY = (pointerY - cardBounds.top) / Math.max(cardBounds.height, 1);
      activeCard.style.setProperty("--tilt-x", String((0.5 - localY) * 3.2) + "deg");
      activeCard.style.setProperty("--tilt-y", String((localX - 0.5) * 4.2) + "deg");
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
  }

  document.addEventListener("pointermove", function (event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    nextCard = event.target.closest ? event.target.closest(".pointer-reactive") : null;
    nextButton = event.target.closest ? event.target.closest(".button, .page-button") : null;
    if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderPointerMotion);
  }, { passive: true });

  document.documentElement.addEventListener("mouseleave", resetPointerMotion);
  window.addEventListener("blur", resetPointerMotion);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) resetPointerMotion();
  });

  document.addEventListener("chel:motionchange", function (event) {
    if (event.detail && event.detail.paused) {
      resetPointerMotion();
    }
  });
})();
