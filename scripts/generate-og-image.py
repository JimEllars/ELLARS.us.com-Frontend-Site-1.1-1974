#!/usr/bin/env python3
"""
Generates public/og-image.png — the 1200x630 social card.

Why this file exists at all: index.html named
`https://ellars.us.com/screenshot_home.png` as both `og:image` and
`twitter:image`, and that file was never committed. Every shared link therefore
previewed with no image, and the request for it was answered by the SPA shell
(see lib/edge/assets.js). A social card is a brand asset, so it is generated
from the palette rather than screenshotted.

Run manually when the mark changes — this is not part of the build and CI only
asserts that the output exists:

    python3 scripts/generate-og-image.py

Palette: void #050505, yellow-electric #FDE047, bone #F5F5F4.
Design rule: bold, neon-saturated, text-free.
"""

from PIL import Image, ImageDraw, ImageFilter

W, H = 1200, 630
VOID = (5, 5, 5)
YELLOW = (253, 224, 71)
BONE = (245, 245, 244)

img = Image.new("RGB", (W, H), VOID)

# --- ambient glow: a wide electric wash from the lower left -------------------
glow = Image.new("RGB", (W, H), VOID)
g = ImageDraw.Draw(glow)
g.ellipse([-320, H - 200, 620, H + 420], fill=(120, 104, 20))
g.ellipse([W - 420, -260, W + 260, 260], fill=(48, 42, 10))
glow = glow.filter(ImageFilter.GaussianBlur(150))
img = Image.blend(img, glow, 0.85)

draw = ImageDraw.Draw(img)

# --- deco frame: double rule with corner brackets ----------------------------
INSET = 34
draw.rectangle([INSET, INSET, W - INSET, H - INSET], outline=(60, 56, 28), width=2)
draw.rectangle([INSET + 12, INSET + 12, W - INSET - 12, H - INSET - 12], outline=(38, 36, 20), width=1)

BR = 58  # bracket arm length
for x, y, dx, dy in (
    (INSET, INSET, 1, 1),
    (W - INSET, INSET, -1, 1),
    (INSET, H - INSET, 1, -1),
    (W - INSET, H - INSET, -1, -1),
):
    draw.line([(x, y), (x + BR * dx, y)], fill=YELLOW, width=4)
    draw.line([(x, y), (x, y + BR * dy)], fill=YELLOW, width=4)


# --- scanlines: the interface texture the brand uses on dark surfaces --------
# Applied before the mark so the bars stay solid: at 55% over the finished
# composition they read as damaged print, not as a screen.
tile = Image.new("RGB", (W, 1), (16, 15, 12))
for y in range(0, H, 4):
    img.paste(Image.blend(img.crop((0, y, W, y + 1)), tile, 0.4), (0, y))

draw = ImageDraw.Draw(img)


# --- the mark: a constructed "E", three bars on a spine ----------------------
def build_mark(draw_ctx, colour, dx=0, dy=0):
    left, top = 352 + dx, 146 + dy
    spine_w, bar_h, height, length = 52, 54, 338, 286
    draw_ctx.rectangle([left, top, left + spine_w, top + height], fill=colour)
    draw_ctx.rectangle([left, top, left + length, top + bar_h], fill=colour)
    draw_ctx.rectangle([left, top + (height - bar_h) / 2, left + length - 40, top + (height + bar_h) / 2], fill=colour)
    draw_ctx.rectangle([left, top + height - bar_h, left + length, top + height], fill=colour)


# glow pass, then the solid mark on top
mark_glow = Image.new("RGB", (W, H), VOID)
build_mark(ImageDraw.Draw(mark_glow), (110, 96, 22))
mark_glow = mark_glow.filter(ImageFilter.GaussianBlur(38))
img = Image.blend(img, Image.composite(mark_glow, img, mark_glow.convert("L").point(lambda v: min(v * 3, 255))), 0.9)

draw = ImageDraw.Draw(img)
build_mark(draw, YELLOW)

# --- deco ribs behind the mark: a ziggurat reading upward --------------------
for i, width in enumerate((330, 262, 196, 132)):
    y = 168 + i * 14
    x0 = 352 + 286 + 52
    draw.line([(x0, y), (x0 + width, y)], fill=(44, 41, 22), width=2)

# a single vertical hairline anchors the right third of the composition
draw.line([(W - 250, 168), (W - 250, 452)], fill=(44, 41, 22), width=2)
draw.rectangle([W - 250 - 5, 168, W - 250 + 5, 226], fill=YELLOW)

# --- horizon rule + ticks, echoing the site's structural styling -------------
draw.line([(96, H - 150), (W - 96, H - 150)], fill=(60, 56, 28), width=2)
tick = 10
x = 96
while x <= W - 96:
    draw.line([(x, H - 150), (x, H - 150 + tick)], fill=(72, 66, 30), width=2)
    x += 48

# accent block, bottom right: the one saturated mass in the composition
draw.rectangle([W - 96 - 190, H - 108, W - 96, H - 108 + 10], fill=YELLOW)
draw.rectangle([W - 96 - 118, H - 86, W - 96, H - 86 + 10], fill=(90, 80, 30))

img.save("public/og-image.png", "PNG", optimize=True)
print("wrote public/og-image.png")
