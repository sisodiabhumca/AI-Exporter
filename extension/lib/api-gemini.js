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
    const seen = new Set();

    const addChat = (rawId, title, ts) => {
      if (!rawId || typeof rawId !== "string") return;
      const id = this.normalizeConversationId(rawId);
      if (seen.has(id)) return;
      seen.add(id);
      chats.push({
        id,
        title: title || "Untitled",
        create_time: ts,
        update_time: ts,
      });
    };

    const walk = (node) => {
      if (!node) return;
      if (Array.isArray(node)) {
        if (typeof node[0] === "string" && typeof node[1] === "string") {
          const id = node[0];
          const looksLikeChat =
            id.startsWith("c_") || /^[a-f0-9]{12,}$/i.test(id.replace(/^c_/, ""));
          if (looksLikeChat) {
            const ts = Array.isArray(node[5]) ? node[5][0] : null;
            addChat(id, node[1], ts);
            return;
          }
        }
        for (const child of node) walk(child);
      }
    };
    walk(data);
    return chats;
  },

  listConversationsFromDom() {
    const pattern = /\/app\/([a-zA-Z0-9_-]+)/;
    return AIExporter.domScraper.scrapeSidebarLinks(pattern).map((row) => ({
      id: this.normalizeConversationId(row.id),
      title: row.title || "Untitled",
      create_time: null,
      update_time: null,
    }));
  },

  getConversationFromDom(id) {
    const messages = AIExporter.domScraper.scrapeForPlatform("gemini").map((m, index) => ({
      id: m.id || `${id}-dom-${index}`,
      role: m.role,
      content: m.content,
      timestamp: null,
    }));

    if (!messages.length) {
      throw new Error(
        "Could not read Gemini messages. Scroll the chat to load history, then try again."
      );
    }

    const titleEl = document.querySelector(
      'a[aria-current="page"], nav a[aria-selected="true"]'
    );
    const cid = this.normalizeConversationId(id);

    return {
      id: cid,
      conversation_id: cid,
      title: (titleEl?.textContent || document.title || "Current conversation").trim(),
      create_time: null,
      update_time: null,
      source: "gemini",
      _geminiMessages: messages,
      _panelMessages: messages,
    };
  },

  async readConversationApi(id) {
    const cid = this.normalizeConversationId(id);
    const ids = [cid];
    if (id && id !== cid) ids.push(id);
    if (cid.startsWith("c_")) ids.push(cid.slice(2));

    const payloads = [
      [cid, 1000, null, 1, [0], [4], null, 1],
      [cid, 100, null, 1, [0], [4], null, 1],
    ];

    for (const chatId of ids) {
      for (const payload of payloads) {
        const request = [...payload];
        request[0] = chatId;
        try {
          const data = await AIExporter.batchexecute.call(this.READ_RPC, request);
          const convo = this.parseConversation(chatId, data);
          if (convo._geminiMessages?.length) return convo;
        } catch {
          // try next payload / id shape
        }
      }
    }

    return null;
  },

  async listConversationsApi() {
    const payloads = [
      [13, null, [0, null, 1]],
      [13, null, [1, null, 1]],
      [200],
      [50],
    ];
    for (const payload of payloads) {
      try {
        const data = await AIExporter.batchexecute.call(this.LIST_RPC, payload);
        const conversations = this.parseChatList(data);
        if (conversations.length) return conversations;
      } catch {
        // try next list payload shape
      }
    }
    return [];
  },

  normalizeConversationId(id) {
    return AIExporter.platform.normalizeConversationId(id);
  },

  isCurrentConversation(id) {
    const current = AIExporter.platform.getConversationIdFromUrl?.();
    if (!current) return true;
    return AIExporter.platform.conversationIdsMatch(id, current);
  },

  async listConversations(onProgress) {
    let conversations = await this.listConversationsApi();

    if (!conversations.length) {
      conversations = this.listConversationsFromDom();
    }

    if (!conversations.length) {
      const currentId = AIExporter.platform.getConversationIdFromUrl?.();
      if (currentId) {
        conversations = [
          {
            id: this.normalizeConversationId(currentId),
            title: "Current conversation",
            create_time: null,
            update_time: null,
          },
        ];
      }
    }

    if (!conversations.length) {
      throw new Error(
        "Could not list Gemini conversations. Open a chat on gemini.google.com and try again."
      );
    }

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

  conversationTurns(data) {
    if (!Array.isArray(data)) return [];

    const looksLikeTurn = (node) =>
      Array.isArray(node) && Array.isArray(node[2]) && node.length >= 3;

    if (data.every(looksLikeTurn)) return data;
    if (Array.isArray(data[0]) && data[0].every(looksLikeTurn)) return data[0];

    const turns = [];
    const walk = (node) => {
      if (!Array.isArray(node)) return;
      if (looksLikeTurn(node)) {
        turns.push(node);
        return;
      }
      for (const child of node) walk(child);
    };
    walk(data);
    return turns;
  },

  parseConversation(id, data, fallbackTitle) {
    const turns = this.conversationTurns(data);
    const messages = [];
    let title = fallbackTitle || "Untitled";

    if (Array.isArray(data?.[0]?.[2]) && typeof data[0][2][1] === "string") {
      title = data[0][2][1];
    } else if (typeof data?.[1] === "string") {
      title = data[1];
    }

    for (const turn of turns) {
      if (!Array.isArray(turn)) continue;
      const userText = this.extractUserText(turn);
      const modelText = this.extractModelText(turn);
      const ts = Array.isArray(turn[4]) ? turn[4][0] : null;
      const tsIso = ts
        ? new Date(ts > 1e12 ? ts : ts * 1000).toISOString()
        : null;

      if (userText) {
        messages.push({
          id: `${id}-u-${messages.length}`,
          role: "user",
          content: userText,
          timestamp: tsIso,
        });
      }
      if (modelText) {
        messages.push({
          id: `${id}-a-${messages.length}`,
          role: "assistant",
          content: modelText,
          timestamp: tsIso,
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
    const apiConvo = await this.readConversationApi(id);
    if (apiConvo?._geminiMessages?.length) return apiConvo;

    if (!this.isCurrentConversation(id)) {
      throw new Error(
        "Open this Gemini chat in your browser before exporting it, or use Current conversation only."
      );
    }

    return this.getConversationFromDom(id);
  },

  async downloadFile() {
    throw new Error("Gemini file download not yet supported");
  },
};
