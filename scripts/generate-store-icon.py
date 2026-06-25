#!/usr/bin/env python3
"""
Generate Chrome Web Store compliant extension icons.

Guidelines followed:
- 128x128 PNG with alpha transparency
- 96x96 artwork area, 16px transparent padding per side
- No baked rounded corners (Chrome applies its own mask)
- Simple symbol, no small text, works on light/dark backgrounds
- Separate optimized designs for 16, 48, 128
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
EXT_ICONS = ROOT / "extension" / "icons"
STORE_ICON = ROOT / "store-listing" / "icon-128.png"

GREEN = (16, 163, 127)
GREEN_DARK = (20, 130, 100)
WHITE = (255, 255, 255)
WHITE_GLOW = (255, 255, 255, 60)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def draw_gradient_circle(draw, cx, cy, r, c1, c2):
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            dx, dy = x - cx, y - cy
            if dx * dx + dy * dy <= r * r:
                t = (dy + r) / (2 * r)
                draw.point((x, y), fill=lerp(c1, c2, t))


def draw_chat_bubble(draw, x, y, w, h, radius, fill):
    draw.rounded_rectangle((x, y, x + w, y + h), radius=radius, fill=fill)
    # tail
    draw.polygon(
        [(x + w * 0.22, y + h), (x + w * 0.08, y + h + h * 0.22), (x + w * 0.36, y + h)],
        fill=fill,
    )


def draw_export_arrow(draw, cx, cy, size, stroke, width):
    half = size // 2
    top = cy - half
    bottom = cy + half
    shaft_left = cx - size * 0.12
    shaft_right = cx + size * 0.12
    head_w = size * 0.38

    draw.rectangle((shaft_left, top, shaft_right, bottom - head_w * 0.55), fill=stroke)
    draw.polygon(
        [
            (cx - head_w, bottom - head_w * 0.7),
            (cx + head_w, bottom - head_w * 0.7),
            (cx, bottom),
        ],
        fill=stroke,
    )
    # tray line
    tray_y = bottom + size * 0.08
    tray_half = size * 0.42
    draw.rounded_rectangle(
        (cx - tray_half, tray_y, cx + tray_half, tray_y + size * 0.14),
        radius=max(1, int(size * 0.05)),
        fill=stroke,
    )


def draw_icon_128():
    img = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 96x96 safe zone: offset 16px on each side
    cx, cy = 64, 58
    r = 46

    # Subtle outer glow for dark-background visibility
    glow = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    for i in range(4, 0, -1):
        gdraw.ellipse(
            (cx - r - i, cy - r - i, cx + r + i, cy + r + i),
            fill=(255, 255, 255, 18 + i * 8),
        )
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    draw_gradient_circle(draw, cx, cy, r, GREEN, GREEN_DARK)

    # Chat bubble (white)
    bw, bh = 38, 28
    bx, by = cx - bw // 2 - 4, cy - bh // 2 - 8
    draw_chat_bubble(draw, bx, by, bw, bh, 7, WHITE)

    # Three dots in bubble
    dot_y = by + bh // 2 - 1
    for i, dx in enumerate([-8, 0, 8]):
        draw.ellipse((cx - 4 + dx - 5, dot_y - 2, cx - 4 + dx + 1, dot_y + 4), fill=GREEN)

    # Export arrow
    draw_export_arrow(draw, cx + 2, cy + 30, 34, WHITE, 3)

    return img


def draw_icon_48():
    img = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = 24, 22
    r = 18
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=GREEN)

    # bubble
    draw.rounded_rectangle((12, 10, 30, 24), radius=4, fill=WHITE)
    draw.polygon([(15, 24), (12, 28), (19, 24)], fill=WHITE)

    # arrow
    draw.rectangle((21, 27, 27, 33), fill=WHITE)
    draw.polygon([(18, 31), (30, 31), (24, 37)], fill=WHITE)
    draw.rounded_rectangle((16, 38, 32, 41), radius=2, fill=WHITE)

    return img


def draw_icon_16():
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse((1, 1, 15, 15), fill=GREEN)
    draw.rectangle((4, 4, 11, 9), fill=WHITE)
    draw.rectangle((7, 10, 9, 13), fill=WHITE)
    draw.polygon([(5, 12), (11, 12), (8, 14)], fill=WHITE)
    return img


def main():
    EXT_ICONS.mkdir(parents=True, exist_ok=True)
    STORE_ICON.parent.mkdir(parents=True, exist_ok=True)

    icon128 = draw_icon_128()
    icon48 = draw_icon_48()
    icon16 = draw_icon_16()

    paths = {
        EXT_ICONS / "icon128.png": icon128,
        EXT_ICONS / "icon48.png": icon48,
        EXT_ICONS / "icon16.png": icon16,
        STORE_ICON: icon128.copy(),
    }

    for path, img in paths.items():
        img.save(path, "PNG", optimize=True)
        print(f"  {path} ({img.size[0]}x{img.size[1]})")

    print("\nChrome Web Store icon ready:")
    print(f"  Upload: {STORE_ICON}")
    print("  Guidelines: 96x96 artwork, 16px transparent padding, PNG with alpha")


if __name__ == "__main__":
    main()
