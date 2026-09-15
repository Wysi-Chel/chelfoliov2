"""Generate web-sized WebP derivatives for the portfolio.

Originals in assets/live stay untouched (the lightbox links to them for
full-resolution inspection). Re-run after adding or replacing images:

    python tools/optimize-images.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LIVE = ROOT / "assets" / "live"
OUT = ROOT / "assets" / "img"


def save_webp(image, path, width=None, quality=82):
    image = image.copy()
    if width and image.width > width:
        image = image.resize((width, round(image.height * width / image.width)), Image.LANCZOS)
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=quality, method=6)
    print(f"{path.relative_to(ROOT)}  {image.width}x{image.height}  {path.stat().st_size // 1024}KB")


def gallery():
    for source in sorted((LIVE / "gallery").glob("img-*.*")):
        image = Image.open(source)
        for width in (640, 1280, 2048):
            save_webp(image, OUT / "gallery" / f"{source.stem}-{width}.webp", width, 84 if width == 2048 else 80)


def editing():
    sets = ["editing-portfolio", "it-support-apparel", "ralliart-apparel"]
    for name in sets:
        for source in sorted((LIVE / "projects" / name).glob("*.jpg")):
            image = Image.open(source)
            save_webp(image, OUT / "editing" / f"{name}-{source.stem}-640.webp", 640)
            save_webp(image, OUT / "editing" / f"{name}-{source.stem}-full.webp", None, 88)

    thumb = Image.open(LIVE / "projects" / "mock.webp")
    save_webp(thumb, OUT / "editing" / "thumbnail-800.webp", 800)
    save_webp(thumb, OUT / "editing" / "thumbnail-full.webp", None, 88)

    # The retouch cover is a side-by-side composite; split it for the comparison
    # slider, cropping below the baked-in BEFORE/AFTER labels.
    retouch = Image.open(LIVE / "projects" / "retouch.webp").convert("RGB")
    save_webp(retouch.crop((20, 112, 500, 742)), OUT / "editing" / "retouch-before.webp", None, 90)
    save_webp(retouch.crop((522, 112, 1002, 742)), OUT / "editing" / "retouch-after.webp", None, 90)


def posters():
    names = ["expense_tracker", "system_monitoring", "ppe_lapsing", "tefolio", "car-rental"]
    for name in names:
        save_webp(Image.open(LIVE / "projects" / f"{name}.webp"), OUT / "posters" / f"{name}-800.webp", 800)
    save_webp(Image.open(LIVE / "projects" / "mp3_player.png"), OUT / "posters" / "mp3_player-800.webp", 800)


def portrait():
    source = Image.open(ROOT / "assets" / "chel-portrait.png").convert("RGBA")
    save_webp(source, OUT / "portrait" / "chel-720.webp", 720, 86)


if __name__ == "__main__":
    gallery()
    editing()
    posters()
    portrait()
