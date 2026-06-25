#!/usr/bin/env python3
"""Generate Chrome Web Store screenshots and promotional images for AI Exporter."""

from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    raise SystemExit("Install Pillow: pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "store-listing" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1280, 800
GREEN = (16, 163, 127)
GREEN_DARK = (26, 127, 100)
BG = (250, 250, 250)
WHITE = (255, 255, 255)
TEXT = (13, 13, 13)
MUTED = (107, 107, 107)
BORDER = (229, 229, 229)


def font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def base_canvas(title, subtitle):
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw.text((60, 48), title, fill=TEXT, font=font(42, True))
    draw.text((60, 108), subtitle, fill=MUTED, font=font(22))
    return img, draw


def rounded_rect(draw, xy, fill, radius=16, outline=None):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline)


def save(img, name):
    path = OUT / name
    img.save(path, "PNG", optimize=True)
    print(f"  {path}")


def shot_popup():
    img, draw = base_canvas("Extension Popup", "Choose scope, formats, and export with one click")
    panel = (340, 160, 700, 700)
    rounded_rect(draw, panel, WHITE, outline=BORDER)
    draw.rectangle((panel[0], panel[1], panel[2], panel[1] + 72), fill=GREEN)
    draw.text((panel[0] + 24, panel[1] + 18), "AI Exporter", fill=WHITE, font=font(22, True))
    draw.text((panel[0] + 24, panel[1] + 46), "Export ChatGPT → Claude, Gemini & more", fill=(220, 245, 238), font=font(12))

    y = panel[1] + 96
    for label in ["All conversations", "Current conversation only", "New since last export"]:
        rounded_rect(draw, (panel[0] + 20, y, panel[0] + 36, y + 16), GREEN if "All" in label else BORDER)
        draw.text((panel[0] + 48, y - 2), label, fill=TEXT, font=font(15))
        y += 34

    y += 12
    draw.text((panel[0] + 20, y), "FORMATS", fill=MUTED, font=font(11, True))
    y += 24
    for label, tag in [
        ("Universal JSON", "recommended"),
        ("Claude Project", "upload ready"),
        ("Gemini Import", "paste ready"),
    ]:
        draw.text((panel[0] + 20, y), f"☑ {label}", fill=TEXT, font=font(14))
        if tag:
            tw = draw.textlength(f"☑ {label}", font=font(14))
            rounded_rect(draw, (panel[0] + 28 + tw, y - 2, panel[0] + 28 + tw + 90, y + 18), (232, 245, 240))
            draw.text((panel[0] + 34 + tw, y), tag, fill=GREEN_DARK, font=font(10))
        y += 30

    rounded_rect(draw, (panel[0] + 20, panel[3] - 58, panel[2] - 20, panel[3] - 18), GREEN)
    draw.text((panel[0] + 110, panel[3] - 48), "Export conversations", fill=WHITE, font=font(18, True))

    # Browser chrome hint
    rounded_rect(draw, (720, 160, 1220, 700), (245, 245, 245), outline=BORDER)
    draw.text((740, 180), "chatgpt.com", fill=MUTED, font=font(14))
    draw.text((740, 220), "1. Click extension icon", fill=TEXT, font=font(18))
    draw.text((740, 260), "2. Select formats", fill=TEXT, font=font(18))
    draw.text((740, 300), "3. Click Export", fill=TEXT, font=font(18))
    save(img, "01-extension-popup.png")


def shot_floating_button():
    img, draw = base_canvas("Export Single Chats", "Green floating button on any conversation page")
    rounded_rect(draw, (80, 160, 900, 700), WHITE, outline=BORDER)
    draw.text((120, 190), "ChatGPT", fill=MUTED, font=font(14))
    draw.text((120, 240), "How do I migrate my data to Claude?", fill=TEXT, font=font(20, True))

    rounded_rect(draw, (520, 320, 820, 420), (244, 244, 244))
    draw.text((540, 350), "You can use AI Exporter to export", fill=TEXT, font=font(16))
    draw.text((540, 378), "all your chats as Markdown or JSON...", fill=TEXT, font=font(16))

    # FAB
    rounded_rect(draw, (760, 600, 940, 650), GREEN, radius=24)
    draw.text((790, 614), "↓  Export chat", fill=WHITE, font=font(16, True))

    draw.text((940, 200), "Appears on every", fill=TEXT, font=font(22, True))
    draw.text((940, 240), "conversation page", fill=TEXT, font=font(22, True))
    draw.text((940, 290), "One click → ZIP download", fill=MUTED, font=font(18))
    save(img, "02-floating-export-button.png")


def shot_progress():
    img, draw = base_canvas("Export Progress", "Real-time overlay while your chats are exported")
    rounded_rect(draw, (200, 220, 1080, 580), (0, 0, 0, 180))
    rounded_rect(draw, (390, 300, 890, 500), WHITE, radius=20)
    draw.text((430, 330), "AI Exporter", fill=TEXT, font=font(26, True))
    draw.text((430, 375), "Downloading 47 of 128", fill=MUTED, font=font(18))
    rounded_rect(draw, (430, 410, 850, 430), BORDER)
    rounded_rect(draw, (430, 410, 720, 430), GREEN)
    draw.text((430, 445), "Enterprise API integration guide", fill=MUTED, font=font(14))
    rounded_rect(draw, (430, 470, 530, 500), BORDER)
    draw.text((450, 478), "Cancel", fill=MUTED, font=font(14))
    save(img, "03-export-progress.png")


