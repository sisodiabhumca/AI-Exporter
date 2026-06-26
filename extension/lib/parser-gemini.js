/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.parserGemini = {
  extractMessages(convo, options = {}) {
    const panelMsgs = AIExporter.utils.panelMessages(convo, options);
    if (panelMsgs) return panelMsgs;

    const selectedIds = options.selectedMessageIds?.length
      ? new Set(options.selectedMessageIds)
      : null;

    const messages = convo._geminiMessages || [];
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
      source: "gemini",
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
