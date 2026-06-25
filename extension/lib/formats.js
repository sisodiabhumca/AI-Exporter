/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.formats = {
  universal(conversations, meta = {}) {
    return {
      version: "1.0",
      schema: "ai-exporter-universal",
      source: "chatgpt",
      exported_at: new Date().toISOString(),
      exporter_version: meta.exporterVersion || "1.0.0",
      account_id: meta.accountId || null,
      conversation_count: conversations.length,
      conversations: conversations.map((c) =>
        AIExporter.parser.toConversationSummary(c)
      ),
    };
  },

  openai(conversations) {
    return {
      object: "chatgpt.export",
      data: conversations.map((convo) => {
        const summary = AIExporter.parser.toConversationSummary(convo);
        return {
          id: summary.id,
          title: summary.title,
          created_at: summary.created_at,
          messages: summary.messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              role: m.role,
              content: m.content,
            })),
        };
      }),
    };
  },

  claude(conversations) {
    return conversations.map((convo) => {
      const summary = AIExporter.parser.toConversationSummary(convo);
      return {
        title: summary.title,
        created_at: summary.created_at,
        messages: summary.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
      };
    });
  },

  gemini(conversations) {
    return {
      export_format: "gemini-import",
      conversations: conversations.map((convo) => {
        const summary = AIExporter.parser.toConversationSummary(convo);
        return {
          title: summary.title,
          turns: summary.messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
        };
      }),
    };
  },

  markdown(convo, fileMap = {}) {
    const title = convo.title || "Untitled";
    const dateStr = AIExporter.utils.formatDateForDisplay(convo.create_time);
    const lines = [`# ${title}`, ""];

    if (dateStr) lines.push(`*${dateStr}*`, "");
    lines.push(
      "> Exported from ChatGPT via AI Exporter",
      "> Portable format — paste into Claude, Gemini, or any AI chat",
      ""
    );

    const messages = AIExporter.parser.extractMessages(convo);
    for (const msg of messages) {
      const roleLabel =
        msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
      const parts = [msg.content];

      for (const img of msg.images) {
        if (fileMap[img.fileId]) {
          parts.push(`![image](${fileMap[img.fileId]})`);
        } else {
          parts.push("[image]");
        }
      }

      for (const att of msg.attachments) {
        if (fileMap[att.fileId]) {
          parts.push(`\n📎 [${att.name}](${fileMap[att.fileId]})`);
        }
      }

      const text = parts.filter(Boolean).join("\n").trim();
      if (text) {
        lines.push(`## ${roleLabel}`, "", text, "");
      }
    }

    return lines.join("\n");
  },

  geminiImportPasteReady(convo) {
    const summary = AIExporter.parser.toConversationSummary(convo);
    const lines = [
      "I'm sharing a previous ChatGPT conversation for context.",
      `Title: ${summary.title}`,
      "",
      "Please use this history to continue helping me.",
      "",
      "---",
      "",
    ];
    for (const msg of summary.messages) {
      if (msg.role !== "user" && msg.role !== "assistant") continue;
      const label = msg.role === "user" ? "User" : "Assistant";
      lines.push(`## ${label}`, "", msg.content, "");
    }
    return lines.join("\n");
  },

  geminiImportContextPrompt(convo) {
    const summary = AIExporter.parser.toConversationSummary(convo);
    const topics = summary.messages
      .filter((m) => m.role === "user")
      .slice(0, 3)
      .map((m) => m.content.slice(0, 100))
      .join(" | ");

    const lines = [
      "You are helping me continue work from a prior ChatGPT conversation.",
      "",
      `Conversation: "${summary.title}"`,
      summary.created_at ? `Originally started: ${summary.created_at}` : "",
      `Topics covered: ${topics || "See full history below"}`,
      "",
      "Full conversation history:",
      "",
    ];
    for (const msg of summary.messages) {
      if (msg.role !== "user" && msg.role !== "assistant") continue;
      const label = msg.role === "user" ? "User" : "Assistant";
      lines.push(`## ${label}`, "", msg.content, "");
    }
    lines.push(
      "",
      "---",
      "Based on this history, help me pick up where we left off."
    );
    return lines.join("\n");
  },

  geminiImportFiles(convo) {
    const summary = AIExporter.parser.toConversationSummary(convo);
    const id = summary.id || convo.conversation_id || convo.id || "unknown";
    const baseName = AIExporter.utils.sanitizeFilename(summary.title);
    const shortId = id.slice(0, 8);
    const files = [];

    files.push({
      path: `paste-ready/${baseName}_${shortId}.txt`,
      content: this.geminiImportPasteReady(convo),
    });

    const prompt = this.geminiImportContextPrompt(convo);
    const chunks = this.chunkText(prompt, 30000);
    chunks.forEach((chunk, index) => {
      files.push({
        path:
          chunks.length === 1
            ? `context-prompts/${baseName}_${shortId}.txt`
            : `context-prompts/${baseName}_${shortId}_part${index + 1}.txt`,
        content: chunk,
      });
    });

    const turns = summary.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    files.push({
      path: `api/${baseName}_${shortId}.json`,
      content: JSON.stringify({ title: summary.title, turns }, null, 2),
    });

    return files;
  },

  geminiImportManifest(conversations) {
    return {
      schema: "gemini-import-manifest",
      version: "1.0",
      conversation_count: conversations.length,
      files: conversations.map((convo) => {
        const summary = AIExporter.parser.toConversationSummary(convo);
        const id = summary.id || "unknown";
        const baseName = AIExporter.utils.sanitizeFilename(summary.title);
        return {
          title: summary.title,
          paste_file: `paste-ready/${baseName}_${id.slice(0, 8)}.txt`,
          api_file: `api/${baseName}_${id.slice(0, 8)}.json`,
        };
      }),
    };
  },

  geminiImportSetup(count) {
    return `# Gemini Import Guide

This folder contains ${count} conversation${count === 1 ? "" : "s"} prepared for Google Gemini.

## Quick setup

1. Go to [gemini.google.com](https://gemini.google.com)
2. Open any file in \`paste-ready/\`
3. Copy and paste into a new Gemini chat
4. Gemini uses your ChatGPT history as context

## What's included

| Folder | Purpose |
|--------|---------|
| \`paste-ready/\` | Simple copy-paste files |
| \`context-prompts/\` | Prompts with instructions + full history |
| \`api/\` | Gemini API-compatible JSON per conversation |
| \`api/conversations.json\` | All conversations combined |

## Gemini API

Use \`api/conversations.json\` or individual files with the Google AI SDK.
Turns use \`user\` / \`model\` roles with \`parts: [{ text: "..." }]\`.

## Import helper

Rebuild this folder from any export:

\`\`\`bash
node tools/prepare-gemini-import.mjs path/to/chatgpt-export.zip
\`\`\`
`;
  },

  claudeProjectKnowledge(convo, fileMap = {}) {
    const summary = AIExporter.parser.toConversationSummary(convo);
    const lines = [
      `# ${summary.title}`,
      "",
      `Source: ChatGPT conversation`,
      `Exported: ${new Date().toISOString()}`,
    ];
    if (summary.created_at) lines.push(`Created: ${summary.created_at}`);
    lines.push("", "---", "");

    for (const msg of summary.messages) {
      if (msg.role !== "user" && msg.role !== "assistant") continue;
      const label = msg.role === "user" ? "User" : "Assistant";
      lines.push(`## ${label}`, "", msg.content, "");
      for (const img of msg.images) {
        if (fileMap[img.fileId]) {
          lines.push(`[Image: ${fileMap[img.fileId]}]`, "");
        }
      }
      for (const att of msg.attachments) {
        if (fileMap[att.fileId]) {
          lines.push(`[Attachment: ${att.name} — ${fileMap[att.fileId]}]`, "");
        }
      }
    }

    return lines.join("\n");
  },

  claudeProjectFiles(convo, fileMap = {}) {
    const summary = AIExporter.parser.toConversationSummary(convo);
    const id = summary.id || convo.conversation_id || convo.id || "unknown";
    const baseName = AIExporter.utils.sanitizeFilename(summary.title);
    const filename = `${baseName}_${id.slice(0, 8)}.md`;
    const content = this.claudeProjectKnowledge(convo, fileMap);
    const chunks = this.chunkText(content, 28000);

    if (chunks.length <= 1) {
      return [{ filename, content }];
    }

    return chunks.map((chunk, index) => ({
      filename: `${baseName}_${id.slice(0, 8)}_part${index + 1}.md`,
      content: `# ${summary.title} (part ${index + 1}/${chunks.length})\n\n${chunk}`,
    }));
  },

  chunkText(text, maxChars) {
    if (text.length <= maxChars) return [text];

    const chunks = [];
    const sections = text.split(/\n(?=## )/);
    let current = "";

    for (const section of sections) {
      if ((current + section).length > maxChars && current) {
        chunks.push(current.trim());
        current = section;
      } else {
        current += (current ? "\n" : "") + section;
      }
    }

    if (current.trim()) chunks.push(current.trim());

    if (chunks.length <= 1 && text.length > maxChars) {
      for (let i = 0; i < text.length; i += maxChars) {
        chunks.push(text.slice(i, i + maxChars));
      }
    }

    return chunks;
  },

  claudeProjectManifest(conversations) {
    const files = [];
    for (const convo of conversations) {
      const summary = AIExporter.parser.toConversationSummary(convo);
      const id = summary.id || "unknown";
      const baseName = AIExporter.utils.sanitizeFilename(summary.title);
      const content = this.claudeProjectKnowledge(convo);
      const chunks = this.chunkText(content, 28000);
      const chunkCount = chunks.length;

      for (let i = 0; i < chunkCount; i += 1) {
        files.push({
          filename:
            chunkCount === 1
              ? `${baseName}_${id.slice(0, 8)}.md`
              : `${baseName}_${id.slice(0, 8)}_part${i + 1}.md`,
          title: summary.title,
          created_at: summary.created_at,
          message_count: summary.message_count,
          approx_chars: chunks[i].length,
          part: chunkCount > 1 ? `${i + 1}/${chunkCount}` : null,
        });
      }
    }

    return {
      schema: "claude-project-manifest",
      version: "1.0",
      conversation_count: conversations.length,
      file_count: files.length,
      files,
    };
  },

  claudeProjectInstructions() {
    return `You have access to exported ChatGPT conversation history uploaded as project knowledge.

When answering:
- Reference prior conversations when relevant to the user's question
- Preserve technical details, code snippets, and decisions from past chats
- If the user asks about something discussed before, search your project knowledge first
- Note when information may be outdated and ask clarifying questions when needed
- Maintain the same tone and context the user had in their original ChatGPT sessions`;
  },

  claudeProjectSetup(count) {
    return `# Claude Project Setup Guide

This folder contains ${count} conversation${count === 1 ? "" : "s"} prepared for Claude Projects.

## Quick setup (5 minutes)

1. Go to [claude.ai](https://claude.ai) and create a **New Project**
2. Name it (e.g. "ChatGPT History")
3. Open **Project knowledge** → **Upload files**
4. Upload all files from the \`knowledge/\` folder
5. Open **Project instructions** and paste the contents of \`custom-instructions.txt\`
6. Start chatting — Claude can now reference your ChatGPT history

## What's included

| File | Purpose |
|------|---------|
| \`knowledge/*.md\` | One markdown file per conversation (chunked if very long) |
| \`custom-instructions.txt\` | Suggested project instructions — paste into Claude |
| \`manifest.json\` | Index of all knowledge files with titles and metadata |

## Tips

- **Large histories:** Upload in batches of 20–30 files if Claude limits uploads
- **Long conversations:** Files ending in \`_part2.md\` etc. are auto-chunks of one chat
- **Privacy:** Review files before uploading — remove anything sensitive
- **Updates:** Re-export from ChatGPT and upload only new \`knowledge/\` files

## Alternative: run the import helper

From your exported ZIP, run the Node helper to rebuild this folder:

\`\`\`bash
node tools/prepare-claude-project.mjs path/to/chatgpt-export.zip
\`\`\`

See \`tools/README.md\` for details.
`;
  },

  importGuide() {
    return `# AI Exporter — Import Guide

Your ChatGPT conversations have been exported in multiple formats. Here's how to use them with other AI products.

## Folder structure

- \`universal/conversations.json\` — Best all-purpose format (recommended)
- \`openai/conversations.json\` — OpenAI-style messages array
- \`claude/\` — One JSON file per conversation, Claude-friendly
- \`claude-project/\` — Ready-to-upload Claude Project knowledge files
- \`gemini-import/\` — Paste-ready and API files for Google Gemini
- \`gemini/conversations.json\` — Gemini-style turns format (combined)
- \`markdown/\` — Human-readable .md files (great for copy-paste)
- \`raw/\` — Original ChatGPT API JSON (complete data)
- \`files/\` — Downloaded images and attachments (if enabled)

## Claude (claude.ai)

**Option A — Copy-paste (easiest)**
1. Open any file in \`markdown/\`
2. Copy the conversation text
3. Start a new Claude chat and paste with: "Here's context from a previous conversation:"

**Option B — Projects (recommended for history)**
1. Create a Claude Project at claude.ai
2. Upload all files from \`claude-project/knowledge/\`
3. Paste \`claude-project/custom-instructions.txt\` into Project instructions
4. See \`claude-project/PROJECT_SETUP.md\` for full walkthrough

**Option C — API / Claude Code**
Use files in \`claude/\` — each JSON has \`title\` and \`messages\` arrays.

**Import helper:** \`node tools/prepare-claude-import.mjs your-export.zip\`

## Google Gemini

**Option A — Copy-paste (easiest)**
1. Open any file in \`gemini-import/paste-ready/\`
2. Copy and paste into a new chat at gemini.google.com

**Option B — Context prompts**
Use files in \`gemini-import/context-prompts/\` for long conversations with framing instructions.

**Option C — Gemini API**
Use \`gemini-import/api/conversations.json\` with the Google AI SDK.

**Import helper:** \`node tools/prepare-gemini-import.mjs your-export.zip\`

## OpenAI API / Custom GPTs

Use \`openai/conversations.json\` — each entry has a standard \`messages\` array with \`role\` and \`content\`.

## Universal format (any tool)

\`universal/conversations.json\` is designed for portability:

\`\`\`json
{
  "conversations": [{
    "title": "My chat",
    "messages": [
      { "role": "user", "content": "...", "timestamp": "..." },
      { "role": "assistant", "content": "..." }
    ]
  }]
}
\`\`\`

Most AI tools accept this structure for context injection, RAG pipelines, or fine-tuning prep.

## Tips

- For large histories, import one conversation at a time rather than dumping everything
- Markdown files preserve code blocks and formatting best for copy-paste
- Raw JSON retains full ChatGPT metadata if you need to re-process later
`;
  },
};
