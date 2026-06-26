/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.partRenderer = {
  INTERNAL_LABELS: {
    multimodal_text: "File context",
    code: "Code",
    execution_output: "Output",
    computer_output: "Output",
    tether_browsing_display: "Web browsing",
    system_error: "Error",
    text: "Tool output",
  },

  citationsToFootnotes(text, citations) {
    if (!citations?.length) return { text, footnotes: [] };

    const footnotes = [];
    let result = String(text);

    for (let i = 0; i < citations.length; i += 1) {
      const cit = citations[i];
      const title = cit.metadata?.title || cit.title || `Source ${i + 1}`;
      const url = cit.metadata?.url || cit.url || "";
      footnotes.push(url ? `[${i + 1}]: ${url} "${title}"` : `[${i + 1}]: ${title}`);
    }

    result = result.replace(/\u3010(\d+)\u2020source\u3011/g, "[^$1]");
    result = result.replace(/\u3010([^\u3011]+)\u3011/g, (_, inner) => {
      const idx = footnotes.length;
      footnotes.push(inner);
      return `[^${idx + 1}]`;
    });

    return { text: result, footnotes };
  },

  renderPart(part) {
    if (typeof part === "string") {
      return part;
    }
    if (!part || typeof part !== "object") {
      return "";
    }

    const type = part.content_type || part.type;

    if (type === "image_asset_pointer" && part.asset_pointer) {
      return "[image]";
    }

    if (type === "code" || part.language !== undefined) {
      const lang = part.language || part.lang || "";
      const code = part.text || part.code || "";
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }

    if (type === "execution_output" || type === "computer_output") {
      const output = part.text || part.stdout || part.output || "";
      return `\`\`\`\n${output}\n\`\`\``;
    }

    if (type === "tether_browsing_display" || type === "tether_quote") {
      const content = part.text || part.title || JSON.stringify(part);
      return `> **Web source:** ${content}`;
    }

    if (type === "thoughts" || type === "reasoning" || part.thought) {
      const thought = part.thought || part.text || part.summary || "";
      return thought ? `> **Reasoning:** ${thought}` : "";
    }

    if (part.text) {
      return part.text;
    }

    if (part.parts) {
      return part.parts.map((p) => this.renderPart(p)).filter(Boolean).join("\n");
    }

    return "";
  },

  renderMessageContent(msg, options = {}) {
    const contentType = msg.content?.content_type || "text";
    const parts = msg.content?.parts?.length
      ? msg.content.parts
      : typeof msg.content?.text === "string" && msg.content.text
        ? [msg.content.text]
        : [];
    const chunks = [];

    for (const part of parts) {
      const rendered = this.renderPart(part);
      if (rendered) chunks.push(rendered);
    }

    let text = chunks.join("\n").trim();
    const preserveCitations = options.preserveCitations !== false;

    if (preserveCitations && msg.metadata?.citations?.length) {
      const converted = this.citationsToFootnotes(text, msg.metadata.citations);
      text = converted.text;
      if (converted.footnotes.length) {
        text += "\n\n" + converted.footnotes.map((f, i) => `[^${i + 1}]: ${f}`).join("\n");
      }
    } else if (!preserveCitations) {
      text = AIExporter.utils.stripCitations(text);
    }

    const isReasoning =
      contentType === "thoughts" ||
      contentType === "reasoning" ||
      msg.metadata?.reasoning_status === "reasoning";

    if (isReasoning && text) {
      text = `<details>\n<summary>Reasoning</summary>\n\n${text}\n</details>`;
    }

    if (
      contentType !== "text" &&
      contentType !== "multimodal_text" &&
      !text &&
      chunks.length === 0
    ) {
      const label = this.INTERNAL_LABELS[contentType] || contentType;
      const fallback = parts
        .map((p) => (typeof p === "string" ? p : JSON.stringify(p)))
        .join("\n");
      if (fallback) {
        text = `> **${label}:**\n>\n> ${fallback.replace(/\n/g, "\n> ")}`;
      }
    }

    return { text, contentType, isReasoning };
  },

  roleLabel(msg) {
    const role = msg.author?.role || "unknown";
    const name = msg.author?.name;
    if (role === "user" && name) return `User (${name})`;
    if (role === "assistant") return "Assistant";
    return role.charAt(0).toUpperCase() + role.slice(1);
  },
};
