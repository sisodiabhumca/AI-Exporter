# AI Exporter — Roadmap

**Author:** Gaurav Sisodia · sisodiabhumca@gmail.com  
**Version:** 1.5.0 (Phase 3 complete)

---

## Phase 1 — Core power features ✅ (v1.3.0)

Rich content parser, in-chat panel, selective export, CSV, HTML/PDF, clipboard, keyboard shortcut, saved preferences.

---

## Phase 2 — Polish & differentiation ✅ (v1.4.0)

Group chats, Notion/Obsidian, HTML bundle, filename templates, panel format picker, compliance manifest, parallel fetch.

---

## Phase 3 — Multi-platform & enterprise ✅ (v1.5.0)

| Deliverable | Status |
|-------------|--------|
| Export from Claude.ai | ✅ Done |
| Export from Gemini | ✅ Done |
| RAG-ready JSONL chunks | ✅ Done |
| CLI companion tool | ✅ Done |
| Enhanced compliance mode (v2 manifest) | ✅ Done |

### Phase 3 features shipped in v1.5.0

- **Claude.ai export** — uses Claude's internal API with cookie auth, thinking blocks, tool calls
- **Gemini export** — batchexecute API (`MaZiqc` list, `hNvQHb` read)
- **Platform detection** — single extension works on chatgpt.com, claude.ai, gemini.google.com
- **RAG JSONL** — `rag/chunks.jsonl` with turn-pair chunking for embedding pipelines
- **CLI tool** — `node tools/ai-exporter.mjs rag-jsonl export.zip`
- **Compliance v2** — aggregate SHA-256, chain of custody metadata, platform field

---

## Phase 4 — Future (planned)

| Feature | Audience |
|---------|----------|
| Microsoft Copilot export | Enterprise users |
| Semantic chunking (embedding-aware splits) | RAG teams |
| Scheduled / automated exports | Power users |
| Firefox Add-ons store publish | Firefox users |

---

## How to test v1.5.0

1. Reload extension at `chrome://extensions`
2. **ChatGPT:** chatgpt.com → bulk export + panel
3. **Claude:** claude.ai → open a chat → Export button → panel
4. **Gemini:** gemini.google.com → open a chat → Export button
5. Enable **RAG JSONL** format → check `rag/chunks.jsonl` in ZIP
6. CLI: `node tools/ai-exporter.mjs rag-jsonl your-export.zip`

```bash
bash scripts/package-extension.sh
# dist/ai-exporter-chrome-v1.5.0.zip
```
