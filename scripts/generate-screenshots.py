#!/usr/bin/env python3
"""Generate Chrome Web Store screenshots and promotional images for AI Exporter."""

from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    raise SystemExit("Install Pillow: pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
SCREENSHOTS = ROOT / "store-listing" / "screenshots"
DOCS_SHOTS = SCREENSHOTS / "docs"
PROMO = ROOT / "store-listing" / "promo"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)
DOCS_SHOTS.mkdir(parents=True, exist_ok=True)
PROMO.mkdir(parents=True, exist_ok=True)

W, H = 1280, 800
PROMO_W, PROMO_H = 440, 280
MARQUEE_W, MARQUEE_H = 1400, 560
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


def save_rgb_png(img, path):
    if img.mode != "RGB":
        img = img.convert("RGB")
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print(f"  {path} ({img.size[0]}×{img.size[1]} RGB)")


def save_promo_pair(img, stem):
    png_path = PROMO / f"{stem}.png"
    jpg_path = PROMO / f"{stem}.jpg"
    save_rgb_png(img, png_path)
    img.save(jpg_path, "JPEG", quality=92, optimize=True)
    print(f"  {jpg_path} ({img.size[0]}×{img.size[1]} JPEG)")


def shot_promo_small():
    img = Image.new("RGB", (PROMO_W, PROMO_H), GREEN)
    draw = ImageDraw.Draw(img)
    draw.text((24, 28), "AI Exporter", fill=WHITE, font=font(32, True))
    draw.text((24, 72), "Export AI chats locally", fill=(220, 245, 238), font=font(15))
    draw.text((24, 98), "JSON · Markdown · PDF · RAG", fill=(220, 245, 238), font=font(13))
    draw.text((24, 126), "100% in your browser", fill=(200, 240, 230), font=font(12))
    draw.text((24, 232), "Gaurav Sisodia", fill=WHITE, font=font(12))
    save_promo_pair(img, "small-tile-440x280")


def shot_promo_marquee():
    img = Image.new("RGB", (MARQUEE_W, MARQUEE_H), GREEN)
    draw = ImageDraw.Draw(img)

    draw.text((72, 72), "AI Exporter", fill=WHITE, font=font(72, True))
    draw.text((72, 168), "Export AI chat history to your computer", fill=(230, 248, 242), font=font(30))
    draw.text((72, 214), "JSON · Markdown · PDF · RAG · Notion · Obsidian", fill=(210, 240, 232), font=font(22))

    bullets = [
        "ChatGPT Projects — chats, instructions & files",
        "Bulk export or selective message picker",
        "100% local — no cloud upload",
    ]
    y = 290
    for line in bullets:
        rounded_rect(draw, (72, y, 92, y + 20), WHITE, radius=10)
        draw.text((82, y + 2), "✓", fill=GREEN, font=font(14, True))
        draw.text((108, y), line, fill=WHITE, font=font(22))
        y += 48

    draw.text((72, 490), "by Gaurav Sisodia · github.com/sisodiabhumca", fill=(200, 240, 230), font=font(18))

    card = (760, 56, 1340, 504)
    rounded_rect(draw, card, WHITE, radius=24, outline=BORDER)
    draw.rectangle((card[0], card[1], card[2], card[1] + 72), fill=GREEN)
    draw.text((card[0] + 28, card[1] + 16), "AI Exporter", fill=WHITE, font=font(28, True))
    draw.text((card[0] + 28, card[1] + 46), "Export from supported AI chat sites", fill=(220, 245, 238), font=font(14))

    y = card[1] + 100
    for label in ["All conversations", "Universal JSON", "RAG JSONL", "Notion", "Obsidian"]:
        draw.text((card[0] + 28, y), f"☑ {label}", fill=TEXT, font=font(18))
        y += 38

    rounded_rect(draw, (card[0] + 28, card[3] - 72, card[2] - 28, card[3] - 24), GREEN, radius=12)
    draw.text((card[0] + 120, card[3] - 58), "Export conversations", fill=WHITE, font=font(22, True))

    save_promo_pair(img, "marquee-tile-1400x560")


