(() => {
  "use strict";

  const cuelume = window.Cuelume;
  if (!cuelume) return;

  const STORAGE_KEY = "chel-sounds";
  const INTERACTIVE = ["a[href]", "button:not([disabled])", '[role="option"]', '[tabindex="0"]'].join(",");

  // Sounds are on unless the visitor mutes them. Browsers keep audio silent until the
  // first click or key press, so the first hover before any interaction makes no sound.
  function isEnabled() {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "false";
    } catch (error) {
      return true;
    }
  }

  function applySetting(enabled, announce) {
    cuelume.setEnabled(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch (error) {
      /* storage unavailable: the setting lasts for this page view */
    }
    document.querySelectorAll("[data-sound-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(enabled));
      button.setAttribute("aria-label", enabled ? "Mute interface sounds" : "Enable interface sounds");
      button.title = enabled ? "Sounds on" : "Sounds off";
      // SVG elements have no `hidden` property, so toggle the attribute itself.
      button.querySelector("[data-sound-on]").toggleAttribute("hidden", !enabled);
      button.querySelector("[data-sound-off]").toggleAttribute("hidden", enabled);
    });
    if (enabled && announce) cuelume.play("chime");
  }

  // Ticks on hover and a knock/click on press and release; theme and filter chips
  // click-clack, dialogs bloom when they open and drop away when they close.
  function tag(root) {
    const nodes = root.matches(INTERACTIVE) ? [root] : [];
    root.querySelectorAll(INTERACTIVE).forEach((node) => nodes.push(node));
    nodes.forEach((node) => {
      if (node.closest("[data-cuelume-silent]")) return;
      const cues = node.dataset;
      cues.cuelumeHover ||= "tick";
      if (node.matches("[data-theme-set], [data-filter]")) {
        cues.cuelumeToggle ||= "toggle";
        return;
      }
      cues.cuelumePress ||= "press";
      cues.cuelumeRelease ||= "release";
      if (node.matches("[data-lb-close], [data-menu-close]")) cues.cuelumeRelease = "droplet";
      else if (node.matches("[data-command-open], [data-menu-open], [data-lightbox-item], [data-video-open]")) cues.cuelumeRelease = "bloom";
    });
  }

  tag(document.body);
  applySetting(isEnabled(), false);
  cuelume.bind();

  ["pointerdown", "keydown", "touchstart"].forEach((type) => {
    document.addEventListener(type, cuelume.unlock, { capture: true, passive: true });
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-sound-toggle]")) applySetting(!isEnabled(), true);
  });

  new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) tag(node);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });

  window.siteSound = { play: cuelume.play };
})();
