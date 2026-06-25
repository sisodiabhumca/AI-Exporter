/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.apiGemini = {
  DELAY_MS: 500,
  LIST_RPC: "MaZiqc",
  READ_RPC: "hNvQHb",

  accountId: null,

  async init() {
    const tokens = await AIExporter.batchexecute.fetchTokens();
    this.accountId = tokens.sid || "gemini";
    return { accountId: this.accountId, email: null };
  },

  parseChatList(data) {
    const chats = [];
    const walk = (node) => {
      if (!node) return;
      if (Array.isArray(node)) {
        if (
          typeof node[0] === "string" &&
          node[0].startsWith("c_") &&
          typeof node[1] === "string"
        ) {
          const ts = Array.isArray(node[5]) ? node[5][0] : null;
          chats.push({
            id: node[0],
            title: node[1] || "Untitled",
            create_time: ts,
            update_time: ts,
          });
          return;
        }
        for (const child of node) walk(child);
      }
    };
    walk(data);
    return chats;
  },

  async listConversations(onProgress) {
    const data = await AIExporter.batchexecute.call(this.LIST_RPC, [200]);
    const conversations = this.parseChatList(data);

    onProgress?.({
      phase: "listing",
      current: conversations.length,
      total: conversations.length,
    });

    return conversations;
  },

  extractUserText(turn) {
    try {
      const section = turn?.[2];
      if (!section) return "";
      const prompt = section[0];
      if (typeof prompt === "string") return prompt;
      if (Array.isArray(prompt)) {
        if (typeof prompt[0] === "string") return prompt[0];
        if (Array.isArray(prompt[0]) && typeof prompt[0][0] === "string") {
          return prompt[0][0];
        }
      }
    } catch {
      // ignore
    }
    return "";
  },

  extractModelText(turn) {
    try {
      const candidates = turn?.[3]?.[0];
      if (!Array.isArray(candidates)) return "";
      const candidate = candidates[0];
      const textPart = candidate?.[1];
      if (typeof textPart === "string") return textPart;
      if (Array.isArray(textPart)) {
        if (typeof textPart[0] === "string") return textPart[0];
      }
      const nested = candidate?.[0]?.[1];
      if (typeof nested === "string") return nested;
      if (Array.isArray(nested) && typeof nested[0] === "string") return nested[0];
    } catch {
      // ignore
    }
    return "";
  },

  parseConversation(id, data, fallbackTitle) {
    const turns = Array.isArray(data) ? data : data?.[0] || [];
    const messages = [];
    let title = fallbackTitle || "Untitled";

    if (Array.isArray(data?.[0]?.[2]) && typeof data[0][2][1] === "string") {
      title = data[0][2][1];
    }

    for (const turn of turns) {
      if (!Array.isArray(turn)) continue;
      const userText = this.extractUserText(turn);
      const modelText = this.extractModelText(turn);
      const ts = Array.isArray(turn[4]) ? turn[4][0] : null;

      if (userText) {
        messages.push({
          id: `${id}-u-${messages.length}`,
          role: "user",
          content: userText,
          timestamp: ts ? new Date(ts * 1000).toISOString() : null,
        });
      }
      if (modelText) {
        messages.push({
          id: `${id}-a-${messages.length}`,
          role: "assistant",
          content: modelText,
          timestamp: ts ? new Date(ts * 1000).toISOString() : null,
        });
      }
    }

    return {
      id,
      conversation_id: id,
      title,
      create_time: messages[0]?.timestamp
        ? Date.parse(messages[0].timestamp) / 1000
        : null,
      update_time: messages.at(-1)?.timestamp
        ? Date.parse(messages.at(-1).timestamp) / 1000
        : null,
      source: "gemini",
      _geminiMessages: messages,
      _raw: data,
    };
  },

  async getConversation(id) {
    const payload = [id, 1000, null, 1, [0], [4], null, 1];
    const data = await AIExporter.batchexecute.call(this.READ_RPC, payload);
    return this.parseConversation(id, data);
  },

  async downloadFile() {
    throw new Error("Gemini file download not yet supported");
  },
};
