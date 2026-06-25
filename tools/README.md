# AI Exporter Tools

Command-line helpers to prepare ChatGPT exports for Claude and Gemini.

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

Output: `claude-project-upload/knowledge/`

## Gemini import

```bash
node tools/prepare-gemini-import.mjs ~/Downloads/chatgpt-export.zip
```

Output: `gemini-import/`
- `paste-ready/` — copy-paste into gemini.google.com
- `context-prompts/` — long chats with framing instructions
- `api/` — Gemini API JSON (`user` / `model` turns)
- `GEMINI_SETUP.md` — setup guide

## Options

All tools support:

```bash
node tools/prepare-<tool>.mjs <export-folder-or-zip> [--out <directory>]
```

## Supported input formats

| Path in export | Format |
|----------------|--------|
| `universal/conversations.json` | Universal JSON (preferred) |
| `gemini/conversations.json` | Gemini JSON |
| `claude/*.json` | Per-conversation Claude JSON |
| `markdown/*.md` | Markdown files |

## Requirements

- Node.js 18+
- `unzip` command (only when passing a `.zip` file)