def shot_popup():
    img, draw = base_canvas("Extension Popup", "Formats, scheduled exports, and in-app feedback")
    panel = (300, 130, 680, 740)
    rounded_rect(draw, panel, WHITE, outline=BORDER)
    draw.rectangle((panel[0], panel[1], panel[2], panel[1] + 76), fill=GREEN)
    draw.text((panel[0] + 20, panel[1] + 14), "AI Exporter", fill=WHITE, font=font(20, True))
    draw.text((panel[0] + 20, panel[1] + 44), "Export ChatGPT · all chats + Projects", fill=(220, 245, 238), font=font(11))

    y = panel[1] + 88
    for label in ["All conversations", "Current conversation only", "New since last export"]:
        rounded_rect(draw, (panel[0] + 16, y, panel[0] + 32, y + 14), GREEN if "All" in label else BORDER)
        draw.text((panel[0] + 42, y - 2), label, fill=TEXT, font=font(12))
        y += 26

    y += 4
    draw.text((panel[0] + 16, y), "FORMATS", fill=MUTED, font=font(10, True))
    y += 18
    for label in ["Universal JSON", "Markdown", "RAG JSONL", "Claude Project"]:
        draw.text((panel[0] + 16, y), f"☑ {label}", fill=TEXT, font=font(11))
        y += 20

    rounded_rect(draw, (panel[0] + 16, panel[3] - 118, panel[2] - 16, panel[3] - 58), GREEN)
    draw.text((panel[0] + 90, panel[3] - 108), "Export conversations", fill=WHITE, font=font(15, True))

    draw.text((panel[0] + 16, panel[3] - 48), "REPORT AN ISSUE", fill=MUTED, font=font(9, True))
    rounded_rect(draw, (panel[0] + 16, panel[3] - 34, panel[2] - 16, panel[3] - 12), (248, 255, 252), outline=(184, 224, 212))
    draw.text((panel[0] + 24, panel[3] - 28), "Submit feedback on GitHub", fill=GREEN_DARK, font=font(10, True))

    rounded_rect(draw, (700, 150, 1220, 720), (245, 245, 245), outline=BORDER)
    draw.text((720, 170), "Supported sites", fill=TEXT, font=font(20, True))
    platforms = [
        ("ChatGPT", "chatgpt.com"),
        ("Claude", "claude.ai"),
        ("Gemini", "gemini.google.com"),
        ("Copilot", "copilot.microsoft.com"),
        ("DeepSeek", "chat.deepseek.com"),
        ("Grok", "grok.com"),
    ]
    py = 220
    for name, url in platforms:
        rounded_rect(draw, (720, py, 1200, py + 44), WHITE, outline=BORDER)
        draw.text((740, py + 6), name, fill=GREEN_DARK, font=font(15, True))
        draw.text((740, py + 24), url, fill=MUTED, font=font(12))
        py += 52
    save_rgb_png(img, SCREENSHOTS / "01-extension-popup.png")


def shot_floating_button():
    img, draw = base_canvas("Export Single Chats", "Floating button on any supported AI chat page")
    rounded_rect(draw, (80, 160, 900, 700), WHITE, outline=BORDER)
    draw.text((120, 190), "AI chat site", fill=MUTED, font=font(14))
    draw.text((120, 240), "How do I migrate my data to another AI?", fill=TEXT, font=font(20, True))

    rounded_rect(draw, (520, 320, 820, 420), (244, 244, 244))
    draw.text((540, 350), "Use AI Exporter to export all your chats", fill=TEXT, font=font(16))
    draw.text((540, 378), "as Markdown, JSON, or RAG JSONL...", fill=TEXT, font=font(16))

    rounded_rect(draw, (760, 600, 940, 650), GREEN, radius=24)
    draw.text((790, 614), "↓  Export chat", fill=WHITE, font=font(16, True))

    draw.text((940, 200), "Works on major AI chat sites", fill=TEXT, font=font(22, True))
    draw.text((940, 250), "One click → ZIP download", fill=MUTED, font=font(18))
    draw.text((940, 290), "Select messages or export all", fill=MUTED, font=font(16))
    save_rgb_png(img, SCREENSHOTS / "02-floating-export-button.png")


def shot_progress():
    img, draw = base_canvas("Export Progress", "Discovers Projects, downloads chats and knowledge files")
    rounded_rect(draw, (200, 220, 1080, 580), (40, 40, 40))
    rounded_rect(draw, (390, 300, 890, 500), WHITE, radius=20)
    draw.text((430, 330), "AI Exporter", fill=TEXT, font=font(26, True))
    draw.text((430, 375), "Downloading Project files: Research Notes", fill=MUTED, font=font(17))
    rounded_rect(draw, (430, 410, 850, 430), BORDER)
    rounded_rect(draw, (430, 410, 710, 430), GREEN)
    draw.text((430, 445), "Found 84 conversations (3 projects)", fill=MUTED, font=font(14))
    rounded_rect(draw, (430, 468, 890, 498), (248, 255, 252), outline=(184, 224, 212), radius=8)
    draw.text((448, 478), "Report issue on GitHub", fill=GREEN_DARK, font=font(13, True))
    save_rgb_png(img, SCREENSHOTS / "03-export-progress.png")


