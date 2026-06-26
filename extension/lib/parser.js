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

  normalizeMapping(raw) {
    if (!raw) return {};
    if (Array.isArray(raw)) {
      const map = {};
      for (const node of raw) {
        if (!node || typeof node !== "object") continue;
        const id = node.id || node.message?.id;
        if (id) map[id] = node;
      }
      return map;
    }
    if (typeof raw === "object") return raw;
    return {};
  },

  findRootId(mapping) {
    const entry = Object.entries(mapping).find(([, node]) => node?.parent == null);
    return entry ? entry[0] : null;
  },

  getLinearNodeIds(convo, mapping) {
    if (convo.current_node && mapping[convo.current_node]) {
      const chain = [];
      let nodeId = convo.current_node;
      const guard = new Set();
      while (nodeId && mapping[nodeId] && !guard.has(nodeId)) {
        guard.add(nodeId);
        chain.push(nodeId);
        nodeId = mapping[nodeId].parent || null;
      }
      return chain.reverse();
    }

    const rootId = this.findRootId(mapping);
    if (!rootId) return Object.keys(mapping);

    const path = [];
    let nodeId = rootId;
    const guard = new Set();
    while (nodeId && mapping[nodeId] && !guard.has(nodeId)) {
      guard.add(nodeId);
      path.push(nodeId);
      const children = mapping[nodeId].children || [];
      if (!children.length) break;
      let next = children[children.length - 1];
      for (const childId of children) {
        const weight = mapping[childId]?.message?.weight;
        if (weight == null || weight >= 1.0) {
          next = childId;
          break;
        }
      }
      nodeId = next;
    }
    return path;
  },

  extractMessages(convo, options = {}) {
    const panelMsgs = AIExporter.utils.panelMessages(convo, options);
    if (panelMsgs) return panelMsgs;

    const mapping = this.normalizeMapping(convo.mapping);
    const nodeIds = this.getLinearNodeIds(convo, mapping);
    const messages = [];
    const selectedIds = options.selectedMessageIds?.length
      ? new Set(options.selectedMessageIds)
      : null;

    if (!nodeIds.length) return messages;

    for (const nodeId of nodeIds) {
      const node = mapping[nodeId] || {};
      const msg = node.message;
      if (!msg?.content) continue;

      const hasParts =
        Array.isArray(msg.content.parts) && msg.content.parts.length > 0;
      const hasText =
        typeof msg.content.text === "string" && msg.content.text.trim();
      if (!hasParts && !hasText) continue;

      if (!this.shouldSkipMessage(msg)) {
        const role = msg.author?.role || "unknown";
        const { text, contentType, isReasoning } =
          AIExporter.partRenderer.renderMessageContent(msg, options);

        const images = [];
        const attachments = [];

        if (hasParts) {
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
