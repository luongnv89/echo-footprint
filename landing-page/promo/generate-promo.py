"""Generate Chrome Web Store promo tiles for EchoFootPrint.

Outputs (JPEG, exact CWS canvas sizes):
  - landing-page/promo/small-promo-tile.jpg    (440x280)
  - landing-page/promo/marquee-promo-tile.jpg  (1400x560)

Re-run after visual rebrands or major releases; bump VERSION_TAG as needed.
Requires: Pillow, Arial fonts (macOS /System/Library/Fonts/Supplemental/).
"""

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BG = (13, 17, 23)
TEAL = (0, 212, 170)
TEXT = (230, 237, 243)
MUTED = (182, 192, 207)
NODE_COLORS = [
    (0, 212, 170),
    (88, 214, 141),
    (77, 159, 255),
    (255, 171, 76),
    (199, 120, 255),
]

ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
OUT_DIR = Path(__file__).resolve().parent
VERSION_TAG = "v1.3.0"


def tracked_text(draw, xy, text, font, fill, tracking=0):
    """Draw text with manual letter-spacing; returns total width."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking
    return x - xy[0]


def draw_motif(base, cx, cy, radius, seed=7, node_box=None):
    """Radial tracking-network motif on a transparent overlay.

    node_box optionally constrains satellite nodes to (xmin, ymin, xmax, ymax).
    """
    rng = random.Random(seed)
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for frac, alpha in ((0.35, 26), (0.65, 18), (1.0, 12)):
        r = radius * frac
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=TEAL + (alpha,), width=2)
    nodes = []
    attempts = 0
    while len(nodes) < 11 and attempts < 500:
        attempts += 1
        angle = rng.uniform(0, 2 * math.pi)
        dist = radius * rng.uniform(0.45, 1.0)
        nx, ny = cx + dist * math.cos(angle), cy + dist * math.sin(angle)
        if node_box is not None:
            xmin, ymin, xmax, ymax = node_box
            if not (xmin <= nx <= xmax and ymin <= ny <= ymax):
                continue
        nodes.append((nx, ny, rng.choice(NODE_COLORS), rng.uniform(0.5, 1.0)))
    for nx, ny, _, _ in nodes:
        d.line([cx, cy, nx, ny], fill=TEAL + (55,), width=2)
    for nx, ny, color, scale in nodes:
        r = max(3, radius * 0.045 * scale)
        d.ellipse([nx - r * 2, ny - r * 2, nx + r * 2, ny + r * 2], fill=color + (28,))
        d.ellipse([nx - r, ny - r, nx + r, ny + r], fill=color + (235,))
    d.ellipse(
        [cx - 10, cy - 10, cx + 10, cy + 10],
        fill=TEAL + (255,),
        outline=(255, 255, 255, 220),
        width=2,
    )
    return Image.alpha_composite(base, overlay)


def make_tile(width, height, layout):
    scale = 3
    W, H = width * scale, height * scale
    img = Image.new("RGBA", (W, H), BG + (255,))
    mx, my, mr = (v * scale for v in layout["motif"])
    box = None
    if "node_box" in layout:
        bx0, by0, bx1, by1 = layout["node_box"](*layout["motif"], width, height)
        box = (bx0 * scale, by0 * scale, bx1 * scale, by1 * scale)
    img = draw_motif(img, mx, my, mr, seed=7, node_box=box)
    d = ImageDraw.Draw(img)
    x0 = layout["x"] * scale
    tracked_text(
        d,
        (x0, layout["eyebrow_y"] * scale),
        "PRIVACY-FIRST  ·  LOCAL-ONLY",
        ImageFont.truetype(ARIAL_BOLD, layout["eyebrow"] * scale),
        TEAL,
        tracking=2 * scale,
    )
    d.text(
        (x0, layout["name_y"] * scale),
        "EchoFootPrint",
        font=ImageFont.truetype(ARIAL_BOLD, layout["name"] * scale),
        fill=TEXT,
    )
    d.text(
        (x0, layout["tag_y"] * scale),
        "See who tracks you across the web.",
        font=ImageFont.truetype(ARIAL, layout["tag"] * scale),
        fill=MUTED,
    )
    meta = f"{VERSION_TAG}   ·   50 platforms   ·   Zero telemetry"
    d.text(
        (x0, layout["meta_y"] * scale),
        meta,
        font=ImageFont.truetype(ARIAL, layout["meta"] * scale),
        fill=MUTED,
    )
    img = img.convert("RGB").resize((width, height), Image.LANCZOS)
    img.save(OUT_DIR / layout["file"], "JPEG", quality=92)
    print(f"wrote {layout['file']} ({width}x{height})")


LAYOUTS = {
    (440, 280): {
        "file": "small-promo-tile.jpg",
        "x": 30,
        "motif": (350, 235, 70),
        # keep satellites in the lower-right, clear of the text block
        "node_box": lambda mx, my, mr, W, H: (mx - 7, my - 12, W, H),
        "eyebrow": 13,
        "eyebrow_y": 58,
        "name": 42,
        "name_y": 80,
        "tag": 17,
        "tag_y": 140,
        "meta": 14,
        "meta_y": 170,
    },
    (1400, 560): {
        "file": "marquee-promo-tile.jpg",
        "x": 90,
        "motif": (1030, 280, 238),
        "eyebrow": 26,
        "eyebrow_y": 148,
        "name": 92,
        "name_y": 192,
        "tag": 34,
        "tag_y": 318,
        "meta": 28,
        "meta_y": 376,
    },
}

if __name__ == "__main__":
    for (w, h), layout in LAYOUTS.items():
        make_tile(w, h, layout)