def shot_formats():
    img, draw = base_canvas("Export Output", "One ZIP — chats, ChatGPT Projects, RAG, and knowledge files")
    folders = [
        ("projects/Research/", "custom-instructions.txt", "Project instructions"),
        ("projects/Research/", "knowledge-files/*.pdf", "Uploaded docs"),
        ("projects/Research/", "markdown/*.md", "Project chats"),
        ("chatgpt/", "export-index.json", "Main vs project counts"),
        ("universal/", "conversations.json", "Any AI tool"),
        ("rag/", "chunks.jsonl", "Embedding pipelines"),
        ("notion/", "*.md", "Notion pages"),
        ("compliance/", "manifest.json + audit-log.csv", "SHA-256 audit"),
    ]
    y = 150
    for folder, files, desc in folders:
        rounded_rect(draw, (80, y, 1180, y + 68), WHITE, outline=BORDER)
        draw.text((110, y + 12), folder, fill=GREEN_DARK, font=font(17, True))
        draw.text((110, y + 36), files, fill=TEXT, font=font(13))
        draw.text((900, y + 24), desc, fill=MUTED, font=font(15))
        y += 74
    save_rgb_png(img, SCREENSHOTS / "04-export-formats.png")


def shot_panel():
    img, draw = base_canvas("Selective Export Panel", "Pick messages, formats, and export — all from the chat page")
    rounded_rect(draw, (60, 150, 700, 720), WHITE, outline=BORDER)
    draw.text((90, 180), "AI chat conversation", fill=MUTED, font=font(14))
    for i, (role, text) in enumerate([
        ("You", "How do I export only part of this chat?"),
        ("Assistant", "Use the export panel to select specific messages..."),
        ("You", "Can I get Notion format too?"),
        ("Assistant", "Yes — check Notion in the format picker."),
    ]):
        y = 230 + i * 90
        draw.text((90, y), role, fill=GREEN_DARK if role == "Assistant" else MUTED, font=font(12, True))
        rounded_rect(draw, (90, y + 20, 660, y + 70), (244, 244, 244) if role == "Assistant" else (248, 252, 250))
        draw.text((110, y + 32), text, fill=TEXT, font=font(15))

    rounded_rect(draw, (720, 150, 1220, 720), WHITE, outline=BORDER)
    draw.rectangle((720, 150, 1220, 210), fill=GREEN)
    draw.text((740, 168), "AI Exporter", fill=WHITE, font=font(20, True))

    draw.text((740, 230), "☑ All messages selected", fill=MUTED, font=font(12))
    y = 260
    for label in ["Markdown", "RAG JSONL", "Notion", "Obsidian", "Project import"]:
        draw.text((740, y), f"☑ {label}", fill=TEXT, font=font(13))
        y += 26

    y += 10
    for i in range(3):
        rounded_rect(draw, (740, y, 1200, y + 50), (232, 245, 240) if i == 1 else WHITE, outline=BORDER)
        draw.text((760, y + 8), "You" if i % 2 == 0 else "Assistant", fill=GREEN_DARK, font=font(11, True))
        draw.text((760, y + 26), "Message preview text...", fill=MUTED, font=font(12))
        y += 58

    rounded_rect(draw, (740, 660, 960, 700), GREEN, radius=8)
    draw.text((770, 672), "↓ Download ZIP", fill=WHITE, font=font(13, True))
    rounded_rect(draw, (980, 660, 1200, 700), WHITE, outline=BORDER, radius=8)
    draw.text((1000, 672), "Report issue", fill=GREEN_DARK, font=font(12))
    save_rgb_png(img, SCREENSHOTS / "05-export-panel.png")


