/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.parser = {
  extractMessages(convo) {
    const mapping = convo.mapping || {};
    const rootId = Object.keys(mapping).find((key) => mapping[key].parent == null);
    const messages = [];

    if (!rootId) return messages;

    const queue = [rootId];
    while (queue.length) {
      const nodeId = queue.shift();
      const node = mapping[nodeId] || {};
      const msg = node.message;

      if (msg?.content?.parts) {
        const role = msg.author?.role || "unknown";
        const contentType = msg.content?.content_type || "text";

        if (role === "system" || role === "tool") {
          queue.push(...(node.children || []));
          continue;
        }

        if (role === "assistant" && contentType !== "text") {
          queue.push(...(node.children || []));
          continue;
        }

        if (role === "user" && contentType === "user_editable_context") {
          queue.push(...(node.children || []));
          continue;
        }

        const textParts = [];
        const images = [];
        const attachments = [];

        for (const part of msg.content.parts) {
          if (typeof part === "string") {
            textParts.push(part);
          } else if (
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
          } else if (part && typeof part === "object") {
            textParts.push(JSON.stringify(part));
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

        const content = AIExporter.utils.stripCitations(textParts.join("\n")).trim();
        if (content || images.length || attachments.length) {
          messages.push({
            role,
            content,
            contentType,
            timestamp: AIExporter.utils.toIsoTimestamp(msg.create_time),
            images,
            attachments,
          });
        }
      }

      queue.push(...(node.children || []));
    }

    return messages;
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

  toConversationSummary(convo) {
    const messages = this.extractMessages(convo);
    return {
      id: convo.conversation_id || convo.id,
      title: convo.title || "Untitled",
      created_at: AIExporter.utils.toIsoTimestamp(convo.create_time),
      updated_at: AIExporter.utils.toIsoTimestamp(convo.update_time),
      model: convo.default_model_slug || convo.model || null,
      message_count: messages.length,
      messages,
    };
  },
};
