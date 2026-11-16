"""Team logo processing for Memorabilia Showcase.

Turns any logo image into a 256x256 transparent PNG, trimmed, centered with an
8% margin, palette-reduced to keep it small. Name each output exactly like the
value in the spreadsheet's Team column (e.g. "Chicago Cubs.png").

Usage: edit SRC_DIR, OUT and JOBS, then run with Python 3 + Pillow.
"""
from collections import deque
import os

from PIL import Image

SRC_DIR = os.path.expanduser("~/TEMP")
OUT = os.path.expanduser("~/Team Logos")
PREV = os.path.join(SRC_DIR, "_logo_previews")

# (source file in SRC_DIR, final file name = Team column value + ".png")
JOBS = [
    ("Example_logo.svg.webp", "Exact Team Name.png"),
]

SIZE = 256
PAD = round(SIZE * 0.08)
BOX = SIZE - 2 * PAD


def remove_white_background(im):
    """Makes near-white pixels connected to the edges transparent (only for opaque white backgrounds)."""
    px = im.load()
    w, h = im.size
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    if not all(c[3] > 250 and min(c[:3]) > 240 for c in corners):
        return
    seen = bytearray(w * h)
    queue = deque([(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)])
    while queue:
        x, y = queue.popleft()
        if not (0 <= x < w and 0 <= y < h) or seen[y * w + x]:
            continue
        r, g, b, a = px[x, y]
        if a < 10 or min(r, g, b) > 235:
            seen[y * w + x] = 1
            px[x, y] = (255, 255, 255, 0)
            queue.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])


def process(src, name):
    im = Image.open(os.path.join(SRC_DIR, src)).convert("RGBA")
    if max(im.size) > 1600:
        im.thumbnail((1600, 1600), Image.LANCZOS)
    remove_white_background(im)

    im = im.crop(im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox())
    bw, bh = im.size
    k = min(BOX / bw, BOX / bh)
    dw, dh = round(bw * k), round(bh * k)
    im = im.resize((dw, dh), Image.LANCZOS)

    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(im, ((SIZE - dw) // 2, (SIZE - dh) // 2), im)
    out = canvas.quantize(colors=96, method=Image.Quantize.FASTOCTREE)
    path = os.path.join(OUT, name)
    out.save(path, optimize=True)

    preview = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 255))
    preview.alpha_composite(out.convert("RGBA"))
    preview.convert("RGB").save(os.path.join(PREV, name))
    print(f"{name}: {dw}x{dh}, {os.path.getsize(path)} bytes")


if __name__ == "__main__":
    os.makedirs(PREV, exist_ok=True)
    for source, target in JOBS:
        process(source, target)
