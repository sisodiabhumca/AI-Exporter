# AI Exporter Tools

Command-line helpers to transform exports and prepare import packages.

## Unified CLI

```bash
node tools/ai-exporter.mjs <command> <export.zip|folder> [options]
```

| Command | Description |
|---------|-------------|
| `merge` | Merge multiple export ZIPs into one universal JSON |
| `rag-jsonl` | Generate RAG-ready JSONL chunks |
| `claude-import` | Full Claude import package |
| `claude-project` | Claude Project knowledge files only |
| `gemini-import` | Gemini paste-ready + API package |

## Merge exports

```bash
node tools/ai-exporter.mjs merge chatgpt-export.zip claude-export.zip grok-export.zip
node tools/merge-exports.mjs export1.zip export2.zip --out merged/
```

Output: `universal/conversations.json` with deduplicated conversations from all inputs.

## RAG JSONL

```bash
node tools/ai-exporter.mjs rag-jsonl ~/Downloads/chatgpt-export.zip
node tools/prepare-rag-jsonl.mjs export.zip --chunk-size 1500 --overlap 200
```

Output: `rag-jsonl/chunks.jsonl` — one JSON object per line with `content`, `conversation_id`, `chunk_index`, `metadata`.

## Claude import

### Full package (recommended)

```bash
node tools/prepare-claude-import.mjs ~/Downloads/chatgpt-export.zip
```

Output: `claude-import/`
- `projects/knowledge/` — upload to Claude Projects
- `paste-ready/` — copy-paste into Claude chats
- `api/` — JSON for Claude API
- `CLAUDE_SETUP.md` — setup guide

### Projects only

```bash
node tools/prepare-claude-project.mjs ~/Downloads/chatgpt-export.zip
```

## Gemini import

```bash
node tools/prepare-gemini-import.mjs ~/Downloads/chatgpt-export.zip
```

## Options

All tools support:

```bash
node tools/prepare-<tool>.mjs <export-folder-or-zip> [--out <directory>]
```

RAG JSONL additionally supports:
- `--chunk-size <n>` — max characters per chunk (default 2000)
- `--overlap <n>` — overlap between chunks (default 200)
- `--strategy turn-pair|message|semantic` — chunking strategy

## Supported input formats

| Path in export | Format |
|----------------|--------|
| `universal/conversations.json` | Universal JSON (preferred) |
| `rag/chunks.jsonl` | Pre-built RAG chunks |
| `gemini/conversations.json` | Gemini JSON |
| `claude/*.json` | Per-conversation Claude JSON |
| `markdown/*.md` | Markdown files |

## Requirements

- Node.js 18+
- `unzip` command (only when passing a `.zip` file)

## Note on live export

Exporting directly from supported platforms requires the browser extension. CLI tools transform already-exported ZIP files.
