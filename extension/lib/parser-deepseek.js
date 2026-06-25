/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.parserDeepseek = {
  extractMessages(convo, options = {}) {
    const selectedIds = options.selectedMessageIds?.length
      ? new Set(options.selectedMessageIds)
      : null;

    const raw = convo._deepseekMessages || [];
    const messages = [];

    for (const msg of raw) {
      const role =
        msg.role === "assistant" || msg.message_type === "assistant"
          ? "assistant"
          : "user";
      let content = msg.content || msg.text || "";

      if (msg.thinking_content) {
        content = `> **Thinking**\n${msg.thinking_content}\n\n${content}`;
      }

      if (!content.trim()) continue;
      const id = msg.message_id || msg.id || `ds-${messages.length}`;
      if (selectedIds && !selectedIds.has(id)) continue;

      messages.push({
        id,
        role,
        authorName: role === "user" ? "You" : "DeepSeek",
        content: content.trim(),
        contentType: "text",
        timestamp: msg.inserted_at || msg.created_at || null,
        images: [],
        attachments: [],
      });
    }

    return messages;
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
      id: convo.id || convo.conversation_id,
      title: convo.title || "Untitled",
      source: "deepseek",
      created_at: null,
      updated_at: null,
      model: null,
      message_count: messages.length,
      is_group_chat: false,
      participants: [],
      messages,
    };
  },
};
