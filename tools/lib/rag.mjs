export const DEFAULT_CHUNK_SIZE = 2000;
export const DEFAULT_OVERLAP = 200;

export function chunkMessages(messages, options = {}) {
  const maxChars = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const overlap = options.chunkOverlap ?? DEFAULT_OVERLAP;
  const strategy = options.chunkStrategy || "turn-pair";

  if (strategy === "semantic") {
    return chunkSemantic(messages, maxChars, overlap);
  }

  const chunks = [];

  if (strategy === "message") {
    for (const msg of messages) {
      const text = (msg.content || "").trim();
      if (!text) continue;
      const parts = splitText(text, maxChars, overlap);
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

  let buffer = "";
  let bufferRoles = [];
  let bufferIds = [];

  const flush = () => {
    const text = buffer.trim();
    if (!text) return;
    const parts = splitText(text, maxChars, overlap);
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
}

function chunkSemantic(messages, maxChars, overlap) {
  const sections = [];
  for (const msg of messages) {
    if (msg.role !== "user" && msg.role !== "assistant") continue;
    const label = msg.role === "user" ? "User" : "Assistant";
    const text = (msg.content || "").trim();
    if (!text) continue;
    for (const part of text.split(/\n(?=## )/)) {
      const trimmed = part.trim();
      if (trimmed) {
        sections.push({ role: msg.role, message_id: msg.id, content: `### ${label}\n${trimmed}` });
      }
    }
  }

  const chunks = [];
  let buffer = "";
  let bufferIds = [];
  let bufferRoles = [];

  const flush = () => {
    const text = buffer.trim();
    if (!text) return;
    for (const content of splitText(text, maxChars, overlap)) {
      chunks.push({ roles: [...bufferRoles], content, message_ids: [...bufferIds] });
    }
    buffer = "";
    bufferIds = [];
    bufferRoles = [];
  };

  for (const sec of sections) {
    if (buffer.length + sec.content.length + 2 > maxChars && buffer) flush();
    buffer += (buffer ? "\n\n" : "") + sec.content;
    bufferIds.push(sec.message_id);
    bufferRoles.push(sec.role);
  }
  flush();
  return chunks.length ? chunks : chunkMessages(messages, { chunkSize: maxChars, chunkOverlap: overlap, chunkStrategy: "turn-pair" });
}

export function splitText(text, maxChars, overlap) {
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
}

export function buildJsonlRecords(summaries, options = {}) {
  const lines = [];
  const source = options.source || "chatgpt";
  const exportedAt = new Date().toISOString();

  for (const summary of summaries) {
    const messages = (summary.messages || []).filter(
      (m) => m.role === "user" || m.role === "assistant"
    );
    const chunks = chunkMessages(messages, options);

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
          chunk_size: options.chunkSize || DEFAULT_CHUNK_SIZE,
        },
      };
      lines.push(JSON.stringify(record));
    });
  }

  return lines.join("\n") + (lines.length ? "\n" : "");
}
