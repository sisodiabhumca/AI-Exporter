#!/usr/bin/env node
/**
 * Prepare a complete Claude import package from an AI Exporter export.
 *
 * Usage:
 *   node tools/prepare-claude-import.mjs <export-folder-or-zip> [--out <dir>]
 *
 * Output: claude-import/ with Projects, paste-ready, and API formats.
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
  console.log(`Usage: node tools/prepare-claude-import.mjs <export-folder-or-zip> [--out <dir>]

Creates a complete Claude import package:
  projects/knowledge/   Upload to Claude Projects
  paste-ready/          Copy-paste into new Claude chats
  api/                  JSON for Claude API / Claude Code
  custom-instructions.txt
  CLAUDE_SETUP.md
  manifest.json`);
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

function pasteReadyContent(conv) {
  const lines = [
    `Below is a prior ChatGPT conversation titled "${conv.title}".`,
    "Use it as context for our discussion.",
    "",
    "---",
    "",
    conversationToMarkdown(conv),
  ];
  return lines.join("\n");
}

function setupGuide(count) {
  return `# Claude Import Guide

Prepared ${count} conversation${count === 1 ? "" : "s"} for Claude.

## Option 1 — Claude Projects (best for ongoing use)

1. Go to [claude.ai](https://claude.ai) → **Projects** → **New Project**
2. Upload all files from \`projects/knowledge/\`
3. Paste \`custom-instructions.txt\` into **Project instructions**
4. Start chatting — Claude references your ChatGPT history

## Option 2 — Copy-paste (quick, one chat at a time)

1. Open any file in \`paste-ready/\`
2. Copy the full contents
3. Start a new Claude chat and paste as your first message
4. Add: "Please continue from this context."

## Option 3 — Claude API / Claude Code

Use JSON files in \`api/\` — each file has:

\`\`\`json
{
  "title": "Conversation title",
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
\`\`\`

## Folder reference

| Folder | Purpose |
|--------|---------|
| \`projects/knowledge/\` | Upload to Claude Project knowledge |
| \`paste-ready/\` | One file per chat, ready to paste |
| \`api/\` | Programmatic / API use |
| \`manifest.json\` | Index of all conversations |

## Tips

- Upload knowledge files in batches of ~20 if you hit limits
- Review content before uploading — remove sensitive data
- Long chats may be split into \`_part2.md\` files automatically
`;
}

function main() {
  const { inputArg, outDir: outArg, help } = parseArgs(process.argv);
  if (help) {
    usage();
    process.exit(inputArg ? 0 : 1);
  }

  if (!inputArg) {
    usage();
    process.exit(1);
  }

  const { root } = resolveInput(inputArg);
  const conversations = loadConversations(root);
  const outDir = outArg || path.resolve("claude-import");

  if (!conversations.length) {
    console.error("No conversations found.");
    process.exit(1);
  }

  const knowledgeDir = path.join(outDir, "projects", "knowledge");
  const pasteDir = path.join(outDir, "paste-ready");
  const apiDir = path.join(outDir, "api");
  ensureDir(knowledgeDir);
  ensureDir(pasteDir);
  ensureDir(apiDir);

  const manifestFiles = [];

  for (const conv of conversations) {
    const id = conv.id || "unknown";
    const baseName = sanitize(conv.title);
    const shortId = String(id).slice(0, 8);
    const body = conversationToMarkdown(conv);

    const knowledgeHeader = [
      `# ${conv.title}`,
      "",
      "Source: ChatGPT (prepared for Claude Projects)",
      `Prepared: ${new Date().toISOString()}`,
      conv.created_at ? `Created: ${conv.created_at}` : "",
      "",
      "---",
      "",
      body,
    ]
      .filter(Boolean)
      .join("\n");

    const chunks = chunkText(knowledgeHeader, CHUNK_SIZE);
    chunks.forEach((chunk, index) => {
      const filename =
        chunks.length === 1
          ? `${baseName}_${shortId}.md`
          : `${baseName}_${shortId}_part${index + 1}.md`;
      const content =
        chunks.length === 1
          ? chunk
          : `# ${conv.title} (part ${index + 1}/${chunks.length})\n\n${chunk}`;
      writeText(path.join(knowledgeDir, filename), content);
      manifestFiles.push({
        filename,
        title: conv.title,
        type: "project-knowledge",
        part: chunks.length > 1 ? `${index + 1}/${chunks.length}` : null,
      });
    });

    writeText(
      path.join(pasteDir, `${baseName}_${shortId}.md`),
      pasteReadyContent(conv)
    );

    writeJson(path.join(apiDir, `${baseName}_${shortId}.json`), {
      title: conv.title,
      created_at: conv.created_at,
      messages: conv.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content })),
    });
  }

  writeJson(path.join(outDir, "manifest.json"), {
    schema: "claude-import-manifest",
    version: "1.0",
    conversation_count: conversations.length,
    files: manifestFiles,
  });

  writeText(path.join(outDir, "custom-instructions.txt"), customInstructions());
  writeText(path.join(outDir, "CLAUDE_SETUP.md"), setupGuide(conversations.length));

  console.log(`Done! Claude import package ready:`);
  console.log(`  ${outDir}`);
  console.log(`  ${manifestFiles.length} knowledge file(s), ${conversations.length} paste-ready, ${conversations.length} API JSON`);
}

main();
