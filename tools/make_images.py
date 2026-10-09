"""Build the site's images from real Evade renders.

Usage (from the repo root):  python tools/make_images.py

Screens: put portrait screenshots (780 x 1600, from an Evade session) in source/screenshots/
with the names listed in source/images.json. A name that isn't there falls back to the
older screenshots in Project Evade/itch/screenshots/. The crops for the three "How it plays"
cards are boxes in source/images.json ([left, top, right, bottom] in pixels).
"""
import json
import pathlib
import shutil

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SOURCE = ROOT / "source"
EVADE = ROOT.parent / "Project Evade"     # the game repo and the studio vault sit next to this folder
VAULT = ROOT.parent / "Desilon Studio"


def webp(img, path, width):
    height = round(img.height * width / img.width)
    img.resize((width, height), Image.LANCZOS).save(path, "WEBP", quality=82, method=6)


def screen(name, fallback):
    own = SOURCE / "screenshots" / name
    return own if own.exists() else EVADE / "itch" / "screenshots" / fallback


def main():
    cfg = json.loads((SOURCE / "images.json").read_text(encoding="utf-8"))
    img_dir = PUBLIC / "assets" / "img"
    img_dir.mkdir(parents=True, exist_ok=True)

    for out_name, spec in cfg["phones"].items():
        im = Image.open(screen(spec["file"], spec["fallback"])).convert("RGB")
        for w in (390, 780):
            webp(im, img_dir / f"{out_name}-{w}.webp", w)

    for out_name, spec in cfg["cards"].items():
        im = Image.open(screen(spec["file"], spec["fallback"])).convert("RGB").crop(tuple(spec["box"]))
        for w in (320, 640):
            webp(im, img_dir / f"{out_name}-{w}.webp", w)

    icon = Image.open(EVADE / "docs" / "notes" / "img" / "app-icon-s1-2026-09-28.png").convert("RGBA")
    icon.resize((240, 240), Image.LANCZOS).save(img_dir / "evade-icon-240.png", optimize=True)

    wm = Image.open(EVADE / "docs" / "notes" / "img" / "wordmark-v2b-2026-09-28.png").convert("RGB")
    wm = wm.resize((round(wm.width * 630 / wm.height), 630), Image.LANCZOS)
    left = (wm.width - 1200) // 2
    wm.crop((left, 0, left + 1200, 630)).save(PUBLIC / "og-image.jpg", "JPEG", quality=86, optimize=True)

    prof = VAULT / "brand" / "export" / "profile-1b"
    shutil.copy(prof / "desilon-avatar.svg", img_dir / "desilon-mark.svg")
    for f in ["favicon.ico", "favicon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png"]:
        shutil.copy(prof / "web" / f, PUBLIC / f)

    for p in sorted(PUBLIC.rglob("*")):
        if p.is_file() and p.suffix in {".webp", ".png", ".jpg"}:
            print(f"{p.relative_to(PUBLIC)}  {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
