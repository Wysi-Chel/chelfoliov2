# Chel portfolio

A dependency-free, responsive portfolio for Chel Gadores. The layout follows a minimal editorial system —
fixed left sidebar, a single reading column, numbered sections, and a deep blue default theme with an
optional light theme — set entirely in JetBrains Mono.

The site is organised around two tracks, development and image editing, so either kind of visitor can
reach the relevant work in one click (sidebar “Tracks”, home sections 02 and 03, or
`projects.html#development` / `projects.html#editing`).

## Pages

- `index.html` — hero, at-a-glance stats, about, featured development deck, image editing (before/after
  slider + generation set), experience and toolkit, education, photography preview, contact
- `projects.html` — all eleven projects, filterable by track; Expense Tracker, Car Rental Website, and
  System Monitoring are featured in an animated deck
- `work.html` — full career timeline with role descriptions
- `gallery.html` — filterable 13-frame photography archive
- `about.html` — long-form profile

## Interaction

- `Ctrl K` / `⌘ K` — quick navigation palette
- Featured deck — cards deal out of a stack when scrolled into view; select a side card to bring it forward
- Lightbox — arrow keys or swipe to move, `Z` or click to zoom to 100%, “original” opens the source file
- Project videos load only when played (`preload="none"`), never on scroll
- Interface sounds — off by default; the speaker button next to the theme switch turns them on and the
  choice is remembered

## Sounds

`sounds.js` wires hover, press, toggle, and dialog cues to interactive elements using
[Cuelume](https://www.npmjs.com/package/cuelume) (MIT, © Daniel Belyi), which synthesizes the sounds with the
Web Audio API — there are no audio files. The library is vendored as a single ES module in `assets/vendor/`
alongside its license.

## Images

Pages use WebP derivatives from `assets/img/`; the untouched originals stay in `assets/live/` and are
linked from the lightbox for full-resolution inspection. After adding or replacing an image, regenerate
the derivatives (requires Pillow):

```sh
python tools/optimize-images.py
```

## Run locally

Open `http://localhost/chelfoliov2/` while XAMPP Apache is running. Serving over HTTP is required for the
full experience: the SVG icon sprites (`<use>`) and the sound module (`<script type="module">`) are blocked
for pages opened from `file://`.

Content and portfolio assets were sourced from `chelgadores.tech`. JetBrains Mono is included under the
SIL Open Font License (`assets/fonts/OFL.txt`).
