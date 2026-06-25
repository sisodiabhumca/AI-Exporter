Export conversations from **ChatGPT**, **Claude.ai**, and **Gemini** — including Enterprise/Team ChatGPT accounts — to formats ready for Notion, Obsidian, RAG pipelines, and cross-AI migration.

**No API keys. No cloud upload. Everything runs locally in your browser.**

---

## Why AI Exporter?

OpenAI's built-in export is unavailable on many Team/Business plans. AI Exporter uses your existing ChatGPT session to download every conversation directly to your computer — in formats designed for import into other AI products and knowledge bases.

---

## Features

✅ **ChatGPT, Claude & Gemini** — one extension, three platforms  
✅ **Enterprise / Team / Business** — auto-detects ChatGPT workspace accounts  
✅ **Export all conversations** — full pagination, even thousands of chats  
✅ **Selective message export** — in-chat panel with checkboxes and Shift+click ranges  
✅ **Multiple formats in one ZIP** — JSON, Markdown, CSV, Notion, Obsidian, Claude, Gemini  
✅ **Claude Project ready** — upload knowledge files directly to claude.ai  
✅ **Gemini paste-ready** — copy-paste files for gemini.google.com  
✅ **Notion & Obsidian** — optimized markdown for your knowledge base  
✅ **HTML bundle** — browse all exports in one offline HTML reader  
✅ **Local PDF** — print-ready HTML, Save as PDF with no server  
✅ **RAG JSONL** — embedding-ready chunks for AI engineering pipelines  
✅ **CLI companion** — `node tools/ai-exporter.mjs rag-jsonl export.zip`  
✅ **Compliance manifest v2** — SHA-256 + chain of custody metadata  
✅ **Incremental export** — export only new chats since last run  
✅ **Image & attachment download** — optional file export  
✅ **Keyboard shortcut** — `Ctrl+Shift+E` / `⌘⇧E` opens export panel  
✅ **Firefox + Chrome** — works in all major browsers  

---

## Export formats

| Format | Use with |
|--------|----------|
| Universal JSON | Any AI tool, scripts, pipelines |
| Markdown | Copy-paste into any chat |
| CSV | Spreadsheets and analysis |
| HTML / PDF | Print → Save as PDF locally |
| Notion | Paste into Notion pages |
| Obsidian | Obsidian vault with YAML frontmatter |
| HTML Bundle | Offline multi-chat browser |
| Claude Project | Upload to claude.ai Projects |
| Claude JSON | Claude API / Claude Code |
| Gemini Import | gemini.google.com + Gemini API |
| OpenAI JSON | OpenAI API format |
| Raw JSON | Full ChatGPT metadata |
| RAG JSONL | LangChain, LlamaIndex, embedding pipelines |
| Compliance manifest | SHA-256 audit trail v2 (optional) |

---

## How to use

1. Install the extension
2. Go to chatgpt.com and sign in
3. Click the AI Exporter icon
4. Choose formats and click **Export conversations**
5. A ZIP downloads to your computer

**Single chat:** Click the green **Export chat** button while viewing any conversation. Use the panel to select specific messages, pick formats, copy to clipboard, or print to PDF.

---

## Import helpers

Included command-line tools prepare import packages:

```bash
node tools/prepare-claude-import.mjs your-export.zip
node tools/prepare-gemini-import.mjs your-export.zip
```

See the [User Guide](https://github.com/sisodiabhumca/ai-exporter/blob/main/docs/USER_GUIDE.md) for screenshots and step-by-step instructions.

---

## Privacy

All processing happens in your browser. Your conversations never leave your machine. No telemetry. No external servers.

[Privacy Policy](https://github.com/sisodiabhumca/ai-exporter/blob/main/store-listing/privacy-policy.md)

---

## Author

**Gaurav Sisodia** — [github.com/sisodiabhumca](https://github.com/sisodiabhumca)  
**Contact:** sisodiabhumca@gmail.com

Open source under MIT license.
