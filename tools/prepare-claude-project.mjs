#!/usr/bin/env node
/**
 * Prepare a Claude Project upload folder from an AI Exporter export.
 * For the full Claude package (projects + paste + API), use prepare-claude-import.mjs
 */

import fs from "node:fs";
import path from "node:path";
import {
  CHUNK_SIZE,
  chunkText,
  conversationToMarkdown,
  ensureDir,
  loadConversations,
  parseArgs,
  resolveInput,
  sanitize,
  writeJson,
  writeText,
} from "./lib/export-loader.mjs";

function usage() {
  console.log(`Usage: node tools/prepare-claude-project.mjs <export-folder-or-zip> [--out <dir>]`);
}

function customInstructions() {
  return `You have access to exported ChatGPT conversation history uploaded as project knowledge.

When answering:
- Reference prior conversations when relevant to the user's question
- Preserve technical details, code snippets, and decisions from past chats
- If the user asks about something discussed before, search your project knowledge first
- Note when information may be outdated and ask clarifying questions when needed
- Maintain the same tone and context the user had in their original ChatGPT sessions`;
}

function main() {
  const { inputArg, outDir: outArg, help } = parseArgs(process.argv);
  if (help) { usage(); process.exit(inputArg ? 0 : 1); }
  if (!inputArg) { usage(); process.exit(1); }

  const { root } = resolveInput(inputArg);
  const conversations = loadConversations(root);
  const outDir = outArg || path.resolve("claude-project-upload");
  const knowledgeDir = path.join(outDir, "knowledge");
  ensureDir(knowledgeDir);

  const manifestFiles = [];
  for (const conv of conversations) {
    const id = conv.id || "unknown";
    const baseName = sanitize(conv.title);
    const body = conversationToMarkdown(conv);
    const content = [`# ${conv.title}`, "", `Source: ChatGPT`, `Prepared: ${new Date().toISOString()}`, "", "---", "", body].join("\n");
    const chunks = chunkText(content, CHUNK_SIZE);
    chunks.forEach((chunk, index) => {
      const filename = chunks.length === 1 ? `${baseName}_${String(id).slice(0, 8)}.md` : `${baseName}_${String(id).slice(0, 8)}_part${index + 1}.md`;
      writeText(path.join(knowledgeDir, filename), chunks.length === 1 ? chunk : `# ${conv.title} (part ${index + 1}/${chunks.length})\n\n${chunk}`);
      manifestFiles.push({ filename, title: conv.title });
    });
  }

  writeJson(path.join(outDir, "manifest.json"), { schema: "claude-project-manifest", version: "1.0", files: manifestFiles });
  writeText(path.join(outDir, "custom-instructions.txt"), customInstructions());
  writeText(path.join(outDir, "PROJECT_SETUP.md"), `# Claude Project Upload\n\nUpload all files from knowledge/ to Claude Project knowledge.\n`);
  console.log(`Done! ${manifestFiles.length} file(s) in ${outDir}`);
}

main();
