#!/usr/bin/env python3
"""Derive splash, favicon, and Android icon layers from the Meantvo monogram.

Source of truth: assets/brand/opt1-monogram-icon-1024.png (RGB, no alpha).
Requires Pillow. Does not draw the retired gift-box mark.
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "assets" / "brand" / "opt1-monogram-icon-1024.png"
IMAGES = ROOT / "assets" / "images"
CORAL = (0xE8, 0x5D, 0x4C)


def main() -> None:
    icon = Image.open(BRAND)
    if icon.mode != "RGB" or icon.size != (1024, 1024):
        raise SystemExit(f"expected 1024 RGB icon, got {icon.mode} {icon.size}")

    icon.save(IMAGES / "icon.png", "PNG")
    icon.save(IMAGES / "android-icon-foreground.png", "PNG")

    Image.new("RGB", (1024, 1024), CORAL).save(IMAGES / "android-icon-background.png", "PNG")

    splash = icon.convert("RGBA")
    mask = Image.new("L", (1024, 1024), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 1023, 1023), radius=230, fill=255)
    splash.putalpha(mask)
    splash.save(IMAGES / "splash-icon.png", "PNG")

    icon.resize((64, 64), Image.Resampling.LANCZOS).save(IMAGES / "favicon.png", "PNG")

    mono = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    src = icon.load()
    out = mono.load()
    for y in range(1024):
        for x in range(1024):
            r, g, b = src[x, y]
            if g > 150 and r > 200:
                out[x, y] = (0, 0, 0, 255)
    mono.save(IMAGES / "android-icon-monochrome.png", "PNG")
    print("wrote Meantvo icon derivatives")


if __name__ == "__main__":
    main()
