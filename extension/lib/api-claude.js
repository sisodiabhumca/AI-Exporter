/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.apiClaude = {
  API_BASE: "/api",
  PAGE_SIZE: 100,
  DELAY_MS: 400,

  orgId: null,
  accountId: null,

  getCookie(name) {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
    );
    return match ? decodeURIComponent(match[1]) : null;
  },

  async init() {
    this.orgId = this.getCookie("lastActiveOrg");

    if (!this.orgId) {
      const resp = await fetch(`${this.API_BASE}/organizations`, {
        credentials: "include",
      });
      if (!resp.ok) {
        throw new Error("Not logged in. Please sign in to claude.ai first.");
      }
      const orgs = await resp.json();
      const list = Array.isArray(orgs) ? orgs : orgs.organizations || [];
      this.orgId = list[0]?.uuid || list[0]?.id || null;
    }

    if (!this.orgId) {
      throw new Error("Could not detect Claude organization. Open a chat and retry.");
    }

    this.accountId = this.orgId;
    return { accountId: this.orgId, email: null };
  },

  async get(path, retries = 3) {
    let lastError;
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const resp = await fetch(`${this.API_BASE}/${path}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (resp.status === 429) {
          await AIExporter.utils.sleep(1000 * (attempt + 1));
          continue;
        }
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status} for ${path}`);
        }
        return resp.json();
      } catch (err) {
        lastError = err;
        if (attempt < retries - 1) {
          await AIExporter.utils.sleep(500 * (attempt + 1));
        }
      }
    }
    throw lastError;
  },

  async listConversations(onProgress) {
    const conversations = [];
    let offset = 0;

    while (true) {
      const data = await this.get(
        `organizations/${this.orgId}/chat_conversations?limit=${this.PAGE_SIZE}&offset=${offset}`
      );
      const items =
        data.chat_conversations ||
        data.conversations ||
        data.items ||
        (Array.isArray(data) ? data : []);

      if (!items.length) break;

      for (const item of items) {
        conversations.push({
          id: item.uuid || item.id,
          title: this.cleanTitle(item.name || item.title || "Untitled"),
          create_time: this.toUnix(item.created_at),
          update_time: this.toUnix(item.updated_at),
        });
      }

      onProgress?.({
        phase: "listing",
        current: conversations.length,
        total: data.total || conversations.length + items.length,
      });

      if (items.length < this.PAGE_SIZE) break;
      offset += this.PAGE_SIZE;
      await AIExporter.utils.sleep(this.DELAY_MS);
    }

    return conversations;
  },

  cleanTitle(name) {
    return String(name || "Untitled")
      .replace(/\u00a0?Last message.*?\^archived$/i, "")
      .trim();
  },

  toUnix(iso) {
    if (!iso) return null;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms / 1000 : null;
  },

  async getConversation(id) {
    const data = await this.get(
      `organizations/${this.orgId}/chat_conversations/${id}?tree=true&rendering_mode=messages&render_all_tools=true`
    );
    return {
      ...data,
      id: data.uuid || id,
      conversation_id: data.uuid || id,
      title: this.cleanTitle(data.name),
      create_time: this.toUnix(data.created_at),
      update_time: this.toUnix(data.updated_at),
      source: "claude",
    };
  },

  async downloadFile() {
    throw new Error("Claude file download not yet supported");
  },
};
