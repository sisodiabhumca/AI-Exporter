#!/usr/bin/env node
/**
 * Prepare a Gemini import package from an AI Exporter export.
 *
 * Usage:
 *   node tools/prepare-gemini-import.mjs <export-folder-or-zip> [--out <dir>]
 *
 * Output: gemini-import/ with API JSON, paste-ready text, and setup guide.
 */

import fs from "node:fs";
import path from "node:path";
import {
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
  console.log(`Usage: node tools/prepare-gemini-import.mjs <export-folder-or-zip> [--out <dir>]

Creates a Gemini import package:
  api/conversations.json    Gemini API-compatible turns format
  paste-ready/              Copy-paste into Gemini chats
  context-prompts/          Starter prompts with embedded history
  GEMINI_SETUP.md
  manifest.json`);
}

function toGeminiTurns(conv) {
  return conv.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content || "" }],
    }));
}

function pasteReadyContent(conv) {
  const lines = [
    "I'm sharing a previous ChatGPT conversation for context.",
    `Title: ${conv.title}`,
    "",
    "Please use this history to continue helping me.",
    "",
    "---",
    "",
    conversationToMarkdown(conv),
  ];
  return lines.join("\n");
}

function contextPrompt(conv) {
  const summary = conv.messages
    .filter((m) => m.role === "user")
    .slice(0, 3)
    .map((m) => m.content.slice(0, 120))
    .join(" | ");

  return `You are helping me continue work from a prior ChatGPT conversation.

Conversation: "${conv.title}"
${conv.created_at ? `Originally started: ${conv.created_at}` : ""}
Topics covered: ${summary || "See full history below"}

Full conversation history:

${conversationToMarkdown(conv)}

---
Based on this history, help me pick up where we left off. Ask what I'd like to work on next.`;
}

function setupGuide(count) {
  return `# Gemini Import Guide

Prepared ${count} conversation${count === 1 ? "" : "s"} for Google Gemini.

## Option 1 — Copy-paste into Gemini (easiest)

1. Go to [gemini.google.com](https://gemini.google.com)
2. Open any file in \`paste-ready/\`
3. Copy the full contents and paste into a new Gemini chat
4. Gemini will use the ChatGPT history as context

## Option 2 — Context prompts (recommended for long chats)

Files in \`context-prompts/\` include a starter instruction plus full history.
Paste the entire file — it's formatted to help Gemini understand the context.

## Option 3 — Gemini API

Use \`api/conversations.json\` with the Google AI SDK:

\`\`\`javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Load a conversation's turns from the export
const conv = conversations[0];
const chat = model.startChat({ history: conv.turns.slice(0, -1) });
const result = await chat.sendMessage(conv.turns.at(-1).parts[0].text);
\`\`\`

Turn format:

\`\`\`json
{
  "role": "user",
  "parts": [{ "text": "Hello" }]
}
\`\`\`

Use \`"model"\` instead of \`"assistant"\` for Gemini responses.

## Option 4 — Google AI Studio

1. Open [aistudio.google.com](https://aistudio.google.com)
2. Create a new chat
3. Paste content from \`paste-ready/\` or \`context-prompts/\`
4. Save as a tuned prompt if you reuse it often

## Folder reference

| Folder / File | Purpose |
|---------------|---------|
| \`api/conversations.json\` | All conversations in Gemini API format |
| \`api/*.json\` | Individual conversation API files |
| \`paste-ready/\` | Simple copy-paste files |
| \`context-prompts/\` | Prompts with instructions + history |
| \`manifest.json\` | Index of all conversations |

## Tips

- Gemini works best with one conversation per chat session
- For very long chats, use \`context-prompts/\` — they include framing instructions
- Review content before pasting — remove anything sensitive
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
  const outDir = outArg || path.resolve("gemini-import");

  if (!conversations.length) {
    console.error("No conversations found.");
    process.exit(1);
  }

  const pasteDir = path.join(outDir, "paste-ready");
  const promptDir = path.join(outDir, "context-prompts");
  const apiDir = path.join(outDir, "api");
  ensureDir(pasteDir);
  ensureDir(promptDir);
  ensureDir(apiDir);

  const geminiConversations = [];
  const manifestFiles = [];

  for (const conv of conversations) {
    const id = conv.id || "unknown";
    const baseName = sanitize(conv.title);
    const shortId = String(id).slice(0, 8);
    const turns = toGeminiTurns(conv);

    geminiConversations.push({ title: conv.title, turns });

    writeText(path.join(pasteDir, `${baseName}_${shortId}.txt`), pasteReadyContent(conv));

    const prompt = contextPrompt(conv);
    const promptChunks = chunkText(prompt, 30000);
    promptChunks.forEach((chunk, index) => {
      const filename =
        promptChunks.length === 1
          ? `${baseName}_${shortId}.txt`
          : `${baseName}_${shortId}_part${index + 1}.txt`;
      writeText(path.join(promptDir, filename), chunk);
    });

    writeJson(path.join(apiDir, `${baseName}_${shortId}.json`), {
      title: conv.title,
      turns,
    });

    manifestFiles.push({
      title: conv.title,
      paste_file: `${baseName}_${shortId}.txt`,
      api_file: `${baseName}_${shortId}.json`,
      turn_count: turns.length,
    });
  }

  writeJson(path.join(apiDir, "conversations.json"), {
    export_format: "gemini-import",
    version: "1.0",
    conversation_count: conversations.length,
    conversations: geminiConversations,
  });

  writeJson(path.join(outDir, "manifest.json"), {
    schema: "gemini-import-manifest",
    version: "1.0",
    conversation_count: conversations.length,
    files: manifestFiles,
  });

  writeText(path.join(outDir, "GEMINI_SETUP.md"), setupGuide(conversations.length));

  console.log(`Done! Gemini import package ready:`);
  console.log(`  ${outDir}`);
  console.log(`  ${conversations.length} conversation(s) in paste-ready, context-prompts, and api/`);
}

main();
