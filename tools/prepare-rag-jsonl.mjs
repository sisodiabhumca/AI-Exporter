#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  ensureDir,
  loadConversations,
  parseArgs,
  resolveInput,
} from "./lib/export-loader.mjs";
import { buildJsonlRecords } from "./lib/rag.mjs";

function parseRagArgs(argv) {
  const base = parseArgs(argv);
  const args = argv.slice(2);
  const chunkIdx = args.indexOf("--chunk-size");
  const overlapIdx = args.indexOf("--overlap");
  const strategyIdx = args.indexOf("--strategy");
  return {
    ...base,
    chunkSize: chunkIdx >= 0 ? parseInt(args[chunkIdx + 1], 10) : 2000,
    chunkOverlap: overlapIdx >= 0 ? parseInt(args[overlapIdx + 1], 10) : 200,
    chunkStrategy:
      strategyIdx >= 0 ? args[strategyIdx + 1] : "turn-pair",
  };
}

function detectSource(root) {
  const universal = path.join(root, "universal", "conversations.json");
  if (fs.existsSync(universal)) {
    try {
      const data = JSON.parse(fs.readFileSync(universal, "utf8"));
      return data.source || "chatgpt";
    } catch {
      return "chatgpt";
    }
  }
  return "chatgpt";
}

function main() {
  const opts = parseRagArgs(process.argv);

  if (opts.help || !opts.inputArg) {
    console.log(`Usage: node tools/prepare-rag-jsonl.mjs <export.zip|folder> [--out <dir>] [options]

Options:
  --chunk-size <n>   Max characters per chunk (default: 2000)
  --overlap <n>      Character overlap between chunks (default: 200)
  --strategy <s>     turn-pair | message (default: turn-pair)

Output:
  rag-jsonl/chunks.jsonl — one JSON object per line, RAG-ready
`);
    process.exit(opts.help ? 0 : 1);
  }

  const { root, isTemp } = resolveInput(opts.inputArg);
  const outDir = opts.outDir || path.join(process.cwd(), "rag-jsonl");
  ensureDir(outDir);

  const conversations = loadConversations(root);
  const summaries = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    model: c.model || null,
    is_group_chat: false,
    messages: c.messages || [],
  }));

  const source = detectSource(root);
  const jsonl = buildJsonlRecords(summaries, {
    source,
    chunkSize: opts.chunkSize,
    chunkOverlap: opts.chunkOverlap,
    chunkStrategy: opts.chunkStrategy,
  });

  const outFile = path.join(outDir, "chunks.jsonl");
  fs.writeFileSync(outFile, jsonl, "utf8");

  const lineCount = jsonl.trim() ? jsonl.trim().split("\n").length : 0;
  console.log(`Wrote ${lineCount} chunks from ${conversations.length} conversations`);
  console.log(`  ${outFile}`);

  if (isTemp) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main();
