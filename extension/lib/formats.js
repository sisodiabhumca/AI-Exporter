/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.formats = {
  universal(conversations, meta = {}) {
    return {
      version: "1.1",
      schema: "ai-exporter-universal",
      source: meta.source || AIExporter.platform?.id || "chatgpt",
      exported_at: new Date().toISOString(),
      exporter_version: meta.exporterVersion || "1.7.0",
      account_id: meta.accountId || null,
      conversation_count: conversations.length,
      conversations: conversations.map((c) =>
        AIExporter.platform.parser.toConversationSummary(c)
      ),
    };
  },

  openai(conversations) {
    return {
      object: "chatgpt.export",
      data: conversations.map((convo) => {
        const summary = AIExporter.platform.parser.toConversationSummary(convo);
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
      const summary = AIExporter.platform.parser.toConversationSummary(convo);
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
        const summary = AIExporter.platform.parser.toConversationSummary(convo);
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

  messagesToMarkdown(summary, fileMap = {}, options = {}) {
    const lines = [];
    const includeTimestamps = options.includeTimestamps !== false;

    for (const msg of summary.messages) {
      let roleLabel = AIExporter.utils.getSpeakerLabel(msg);
      if (includeTimestamps && msg.timestamp) {
        roleLabel += ` — ${msg.timestamp}`;
      }

      const parts = [msg.content];
      for (const img of msg.images || []) {
        parts.push(
          fileMap[img.fileId]
            ? `![image](${fileMap[img.fileId]})`
            : "[image]"
        );
      }
      for (const att of msg.attachments || []) {
        if (fileMap[att.fileId]) {
          parts.push(`\n📎 [${att.name}](${fileMap[att.fileId]})`);
        }
      }

      const text = parts.filter(Boolean).join("\n").trim();
      if (text) lines.push(`## ${roleLabel}`, "", text, "");
    }
    return lines.join("\n");
  },

  markdown(convo, fileMap = {}, options = {}) {
    const summary = AIExporter.platform.parser.toConversationSummary(convo, options);
    const dateStr = AIExporter.utils.formatDateForDisplay(convo.create_time);
    const lines = [`# ${summary.title}`, ""];

    if (dateStr) lines.push(`*${dateStr}*`, "");
    lines.push(
      "> Exported from ChatGPT via AI Exporter",
      "> Portable format — paste into Claude, Gemini, or any AI chat",
      ""
    );
    lines.push(this.messagesToMarkdown(summary, fileMap, options));
    return lines.join("\n");
  },

  csvEscape(value) {
    const str = String(value ?? "").replace(/"/g, '""');
    return `"${str}"`;
  },

  csvRowsForSummary(summary) {
    const rows = [
      ["conversation_id", "title", "message_id", "role", "author", "timestamp", "content"].join(
        ","
      ),
    ];
    for (const msg of summary.messages) {
      rows.push(
        [
          this.csvEscape(summary.id),
          this.csvEscape(summary.title),
          this.csvEscape(msg.id),
          this.csvEscape(msg.role),
          this.csvEscape(msg.authorName || ""),
          this.csvEscape(msg.timestamp || ""),
          this.csvEscape(msg.content),
        ].join(",")
      );
    }
    return rows.join("\n");
  },

  csv(conversations) {
    return conversations
      .map((c) => this.csvRowsForSummary(AIExporter.platform.parser.toConversationSummary(c)))
      .join("\n\n");
  },

  html(convo, fileMap = {}, options = {}) {
    const summary = AIExporter.platform.parser.toConversationSummary(convo, options);
    const dateStr = AIExporter.utils.formatDateForDisplay(convo.create_time);
    const includeTimestamps = options.includeTimestamps !== false;
    const includeToc = options.includeToc === true;

    const messagesHtml = summary.messages
      .map((msg, i) => {
        let roleLabel = msg.role === "user" ? "You" : "Assistant";
        if (msg.authorName) roleLabel = msg.authorName;
        const timeHtml =
          includeTimestamps && msg.timestamp
            ? `<time class="msg-time">${AIExporter.utils.escapeHtml(msg.timestamp)}</time>`
            : "";
        let body = AIExporter.utils.escapeHtml(msg.content).replace(/\n/g, "<br>");
        body = body
          .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
            return `<pre class="code-block" data-lang="${lang}"><code>${AIExporter.utils.escapeHtml(code.trim())}</code></pre>`;
          })
          .replace(/&lt;details&gt;/g, "<details>")
          .replace(/&lt;\/details&gt;/g, "</details>")
          .replace(/&lt;summary&gt;([\s\S]*?)&lt;\/summary&gt;/g, "<summary>$1</summary>");

        for (const img of msg.images || []) {
          if (fileMap[img.fileId]) {
            body += `<img src="${fileMap[img.fileId]}" alt="image" class="msg-image"/>`;
          }
        }

        const anchor = includeToc ? ` id="msg-${i}"` : "";
        return `<article${anchor} class="message message-${msg.role}">
          <header><strong>${AIExporter.utils.escapeHtml(roleLabel)}</strong>${timeHtml}</header>
          <div class="msg-body">${body}</div>
        </article>`;
      })
      .join("\n");

    let tocHtml = "";
    if (includeToc && summary.messages.length > 1) {
      const items = summary.messages
        .map((msg, i) => {
          const preview = (msg.content || "").replace(/\s+/g, " ").slice(0, 60);
          const label = msg.role === "user" ? "You" : "Assistant";
          return `<li><a href="#msg-${i}">${AIExporter.utils.escapeHtml(label)}: ${AIExporter.utils.escapeHtml(preview)}…</a></li>`;
        })
        .join("\n");
      tocHtml = `<nav class="toc"><h2>Contents</h2><ol>${items}</ol></nav>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${AIExporter.utils.escapeHtml(summary.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 32px 24px; color: #0d0d0d; line-height: 1.6; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .meta { color: #666; font-size: 0.875rem; margin-bottom: 2rem; }
  .toc { background: #f5f5f5; padding: 1rem 1.25rem; border-radius: 8px; margin-bottom: 2rem; }
  .toc ol { margin: 0.5rem 0 0 1.25rem; padding: 0; }
  .toc a { color: #1a7f64; text-decoration: none; }
  .message { margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #eee; }
  .message-user { background: #f7f7f8; padding: 1rem; border-radius: 12px; border: none; }
  .msg-time { display: block; font-size: 0.75rem; color: #888; font-weight: normal; margin-top: 2px; }
  pre.code-block { background: #1e1e1e; color: #f8f8f2; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.85rem; }
  .msg-image { max-width: 100%; border-radius: 8px; margin-top: 0.5rem; }
  details { background: #f9f9f9; padding: 0.75rem; border-radius: 8px; margin-top: 0.5rem; }
  summary { cursor: pointer; font-style: italic; color: #666; }
  @media print {
    body { padding: 0; max-width: none; }
    .message { page-break-inside: avoid; }
    .no-print { display: none; }
    .toc a { color: #000; }
  }
</style>
</head>
<body>
  <p class="no-print" style="background:#e8f5f0;padding:12px;border-radius:8px;font-size:14px;">
    <strong>Save as PDF:</strong> Press <kbd>Ctrl+P</kbd> (or <kbd>⌘+P</kbd>) → choose "Save as PDF". 100% local — no upload.
  </p>
  <h1>${AIExporter.utils.escapeHtml(summary.title)}</h1>
  <p class="meta">${dateStr ? AIExporter.utils.escapeHtml(dateStr) + " · " : ""}Exported via AI Exporter</p>
  ${tocHtml}
  ${messagesHtml}
</body>
</html>`;
  },

  notion(convo, fileMap = {}, options = {}) {
    const summary = AIExporter.platform.parser.toConversationSummary(convo, options);
    const lines = [`# ${summary.title}`, ""];

    if (summary.is_group_chat) {
      lines.push(
        `> 👥 Group conversation · Participants: ${summary.participants.join(", ")}`,
        ""
      );
    }

    lines.push(
      "> Exported from ChatGPT via AI Exporter",
      "> Import: paste into a Notion page or use Notion import",
      ""
    );

    for (const msg of summary.messages) {
      const speaker = AIExporter.utils.getSpeakerLabel(msg);
      const time = options.includeTimestamps !== false && msg.timestamp
        ? ` · ${msg.timestamp}`
        : "";
      lines.push(`### ${speaker}${time}`, "");
      lines.push(msg.content, "");
      if (msg.images?.length) {
        for (const img of msg.images) {
          lines.push(fileMap[img.fileId] ? `🖼 ${fileMap[img.fileId]}` : "🖼 [image]", "");
        }
      }
      lines.push("---", "");
    }
    return lines.join("\n");
  },

  obsidian(convo, fileMap = {}, options = {}) {
    const summary = AIExporter.platform.parser.toConversationSummary(convo, options);
    const safeTitle = summary.title.replace(/"/g, '\\"');
    const tags = summary.is_group_chat
      ? "ai-export, chatgpt, group-chat"
      : "ai-export, chatgpt";

    const lines = [
      "---",
      `title: "${safeTitle}"`,
      `date: ${summary.created_at || new Date().toISOString()}`,
      "source: chatgpt",
      `tags: [${tags}]`,
      "---",
      "",
      `# ${summary.title}`,
      "",
    ];

    if (summary.is_group_chat) {
      lines.push(
        `> [!info] Group chat`,
        `> Participants: ${summary.participants.join(", ")}`,
        ""
      );
    }

    for (const msg of summary.messages) {
      const speaker = AIExporter.utils.getSpeakerLabel(msg);
      const callout = msg.role === "user" ? "note" : "tip";
      lines.push(`> [!${callout}] ${speaker}`, "");

      for (const line of msg.content.split("\n")) {
        lines.push(`> ${line}`);
      }
      lines.push("", "");
    }
    return lines.join("\n");
  },

  htmlBundle(entries) {
    const sidebarItems = entries
      .map(
        (e, i) =>
          `<a href="#chat-${i}" class="sidebar-link" data-idx="${i}">${AIExporter.utils.escapeHtml(e.title)}</a>`
      )
      .join("\n");

    const sections = entries
      .map((e, i) => {
        const body = e.html.replace(/<\/?html[^>]*>|<\/?head[^>]*>|<\/?body[^>]*>/gi, "");
        return `<section id="chat-${i}" class="chat-section" ${i > 0 ? 'style="display:none"' : ""}>
          <div class="section-inner">${body}</div>
        </section>`;
      })
      .join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>ChatGPT Export — AI Exporter</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; height: 100vh; color: #0d0d0d; }
  .sidebar { width: 280px; min-width: 280px; background: #f9f9f9; border-right: 1px solid #e5e5e5; overflow-y: auto; padding: 16px 0; }
  .sidebar h2 { font-size: 14px; padding: 0 16px 12px; color: #666; font-weight: 600; }
  .sidebar-link { display: block; padding: 8px 16px; font-size: 13px; color: #0d0d0d; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sidebar-link:hover { background: #ececec; }
  .sidebar-link.active { background: #e8f5f0; font-weight: 600; }
  .main { flex: 1; overflow-y: auto; padding: 24px; }
  .chat-section .section-inner { max-width: 800px; margin: 0 auto; }
  .no-print { background: #e8f5f0; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
  @media print { .sidebar, .no-print { display: none; } .main { padding: 0; } .chat-section { display: block !important; page-break-before: always; } }
</style>
</head>
<body>
  <nav class="sidebar">
    <h2>${entries.length} Conversations</h2>
    ${sidebarItems}
  </nav>
  <main class="main">
    <p class="no-print"><strong>Save as PDF:</strong> Ctrl+P / ⌘+P → Save as PDF. Click a chat in the sidebar to browse.</p>
    ${sections}
  </main>
  <script>
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const idx = link.dataset.idx;
        document.querySelectorAll('.chat-section').forEach(s => s.style.display = 'none');
        document.getElementById('chat-' + idx).style.display = 'block';
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });
    document.querySelector('.sidebar-link')?.classList.add('active');
  </script>
</body>
</html>`;
  },

  geminiImportPasteReady(convo) {
    const summary = AIExporter.platform.parser.toConversationSummary(convo);
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
    const summary = AIExporter.platform.parser.toConversationSummary(convo);
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
    const summary = AIExporter.platform.parser.toConversationSummary(convo);
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
        const summary = AIExporter.platform.parser.toConversationSummary(convo);
        const id = summary.id || "unknown";
        const baseName = AIExporter.utils.sanitizeFilename(summary.title);
        return {
          title: summary.title,
          paste_file: `paste-ready/${baseName}_${id.slice(0, 8)}.txt`,
          context_prompt_file: `context-prompts/${baseName}_${id.slice(0, 8)}.txt`,
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
    const summary = AIExporter.platform.parser.toConversationSummary(convo);
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
    const summary = AIExporter.platform.parser.toConversationSummary(convo);
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
      const summary = AIExporter.platform.parser.toConversationSummary(convo);
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

  ragJsonl(conversations, options = {}) {
    const summaries = conversations.map((c) =>
      AIExporter.platform.parser.toConversationSummary(c, options)
    );
    return AIExporter.rag.buildJsonlRecords(summaries, {
      source: AIExporter.platform?.id || "chatgpt",
      chunkSize: options.ragChunkSize,
      chunkOverlap: options.ragChunkOverlap,
      chunkStrategy: options.ragChunkStrategy,
    });
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
- \`html/\` — Print-ready HTML (use browser Print → Save as PDF)
- \`html/index.html\` — Multi-chat browser with sidebar navigation
- \`notion/\` — Notion-ready markdown with callouts
- \`obsidian/\` — Obsidian vault markdown with YAML frontmatter
- \`csv/\` — Spreadsheet-friendly export for analysis
- \`rag/chunks.jsonl\` — RAG-ready JSONL chunks for embedding pipelines
- \`compliance/manifest.json\` — SHA-256 integrity manifest (if enabled)
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

Requires **Gemini JSON** or **Gemini Import** format (both enabled by default).

**Option A — Copy-paste (easiest)**
1. Open any file in \`gemini-import/paste-ready/\`
2. Copy and paste into a new chat at gemini.google.com

**Option B — Context prompts**
Use files in \`gemini-import/context-prompts/\` for long conversations with framing instructions.

**Option C — Gemini API**
Use \`gemini-import/api/conversations.json\` (combined) or per-chat files in \`gemini-import/api/\` with the Google AI SDK.

**Fallback:** paste from \`markdown/\` if \`gemini-import/\` is not in your export.

**Import helper:** \`node tools/prepare-gemini-import.mjs your-export.zip\`

## Notion

Upload or paste files from \`notion/\` into Notion pages. Formatted with headings and dividers.

## Obsidian

Copy files from \`obsidian/\` into your Obsidian vault. Includes YAML frontmatter and callout syntax.

## Multi-chat browser

Open \`html/index.html\` in your browser to navigate all exported conversations in one place.

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
