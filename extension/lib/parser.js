/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.parser = {
  shouldSkipMessage(msg) {
    const role = msg.author?.role || "unknown";
    const contentType = msg.content?.content_type || "text";

    if (role === "system") return true;
    if (role === "tool") return true;
    if (role === "user" && contentType === "user_editable_context") return true;
    return false;
  },

  extractMessages(convo, options = {}) {
    const mapping = convo.mapping || {};
    const rootId = Object.keys(mapping).find((key) => mapping[key].parent == null);
    const messages = [];
    const selectedIds = options.selectedMessageIds?.length
      ? new Set(options.selectedMessageIds)
      : null;

    if (!rootId) return messages;

    const queue = [rootId];
    while (queue.length) {
      const nodeId = queue.shift();
      const node = mapping[nodeId] || {};
      const msg = node.message;

      if (msg?.content?.parts) {
        if (!this.shouldSkipMessage(msg)) {
          const role = msg.author?.role || "unknown";
          const { text, contentType, isReasoning } =
            AIExporter.partRenderer.renderMessageContent(msg, options);

          const images = [];
          const attachments = [];

          for (const part of msg.content.parts) {
            if (
              part?.content_type === "image_asset_pointer" &&
              part.asset_pointer
            ) {
              const match = part.asset_pointer.match(
                /^(?:file-service|sediment):\/\/(.+)$/
              );
              if (match) {
                images.push({
                  fileId: match[1],
                  prompt: part.metadata?.dalle?.prompt || null,
                });
              }
            }
          }

          if (msg.metadata?.attachments) {
            for (const att of msg.metadata.attachments) {
              if (att.id) {
                attachments.push({
                  fileId: att.id,
                  name: att.name || "attachment",
                });
              }
            }
          }

          const hasContent = text || images.length || attachments.length;
          const passesFilter = !selectedIds || selectedIds.has(nodeId);

          if (hasContent && passesFilter) {
            messages.push({
              id: nodeId,
              role,
              authorName: msg.author?.name || null,
              content: text,
              contentType,
              isReasoning,
              timestamp: AIExporter.utils.toIsoTimestamp(msg.create_time),
              images,
              attachments,
            });
          }
        }
      }

      queue.push(...(node.children || []));
    }

    return messages;
  },

  filterConvoMessages(convo, selectedMessageIds) {
    if (!selectedMessageIds?.length) return convo;
    return {
      ...convo,
      _aiExporterSelectedMessageIds: selectedMessageIds,
    };
  },

  extractFileReferences(convo) {
    const refs = [];
    const seen = new Set();
    const mapping = convo.mapping || {};

    for (const node of Object.values(mapping)) {
      const msg = node.message;
      if (!msg) continue;

      if (msg.content?.parts) {
        for (const part of msg.content.parts) {
          if (
            part?.content_type === "image_asset_pointer" &&
            part.asset_pointer
          ) {
            const match = part.asset_pointer.match(
              /^(?:file-service|sediment):\/\/(.+)$/
            );
            if (match && !seen.has(match[1])) {
              seen.add(match[1]);
              refs.push({
                fileId: match[1],
                filename: part.metadata?.dalle?.prompt
                  ? "dalle_image.png"
                  : "image.png",
                type: "image",
              });
            }
          }
        }
      }

      if (msg.metadata?.attachments) {
        for (const att of msg.metadata.attachments) {
          if (att.id && !seen.has(att.id)) {
            seen.add(att.id);
            refs.push({
              fileId: att.id,
              filename: att.name || "attachment",
              type: "attachment",
            });
          }
        }
      }
    }

    return refs;
  },

  toConversationSummary(convo, options = {}) {
    const parseOptions = {
      ...options,
      selectedMessageIds:
        options.selectedMessageIds || convo._aiExporterSelectedMessageIds,
    };
    const messages = this.extractMessages(convo, parseOptions);
    const userNames = new Set(
      messages
        .filter((m) => m.role === "user" && m.authorName)
        .map((m) => m.authorName)
    );

    return {
      id: convo.conversation_id || convo.id,
      title: convo.title || "Untitled",
      created_at: AIExporter.utils.toIsoTimestamp(convo.create_time),
      updated_at: AIExporter.utils.toIsoTimestamp(convo.update_time),
      model: convo.default_model_slug || convo.model || null,
      message_count: messages.length,
      is_group_chat: userNames.size > 1,
      participants: [...userNames],
      messages,
    };
  },
};
