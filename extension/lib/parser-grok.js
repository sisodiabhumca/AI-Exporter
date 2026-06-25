/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.parserGrok = {
  extractMessages(convo, options = {}) {
    const selectedIds = options.selectedMessageIds?.length
      ? new Set(options.selectedMessageIds)
      : null;

    const messages = (convo._grokMessages || []).map((m) => ({
      id: m.id,
      role: m.role,
      authorName: m.role === "user" ? "You" : "Grok",
      content: m.content,
      contentType: "text",
      timestamp: m.timestamp || null,
      images: [],
      attachments: [],
    }));

    return messages.filter((m) => !selectedIds || selectedIds.has(m.id));
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
      source: "grok",
      created_at: convo.create_time
        ? AIExporter.utils.toIsoTimestamp(convo.create_time)
        : null,
      updated_at: convo.update_time
        ? AIExporter.utils.toIsoTimestamp(convo.update_time)
        : null,
      model: null,
      message_count: messages.length,
      is_group_chat: false,
      participants: [],
      messages,
    };
  },
};
