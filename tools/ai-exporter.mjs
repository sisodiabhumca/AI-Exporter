#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const COMMANDS = {
  "claude-import": "prepare-claude-import.mjs",
  "claude-project": "prepare-claude-project.mjs",
  "gemini-import": "prepare-gemini-import.mjs",
  "rag-jsonl": "prepare-rag-jsonl.mjs",
};

function printHelp() {
  console.log(`AI Exporter CLI — transform export packages

Usage:
  node tools/ai-exporter.mjs <command> <export.zip|folder> [options]

Commands:
  claude-import    Prepare Claude import package (Projects + paste + API)
  claude-project   Prepare Claude Project knowledge files only
  gemini-import    Prepare Gemini paste-ready + API package
  rag-jsonl        Generate RAG-ready JSONL chunks from any export

Examples:
  node tools/ai-exporter.mjs rag-jsonl ~/Downloads/chatgpt-export.zip
  node tools/ai-exporter.mjs rag-jsonl export.zip --chunk-size 1500 --out ./rag
  node tools/ai-exporter.mjs claude-import export.zip

Note: Live export from ChatGPT/Claude/Gemini requires the browser extension.
`);
}

const [,, command, ...rest] = process.argv;

if (!command || command === "-h" || command === "--help") {
  printHelp();
  process.exit(command ? 0 : 1);
}

const script = COMMANDS[command];
if (!script) {
  console.error(`Unknown command: ${command}\n`);
  printHelp();
  process.exit(1);
}

const result = spawnSync(process.execPath, [path.join(__dirname, script), ...rest], {
  stdio: "inherit",
  cwd: root,
});

process.exit(result.status ?? 1);
