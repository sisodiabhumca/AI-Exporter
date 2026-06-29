/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.apiDeepseek = {
  API_BASE: "https://chat.deepseek.com/api/v0",
  DELAY_MS: 400,
  accountId: null,
  token: null,

  getToken() {
    try {
      const raw = localStorage.getItem("userToken");
      if (!raw) return null;
      return raw.startsWith('"') ? JSON.parse(raw) : raw;
    } catch {
      return localStorage.getItem("userToken");
    }
  },

  headers() {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
    };
  },

  async init() {
    this.token = this.getToken();
    if (!this.token) {
      throw new Error("Not logged in. Please sign in to chat.deepseek.com first.");
    }
    this.accountId = "deepseek";
    return { accountId: this.accountId, email: null };
  },

  async get(path, retries = 3) {
    let lastError;
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const resp = await fetch(`${this.API_BASE}/${path}`, {
          headers: this.headers(),
          credentials: "include",
        });
        if (resp.status === 429) {
          await AIExporter.utils.sleep(1000 * (attempt + 1));
          continue;
        }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
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
    const pageSize = 100;
    let offset = 0;

    while (offset < 10000) {
      const data = await this.get(
        `chat_session/fetch_page?count=${pageSize}&offset=${offset}`
      );
      const sessions =
        data?.data?.biz_data?.chat_sessions ||
        data?.data?.chat_sessions ||
        [];

      if (!sessions.length) break;

      conversations.push(
        ...sessions.map((s) => ({
          id: s.id || s.chat_session_id,
          title: s.title || "Untitled",
          create_time: s.inserted_at ? Date.parse(s.inserted_at) / 1000 : null,
          update_time: s.updated_at ? Date.parse(s.updated_at) / 1000 : null,
        }))
      );

      onProgress?.({
        phase: "listing",
        current: conversations.length,
        total: conversations.length,
      });

      if (sessions.length < pageSize) break;
      offset += sessions.length;
    }

    return conversations;
  },

  async getConversation(id) {
    const data = await this.get(
      `chat/history_messages?chat_session_id=${encodeURIComponent(id)}`
    );
    const rawMessages =
      data?.data?.biz_data?.messages || data?.data?.messages || [];

    return {
      id,
      conversation_id: id,
      title:
        rawMessages.find((m) => m.title)?.title ||
        conversationsTitleFromMessages(rawMessages) ||
        "Untitled",
      source: "deepseek",
      create_time: null,
      update_time: null,
      _deepseekMessages: rawMessages,
    };
  },

  async downloadFile() {
    throw new Error("DeepSeek file download not yet supported");
  },
};

function conversationsTitleFromMessages(messages) {
  const user = messages.find((m) => m.role === "user" || m.message_type === "user");
  if (!user) return null;
  const text = user.content || user.text || "";
  return text.slice(0, 80) || null;
}
