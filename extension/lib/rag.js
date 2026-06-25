/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.rag = {
  DEFAULT_CHUNK_SIZE: 2000,
  DEFAULT_OVERLAP: 200,

  chunkMessages(messages, options = {}) {
    const maxChars = options.chunkSize || this.DEFAULT_CHUNK_SIZE;
    const overlap = options.chunkOverlap ?? this.DEFAULT_OVERLAP;
    const strategy = options.chunkStrategy || "turn-pair";

    if (strategy === "semantic") {
      return this.chunkSemantic(messages, maxChars, overlap);
    }

    const chunks = [];

    if (strategy === "message") {
      for (const msg of messages) {
        const text = (msg.content || "").trim();
        if (!text) continue;
        const parts = this.splitText(text, maxChars, overlap);
        parts.forEach((content, i) => {
          chunks.push({
            role: msg.role,
            content,
            message_id: msg.id,
            part_index: i,
            part_total: parts.length,
          });
        });
      }
      return chunks;
    }

    // turn-pair: group user+assistant into contextual chunks
    let buffer = "";
    let bufferRoles = [];
    let bufferIds = [];

    const flush = () => {
      const text = buffer.trim();
      if (!text) return;
      const parts = this.splitText(text, maxChars, overlap);
      parts.forEach((content, i) => {
        chunks.push({
          roles: [...bufferRoles],
          content,
          message_ids: [...bufferIds],
          part_index: i,
          part_total: parts.length,
        });
      });
      buffer = "";
      bufferRoles = [];
      bufferIds = [];
    };

    for (const msg of messages) {
      if (msg.role !== "user" && msg.role !== "assistant") continue;
      const label = msg.role === "user" ? "User" : "Assistant";
      const block = `### ${label}\n${msg.content || ""}\n\n`;
      if (buffer.length + block.length > maxChars && buffer) flush();
      buffer += block;
      bufferRoles.push(msg.role);
      bufferIds.push(msg.id);
      if (msg.role === "assistant") flush();
    }
    flush();

    return chunks;
  },

  chunkSemantic(messages, maxChars, overlap) {
    const sections = [];
    for (const msg of messages) {
      if (msg.role !== "user" && msg.role !== "assistant") continue;
      const label = msg.role === "user" ? "User" : "Assistant";
      const text = (msg.content || "").trim();
      if (!text) continue;

      const parts = text.split(/\n(?=## )/);
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        sections.push({
          role: msg.role,
          message_id: msg.id,
          content: `### ${label}\n${trimmed}`,
        });
      }
    }

    const chunks = [];
    let buffer = "";
    let bufferIds = [];
    let bufferRoles = [];

    const flush = () => {
      const text = buffer.trim();
      if (!text) return;
      const parts = this.splitText(text, maxChars, overlap);
      parts.forEach((content, i) => {
        chunks.push({
          roles: [...bufferRoles],
          content,
          message_ids: [...bufferIds],
          part_index: i,
          part_total: parts.length,
        });
      });
      buffer = "";
      bufferIds = [];
      bufferRoles = [];
    };

    for (const sec of sections) {
      if (buffer.length + sec.content.length + 2 > maxChars && buffer) {
        flush();
      }
      buffer += (buffer ? "\n\n" : "") + sec.content;
      bufferIds.push(sec.message_id);
      bufferRoles.push(sec.role);
    }
    flush();

    return chunks.length ? chunks : this.chunkMessages(messages, {
      chunkSize: maxChars,
      chunkOverlap: overlap,
      chunkStrategy: "turn-pair",
    });
  },

  splitText(text, maxChars, overlap) {
    if (text.length <= maxChars) return [text];

    const chunks = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + maxChars, text.length);
      if (end < text.length) {
        const slice = text.slice(start, end);
        const breakAt = Math.max(
          slice.lastIndexOf("\n\n"),
          slice.lastIndexOf("\n"),
          slice.lastIndexOf(" ")
        );
        if (breakAt > maxChars * 0.5) end = start + breakAt;
      }
      chunks.push(text.slice(start, end).trim());
      if (end >= text.length) break;
      start = Math.max(end - overlap, start + 1);
    }

    return chunks.filter(Boolean);
  },

  buildJsonlRecords(summaries, options = {}) {
    const lines = [];
    const source = options.source || "chatgpt";
    const exportedAt = new Date().toISOString();

    for (const summary of summaries) {
      const messages = (summary.messages || []).filter(
        (m) => m.role === "user" || m.role === "assistant"
      );
      const chunks = this.chunkMessages(messages, options);

      chunks.forEach((chunk, index) => {
        const record = {
          id: `${summary.id || "unknown"}_${index}`,
          conversation_id: summary.id,
          conversation_title: summary.title,
          source,
          role: chunk.role || (chunk.roles || []).join("+") || "mixed",
          content: chunk.content,
          chunk_index: index,
          chunk_total: chunks.length,
          message_ids: chunk.message_ids || (chunk.message_id ? [chunk.message_id] : []),
          exported_at: exportedAt,
          metadata: {
            model: summary.model || null,
            is_group_chat: summary.is_group_chat || false,
            chunk_strategy: options.chunkStrategy || "turn-pair",
            chunk_size: options.chunkSize || this.DEFAULT_CHUNK_SIZE,
          },
        };
        lines.push(JSON.stringify(record));
      });
    }

    return lines.join("\n") + (lines.length ? "\n" : "");
  },
};
