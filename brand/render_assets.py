#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "cairosvg==2.8.2",
#     "fonttools[woff]==4.62.1",
#     "pillow==12.3.0",
# ]
# ///
# ruff: noqa: T201
"""Render the docs logo PNGs and social card from the current SVG assets.

Run `uv run brand/render_assets.py` after `pnpm install`. CairoSVG also needs
the system Cairo library (libcairo2 on Debian/Ubuntu, cairo on Homebrew).
Use --out-dir to preview without replacing the published assets.
"""

import argparse
import io
import math
import xml.etree.ElementTree as ET
from pathlib import Path

import cairosvg
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image
from PIL import ImageDraw
from PIL import ImageFont
from PIL import features


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs/public/assets"
FONT = (
    ROOT
    / "docs/node_modules/@arrai-innovations/vitepress-theme/node_modules"
    / "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2"
)
SVG = "http://www.w3.org/2000/svg"
WORDMARK_LABELS = {"vueda", "vue.js user experience for django administration"}
CARD_SIZE = (1200, 630)
LOGO_SIZES = {"logo-cube-solid": (500, 500), "logo-text-solid": (1325, 500)}
LOCKUP_SIZE = (820, 309)
BACKGROUND_CENTRE = (4, 53, 90)  # #04355a
BACKGROUND_EDGE = (0, 28, 48)  # #001c30
ET.register_namespace("", SVG)


def font_at_weight(path, weight, size):
    """Convert bundled WOFF2 to an in-memory static TTF for Pillow."""
    font = TTFont(path)
    instance = instantiateVariableFont(font, {"wght": weight}, inplace=True)
    instance.flavor = None
    buffer = io.BytesIO()
    instance.save(buffer)
    buffer.seek(0)
    # Preserve fractional advances and kerning in the original card's captions.
    return ImageFont.truetype(buffer, size, layout_engine=ImageFont.Layout.RAQM)


def rasterize(svg, size):
    data = cairosvg.svg2png(bytestring=svg, output_width=size[0], output_height=size[1])
    return Image.open(io.BytesIO(data)).convert("RGBA")


def background():
    """Match the original ImageMagick radial gradient in sRGB colour values."""
    width, height = CARD_SIZE
    centre_x, centre_y = (width - 1) / 2, (height - 1) / 2
    radius = max(width, height) / 2
    pixels = bytearray()
    for y in range(height):
        for x in range(width):
            distance = min(math.hypot(x - centre_x, y - centre_y) / radius, 1)
            pixels.extend(
                round(centre + (edge - centre) * distance)
                for centre, edge in zip(BACKGROUND_CENTRE, BACKGROUND_EDGE, strict=True)
            )
    return Image.frombytes("RGB", CARD_SIZE, bytes(pixels)).convert("RGBA")


def social_card(wordmark, font):
    tree = ET.fromstring(wordmark)
    paths = [path for path in tree.iter(f"{{{SVG}}}path") if path.get("aria-label") in WORDMARK_LABELS]
    if {path.get("aria-label") for path in paths} != WORDMARK_LABELS or len(paths) != len(WORDMARK_LABELS):
        raise ValueError("Expected the two outlined wordmark paths identified by aria-label")
    if any(tree.iter(f"{{{SVG}}}text")):
        raise ValueError("Use the outlined wordmark SVG, not the raw file with live Galano text")
    for path in paths:
        path.set("fill", "#ffffff")
    lockup = rasterize(ET.tostring(tree), LOCKUP_SIZE)
    card = background()
    x = (CARD_SIZE[0] - LOCKUP_SIZE[0]) // 2
    y = (CARD_SIZE[1] - LOCKUP_SIZE[1]) // 2 - 50
    card.alpha_composite(lockup, (x, y))
    draw = ImageDraw.Draw(card)
    draw.text(
        (600, 437),
        "Integrator guide, changelog, and reference",
        font=font_at_weight(font, 400, 32),
        fill="#b9c7d6",
        anchor="ms",
    )
    draw.text((600, 574), "vueda.dev", font=font_at_weight(font, 600, 26), fill="#ffffff", anchor="ms")
    return card.convert("RGB")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets-dir", type=Path, default=ASSETS, help="Directory containing the two docs SVGs")
    parser.add_argument("--out-dir", type=Path, default=ASSETS, help="Destination for the three PNGs")
    parser.add_argument("--font", type=Path, default=FONT, help="IBM Plex Sans Latin variable WOFF2")
    args = parser.parse_args()
    if not args.font.is_file():
        parser.error(f"IBM Plex Sans not found at {args.font}. Run pnpm install or pass --font.")
    if not features.check_feature("raqm"):
        parser.error(
            "Pillow needs RAQM text shaping; use its prebuilt wheel or install libraqm before building Pillow."
        )
    sources = {name: (args.assets_dir / f"{name}.svg").read_bytes() for name in LOGO_SIZES}
    # Finish rendering before replacing any existing output files.
    rendered = {f"{name}.png": rasterize(sources[name], size) for name, size in LOGO_SIZES.items()}
    rendered["social-card.png"] = social_card(sources["logo-text-solid"], args.font)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    for name, image in rendered.items():
        target = args.out_dir / name
        image.save(target, optimize=True)
        print(f"{target}: {image.width}x{image.height}")


if __name__ == "__main__":
    main()
