/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.parserCopilot = {
  extractMessages(convo, options = {}) {
    const panelMsgs = AIExporter.utils.panelMessages(convo, options);
    if (panelMsgs) return panelMsgs;

    const selectedIds = options.selectedMessageIds?.length
      ? new Set(options.selectedMessageIds)
      : null;

    const messages = (convo._domMessages || []).map((m, i) => ({
      id: m.id || `copilot-${i}`,
      role: m.role,
      authorName: m.role === "user" ? "You" : "Copilot",
      content: m.content,
      contentType: "text",
      timestamp: null,
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
      source: "copilot",
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