def shot_formats():
    img, draw = base_canvas("Export Formats", "One ZIP with everything you need for Claude, Gemini & more")
    folders = [
        ("universal/", "conversations.json", "Any AI tool"),
        ("claude-project/", "knowledge/*.md", "Claude Projects"),
        ("gemini-import/", "paste-ready/*.txt", "Google Gemini"),
        ("markdown/", "*.md", "Copy-paste"),
        ("raw/", "*.json", "Full ChatGPT data"),
    ]
    y = 170
    for folder, files, desc in folders:
        rounded_rect(draw, (80, y, 1180, y + 90), WHITE, outline=BORDER)
        draw.text((110, y + 18), folder, fill=GREEN_DARK, font=font(20, True))
        draw.text((110, y + 48), files, fill=TEXT, font=font(16))
        draw.text((900, y + 32), desc, fill=MUTED, font=font(18))
        y += 105
    save(img, "04-export-formats.png")


def shot_claude():
    img, draw = base_canvas("Import to Claude", "Upload knowledge files to Claude Projects in minutes")
    steps = [
        "1. Export with Claude Project format enabled",
        "2. Create a new Project at claude.ai",
        "3. Upload claude-project/knowledge/*.md",
        "4. Paste custom-instructions.txt",
        "5. Chat with full ChatGPT history as context",
    ]
    rounded_rect(draw, (80, 170, 620, 700), WHITE, outline=BORDER)
    y = 200
    for step in steps:
        draw.text((110, y), step, fill=TEXT, font=font(20))
        y += 70

    rounded_rect(draw, (660, 170, 1200, 700), (252, 250, 255), outline=BORDER)
    draw.text((690, 200), "claude-import/", fill=GREEN_DARK, font=font(18, True))
    for i, f in enumerate(["projects/knowledge/", "paste-ready/", "api/", "CLAUDE_SETUP.md"]):
        draw.text((710, 250 + i * 40), f"📁 {f}", fill=TEXT, font=font(17))
    draw.text((690, 500), "Helper:", fill=MUTED, font=font(14))
    draw.text((690, 530), "node tools/prepare-claude-import.mjs", fill=TEXT, font=font(15))
    save(img, "05-claude-import.png")


def shot_gemini():
    img, draw = base_canvas("Import to Gemini", "Paste-ready files for gemini.google.com and Gemini API")
    rounded_rect(draw, (80, 170, 580, 700), WHITE, outline=BORDER)
    draw.text((110, 200), "gemini-import/", fill=GREEN_DARK, font=font(22, True))
    for i, f in enumerate(["paste-ready/*.txt", "context-prompts/*.txt", "api/conversations.json", "GEMINI_SETUP.md"]):
        draw.text((130, 260 + i * 50), f"📄 {f}", fill=TEXT, font=font(18))

    rounded_rect(draw, (620, 170, 1200, 420), (240, 248, 255), outline=BORDER)
    draw.text((650, 200), "gemini.google.com", fill=MUTED, font=font(14))
    draw.text((650, 240), "Paste conversation context →", fill=TEXT, font=font(20, True))
    draw.text((650, 280), "Gemini continues where", fill=TEXT, font=font(20, True))
    draw.text((650, 320), "ChatGPT left off", fill=TEXT, font=font(20, True))

    rounded_rect(draw, (620, 450, 1200, 700), (245, 255, 250), outline=BORDER)
    draw.text((650, 480), "Gemini API format:", fill=MUTED, font=font(14))
    draw.text((650, 520), '{ "role": "user",', fill=TEXT, font=font(16))
    draw.text((650, 548), '  "parts": [{ "text": "..." }] }', fill=TEXT, font=font(16))
    draw.text((650, 610), "Helper: node tools/prepare-gemini-import.mjs", fill=GREEN_DARK, font=font(15))
    save(img, "06-gemini-import.png")


def shot_promo_small():
    img = Image.new("RGB", (640, 400), GREEN)
    draw = ImageDraw.Draw(img)
    draw.text((40, 60), "AI Exporter", fill=WHITE, font=font(48, True))
    draw.text((40, 130), "ChatGPT → Claude, Gemini", fill=(220, 245, 238), font=font(24))
    draw.text((40, 170), "Enterprise • Team • Personal", fill=(220, 245, 238), font=font(20))
    draw.text((40, 300), "by Gaurav Sisodia", fill=WHITE, font=font(18))
    draw.text((40, 330), "github.com/sisodiabhumca", fill=(200, 240, 230), font=font(16))
    save(img, "00-promo-tile.png")


def main():
    print("Generating store screenshots...")
    shot_promo_small()
    shot_popup()
    shot_floating_button()
    shot_progress()
    shot_formats()
    shot_claude()
    shot_gemini()
    print(f"\nDone — {len(list(OUT.glob('*.png')))} images in {OUT}")


if __name__ == "__main__":
    main()