def shot_chatgpt_projects_docs():
    img, draw = base_canvas(
        "ChatGPT Projects Export",
        "All project chats, custom instructions, and uploaded knowledge files",
    )
    rounded_rect(draw, (80, 170, 620, 700), WHITE, outline=BORDER)
    draw.text((110, 200), "projects/Research Notes/", fill=GREEN_DARK, font=font(20, True))
    items = [
        "custom-instructions.txt",
        "instructions.md",
        "project.json",
        "knowledge-manifest.json",
        "knowledge-files/report.pdf",
        "knowledge-files/spec.docx",
        "markdown/architecture_chat.md",
    ]
    y = 250
    for item in items:
        prefix = "📄" if item.endswith((".txt", ".md", ".json")) else "📎"
        draw.text((130, y), f"{prefix} {item}", fill=TEXT, font=font(16))
        y += 42

    rounded_rect(draw, (660, 170, 1200, 700), (245, 252, 250), outline=BORDER)
    draw.text((690, 200), "Included in every export", fill=MUTED, font=font(14))
    steps = [
        "Main sidebar chat history",
        "Chats inside each Project",
        "Project custom instructions",
        "PDFs & docs uploaded to Projects",
        "Deduplicated by conversation ID",
    ]
    y = 240
    for step in steps:
        rounded_rect(draw, (690, y, 710, y + 18), GREEN, radius=9)
        draw.text((696, y + 1), "✓", fill=WHITE, font=font(12, True))
        draw.text((724, y), step, fill=TEXT, font=font(18))
        y += 52

    draw.text((690, 560), "chatgpt/export-index.json", fill=GREEN_DARK, font=font(15))
    draw.text((690, 590), "Summary of main vs project conversation counts", fill=MUTED, font=font(14))
    save_rgb_png(img, DOCS_SHOTS / "chatgpt-projects.png")


def shot_claude_docs():
    img, draw = base_canvas("Import to Claude", "Upload knowledge files to Claude Projects in minutes")
    steps = [
        "1. Export with Project import format enabled",
        "2. Create a new Project at claude.ai",
        "3. Upload claude-project/knowledge/*.md",
        "4. Paste custom-instructions.txt",
        "5. Chat with full exported history as context",
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
    save_rgb_png(img, DOCS_SHOTS / "claude-import.png")


def shot_gemini_docs():
    img, draw = base_canvas("Import to Gemini", "Paste-ready files for gemini.google.com and Gemini API")
    rounded_rect(draw, (80, 170, 580, 700), WHITE, outline=BORDER)
    draw.text((110, 200), "gemini-import/", fill=GREEN_DARK, font=font(22, True))
    for i, f in enumerate(["paste-ready/*.txt", "context-prompts/*.txt", "api/conversations.json", "GEMINI_SETUP.md"]):
        draw.text((130, 260 + i * 50), f"📄 {f}", fill=TEXT, font=font(18))

    rounded_rect(draw, (620, 170, 1200, 420), (240, 248, 255), outline=BORDER)
    draw.text((650, 200), "gemini.google.com", fill=MUTED, font=font(14))
    draw.text((650, 240), "Paste conversation context →", fill=TEXT, font=font(20, True))
    draw.text((650, 280), "Continue chats with imported", fill=TEXT, font=font(20, True))
    draw.text((650, 320), "history as context", fill=TEXT, font=font(20, True))

    rounded_rect(draw, (620, 450, 1200, 700), (245, 255, 250), outline=BORDER)
    draw.text((650, 480), "API JSON format:", fill=MUTED, font=font(14))
    draw.text((650, 520), '{ "role": "user",', fill=TEXT, font=font(16))
    draw.text((650, 548), '  "parts": [{ "text": "..." }] }', fill=TEXT, font=font(16))
    draw.text((650, 610), "Helper: node tools/prepare-gemini-import.mjs", fill=GREEN_DARK, font=font(15))
    save_rgb_png(img, DOCS_SHOTS / "gemini-import.png")


def cleanup_old_assets():
    for stale in [
        SCREENSHOTS / "00-promo-tile.png",
        SCREENSHOTS / "05-claude-import.png",
        SCREENSHOTS / "06-gemini-import.png",
        SCREENSHOTS / "07-export-panel.png",
    ]:
        if stale.exists():
            stale.unlink()
            print(f"  removed stale {stale.name}")


def main():
    print("Generating Chrome Web Store assets...")
    cleanup_old_assets()
    shot_promo_small()
    shot_promo_marquee()
    shot_popup()
    shot_floating_button()
    shot_progress()
    shot_formats()
    shot_panel()
    shot_chatgpt_projects_docs()
    shot_claude_docs()
    shot_gemini_docs()
    chrome_count = len(list(SCREENSHOTS.glob("[0-9]*.png")))
    print(f"\nDone — {chrome_count} store screenshots (1280×800), promo tiles (440×280 + 1400×560)")
    print(f"  Screenshots: {SCREENSHOTS}")
    print(f"  Promo tile:  {PROMO}")
    print(f"  Doc-only:    {DOCS_SHOTS}")


if __name__ == "__main__":
    main()
