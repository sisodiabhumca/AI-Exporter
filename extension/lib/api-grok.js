/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.apiGrok = {
  API_BASE: "https://grok.com/rest/app-chat",
  DELAY_MS: 500,
  BATCH_SIZE: 100,
  accountId: null,

  async init() {
    this.accountId = "grok";
    try {
      await this.get("/conversations?pageSize=1");
    } catch {
      throw new Error("Not logged in. Please sign in to grok.com first.");
    }
    return { accountId: this.accountId, email: null };
  },

  async fetchJSON(path, opts = {}) {
    const resp = await fetch(`${this.API_BASE}${path}`, {
      credentials: "include",
      ...opts,
      headers: {
        Accept: "application/json",
        ...(opts.headers || {}),
      },
    });
    if (!resp.ok) {
      throw new Error(`Grok API HTTP ${resp.status}`);
    }
    return resp.json();
  },

  async listConversations(onProgress) {
    const data = await this.fetchJSON("/conversations?pageSize=200");
    const list = (data?.conversations || []).map((c) => ({
      id: c.conversationId || c.id,
      title: c.title || "Untitled",
      create_time: c.createTime ? Date.parse(c.createTime) / 1000 : null,
      update_time: c.modifyTime ? Date.parse(c.modifyTime) / 1000 : null,
    }));

    onProgress?.({
      phase: "listing",
      current: list.length,
      total: list.length,
    });

    return list;
  },

  async getResponseIds(conversationId) {
    const data = await this.fetchJSON(
      `/conversations/${conversationId}/response-node?includeThreads=true`
    );
    const nodes = data?.responseNodes || [];
    return [...new Set(nodes.map((n) => n.responseId).filter(Boolean))];
  },

  async loadResponses(conversationId, responseIds) {
    const all = [];
    for (let i = 0; i < responseIds.length; i += this.BATCH_SIZE) {
      const batch = responseIds.slice(i, i + this.BATCH_SIZE);
      const data = await this.fetchJSON(
        `/conversations/${conversationId}/load-responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responseIds: batch }),
        }
      );
      if (Array.isArray(data?.responses)) {
        all.push(...data.responses);
      }
      await AIExporter.utils.sleep(this.DELAY_MS);
    }
    return all;
  },

  parseResponses(responses) {
    const sorted = [...responses].sort((a, b) => {
      const ta = Date.parse(a.createTime || 0) || 0;
      const tb = Date.parse(b.createTime || 0) || 0;
      return ta - tb;
    });

    return sorted
      .map((r, i) => {
        const sender = String(r.sender || "").toLowerCase();
        const role = sender === "human" ? "user" : "assistant";
        let content = r.message || "";
        if (r.thinkingTrace || r.thinking) {
          const think = r.thinkingTrace || r.thinking;
          content = `> **Thinking**\n${think}\n\n${content}`;
        }
        return {
          id: r.responseId || `grok-${i}`,
          role,
          content: content.trim(),
          timestamp: r.createTime || null,
        };
      })
      .filter((m) => m.content);
  },

  async getConversation(id) {
    const listData = await this.fetchJSON("/conversations?pageSize=200");
    const meta = (listData?.conversations || []).find(
      (c) => (c.conversationId || c.id) === id
    );

    const responseIds = await this.getResponseIds(id);
    const responses = responseIds.length
      ? await this.loadResponses(id, responseIds)
      : [];

    const messages = this.parseResponses(responses);

    return {
      id,
      conversation_id: id,
      title: meta?.title || "Untitled",
      source: "grok",
      create_time: meta?.createTime
        ? Date.parse(meta.createTime) / 1000
        : null,
      update_time: meta?.modifyTime
        ? Date.parse(meta.modifyTime) / 1000
        : null,
      _grokMessages: messages,
    };
  },

  async downloadFile() {
    throw new Error("Grok file download not yet supported");
  },
};
