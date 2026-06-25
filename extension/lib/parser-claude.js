/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.parserClaude = {
  selectActiveLineage(messages, leafUuid) {
    if (!leafUuid || !messages?.length) return messages || [];
    const byId = new Map(messages.map((m) => [m.uuid, m]));
    const lineage = new Set();
    let current = leafUuid;

    while (current && byId.has(current)) {
      lineage.add(current);
      current = byId.get(current).parent_message_uuid || null;
    }

    if (!lineage.size) return messages;
    return messages.filter((m) => lineage.has(m.uuid));
  },

  renderBlock(block) {
    if (!block) return "";
    switch (block.type) {
      case "text": {
        let text = block.text || "";
        if (block.citations?.length) {
          const refs = block.citations
            .map((c) => `[${c.title || c.url}](${c.url})`)
            .join(", ");
          if (refs) text += `\n\n*Sources: ${refs}*`;
        }
        return text;
      }
      case "thinking":
        return `> **Thinking**\n${(block.thinking || "")
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n")}`;
      case "tool_use":
        return `\n**Tool: ${block.name || "tool"}**\n\`\`\`json\n${JSON.stringify(block.input || {}, null, 2)}\n\`\`\``;
      case "tool_result": {
        const text = (block.content || [])
          .map((c) => c.text || "")
          .filter(Boolean)
          .join("\n");
        return `\n**Tool result${block.is_error ? " (error)" : ""}**\n${text}`;
      }
      default:
        return block.text || "";
    }
  },

  renderMessage(msg) {
    const parts = (msg.content || []).map((b) => this.renderBlock(b));
    if (msg.attachments?.length) {
      for (const att of msg.attachments) {
        if (att.extracted_content) {
          parts.push(`\n📎 **${att.file_name || "attachment"}**\n${att.extracted_content}`);
        }
      }
    }
    return parts.filter(Boolean).join("\n").trim();
  },

  extractMessages(convo, options = {}) {
    const selectedIds = options.selectedMessageIds?.length
      ? new Set(options.selectedMessageIds)
      : null;

    let messages = convo.chat_messages || [];
    messages = this.selectActiveLineage(
      messages,
      convo.current_leaf_message_uuid
    );

    const result = [];
    for (const msg of messages) {
      const role = msg.sender === "human" ? "user" : "assistant";
      const content = this.renderMessage(msg);
      if (!content) continue;
      if (selectedIds && !selectedIds.has(msg.uuid)) continue;

      result.push({
        id: msg.uuid,
        role,
        authorName: role === "user" ? "You" : "Claude",
        content,
        contentType: "text",
        isReasoning: (msg.content || []).some((b) => b.type === "thinking"),
        timestamp: msg.created_at || null,
        images: [],
        attachments: [],
      });
    }

    return result;
  },

  filterConvoMessages(convo, selectedMessageIds) {
    if (!selectedMessageIds?.length) return convo;
    return { ...convo, _aiExporterSelectedMessageIds: selectedMessageIds };
  },

  extractFileReferences() {
    return [];
  },

  toConversationSummary(convo, options = {}) {
    const parseOptions = {
      ...options,
      selectedMessageIds:
        options.selectedMessageIds || convo._aiExporterSelectedMessageIds,
    };
    const messages = this.extractMessages(convo, parseOptions);

    return {
      id: convo.uuid || convo.id || convo.conversation_id,
      title: convo.title || convo.name || "Untitled",
      source: "claude",
      created_at: convo.created_at || null,
      updated_at: convo.updated_at || null,
      model: convo.model || null,
      message_count: messages.length,
      is_group_chat: false,
      participants: [],
      messages,
    };
  },
};
