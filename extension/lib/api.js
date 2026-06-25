/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.api = {
  API_BASE: "/backend-api",
  PAGE_SIZE: 100,
  DELAY_MS: 400,

  deviceId: null,
  token: null,
  accountId: null,
  headers: null,

  async init() {
    this.deviceId = crypto.randomUUID();
    const session = await fetch("/api/auth/session").then((r) => r.json());
    this.token = session.accessToken;
    if (!this.token) {
      throw new Error("Not logged in. Please sign in to ChatGPT first.");
    }

    this.accountId = await this.detectAccountId(session);
    this.headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${this.token}`,
      "Oai-Device-Id": this.deviceId,
      "Oai-Language": "en-US",
    };

    if (this.accountId) {
      this.headers["ChatGPT-Account-Id"] = this.accountId;
    }

    return {
      accountId: this.accountId,
      email: session.user?.email || null,
    };
  },

  async detectAccountId(session) {
    const candidates = [];

    if (session.account?.id) candidates.push(session.account.id);
    if (session.user?.id) candidates.push(session.user.id);

    try {
      const stored = localStorage.getItem("oai/apps/lastAccountId");
      if (stored) candidates.push(stored);
    } catch {
      // ignore
    }

    try {
      const check = await fetch(
        `${this.API_BASE}/accounts/check/v4-2023-04-27`,
        { headers: this.headersForTokenOnly() }
      );
      if (check.ok) {
        const data = await check.json();
        const accounts = data.accounts || data.account_listing || [];
        for (const acc of accounts) {
          if (acc.account?.id) candidates.push(acc.account.id);
          if (acc.id) candidates.push(acc.id);
        }
        const defaultAccount =
          accounts.find((a) => a.account?.is_default)?.account?.id ||
          accounts.find((a) => a.is_default)?.id;
        if (defaultAccount) candidates.unshift(defaultAccount);
      }
    } catch {
      // ignore — personal accounts may not need this
    }

    try {
      const payload = JSON.parse(atob(this.token.split(".")[1]));
      const authClaim = payload["https://api.openai.com/auth"] || {};
      if (authClaim.chatgpt_account_id) {
        candidates.unshift(authClaim.chatgpt_account_id);
      }
      if (authClaim.account_id) candidates.push(authClaim.account_id);
    } catch {
      // ignore JWT parse errors
    }

    const unique = [...new Set(candidates.filter(Boolean))];
    return unique[0] || null;
  },

  headersForTokenOnly() {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${this.token}`,
      "Oai-Device-Id": this.deviceId,
      "Oai-Language": "en-US",
    };
  },

  async get(path, retries = 3) {
    let lastError;
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const resp = await fetch(`${this.API_BASE}/${path}`, {
          headers: this.headers,
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

  async fetchBinary(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = new Uint8Array(await resp.arrayBuffer());
    const contentType = resp.headers.get("content-type") || "";
    return { data, contentType };
  },

  async listConversations(onProgress) {
    const conversations = [];
    let offset = 0;

    while (true) {
      const data = await this.get(
        `conversations?offset=${offset}&limit=${this.PAGE_SIZE}`
      );
      const items = data.items || [];
      if (!items.length) break;

      conversations.push(...items);
      const total = data.total || conversations.length;
      onProgress?.({
        phase: "listing",
        current: conversations.length,
        total,
      });

      offset += this.PAGE_SIZE;
      if (offset >= total) break;
      await AIExporter.utils.sleep(this.DELAY_MS);
    }

    return conversations;
  },

  async getConversation(id) {
    return this.get(`conversation/${id}`);
  },

  MIME_TO_EXT: {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "text/html": ".html",
    "text/csv": ".csv",
    "application/json": ".json",
    "application/zip": ".zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
  },

  async downloadFile(fileId, fallbackName) {
    const meta = await this.get(`files/download/${fileId}`);
    if (!meta.download_url) throw new Error("No download_url");

    const { data, contentType } = await this.fetchBinary(meta.download_url);
    let filename = meta.file_name || fallbackName || fileId;

    if (!filename.includes(".") && contentType) {
      const mime = contentType.split(";")[0].trim();
      const ext = this.MIME_TO_EXT[mime];
      if (ext) filename += ext;
    }

    return { filename, data };
  },
};
