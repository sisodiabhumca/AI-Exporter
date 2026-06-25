# AI Exporter — Roadmap

**Author:** Gaurav Sisodia · sisodiabhumca@gmail.com  
**Version:** 1.7.0 (Phase 5 complete)

---

## Phase 1 — Core power features ✅ (v1.3.0)

Rich content parser, in-chat panel, selective export, CSV, HTML/PDF, clipboard, keyboard shortcut.

## Phase 2 — Polish & differentiation ✅ (v1.4.0)

Group chats, Notion/Obsidian, HTML bundle, filename templates, compliance manifest.

## Phase 3 — Multi-platform & enterprise ✅ (v1.5.0)

Claude, Gemini export, RAG JSONL, CLI tool, compliance v2.

---

## Phase 4 — Automation & enterprise ✅ (v1.6.0)

| Deliverable | Status |
|-------------|--------|
| Semantic RAG chunking (heading-aware) | ✅ Done |
| Scheduled recurring exports (alarms) | ✅ Done |
| Compliance audit log CSV | ✅ Done |
| Microsoft Copilot export (DOM) | ✅ Done |

## Phase 5 — Universal platform ✅ (v1.7.0)

| Deliverable | Status |
|-------------|--------|
| DeepSeek export | ✅ Done |
| Grok export | ✅ Done |
| Universal merge CLI | ✅ Done |
| HTML/PDF table of contents | ✅ Done |
| Firefox AMO submission checklist | ✅ Done |

### v1.7.0 supported platforms

| Platform | URL | Method |
|----------|-----|--------|
| ChatGPT | chatgpt.com | API |
| Claude | claude.ai | API |
| Gemini | gemini.google.com | batchexecute |
| Copilot | copilot.microsoft.com | DOM scrape |
| DeepSeek | chat.deepseek.com | API |
| Grok | grok.com | REST API |

---

## Phase 6 — Future

| Feature | Audience |
|---------|----------|
| Perplexity export | Researchers |
| Qwen / Mistral export | Global users |
| Headless export CLI with cookie auth | DevOps |
| i18n (34 languages) | Global store listing |

---

## How to test v1.7.0

```bash
bash scripts/package-extension.sh
# dist/ai-exporter-chrome-v1.7.0.zip
```

1. Test each platform: ChatGPT, Claude, Gemini, Copilot, DeepSeek, Grok
2. Enable **semantic RAG chunking** → check `rag/chunks.jsonl`
3. Enable **scheduled export** (weekly) with platform tab open
4. Enable **compliance** → verify `audit-log.csv`
5. Merge exports: `node tools/ai-exporter.mjs merge export1.zip export2.zip`
