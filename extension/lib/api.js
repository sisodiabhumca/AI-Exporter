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
    const resp = await fetch("/api/auth/session");
    if (!resp.ok) {
      throw new Error(`ChatGPT session check failed (HTTP ${resp.status}). Refresh and sign in again.`);
    }
    let session;
    try {
      session = await resp.json();
    } catch {
      throw new Error("Could not read ChatGPT session. Refresh chatgpt.com and try again.");
    }
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

  lastListStats: null,
  lastProjectDetails: [],

  mergeProjectFiles(existing = [], incoming = []) {
    const byId = new Map();
    for (const file of [...existing, ...incoming]) {
      if (file?.id) byId.set(file.id, file);
    }
    return [...byId.values()];
  },

  parseSidebarItem(item) {
    const wrapper = item?.gizmo || {};
    const gizmo = wrapper.gizmo || wrapper;
    if (!gizmo?.id) return null;

    const name =
      gizmo.display?.name ||
      gizmo.name ||
      gizmo.title ||
      gizmo.short_url ||
      "Unnamed Project";

    const files = this.mergeProjectFiles(
      [],
      (wrapper.files || gizmo.files || []).map((file) => ({
        id: file?.file_id || file?.id,
        name: file?.name || file?.file_name || file?.display_name || null,
        type: file?.type || file?.mime_type || null,
        size: file?.size ?? null,
      }))
    ).filter((file) => file.id);

    const instructions = String(
      gizmo.instructions ||
        gizmo.prompt_instructions ||
        wrapper.instructions ||
        ""
    ).trim();

    return {
      id: gizmo.id,
      name: String(name).trim() || "Unnamed Project",
      instructions,
      files,
      gizmo,
    };
  },

  sanitizeGizmoForExport(project) {
    const gizmo = project?.gizmo || {};
    return {
      id: project.id,
      name: project.name,
      description: gizmo.display?.description || gizmo.description || null,
      instructions: project.instructions || gizmo.instructions || "",
      file_count: project.files?.length || 0,
      created_at: gizmo.created_at || null,
      updated_at: gizmo.updated_at || null,
    };
  },

  filenameFromResponse(response, fallback) {
    const disposition = response.headers?.get?.("Content-Disposition") || "";
    const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition);
    let filename = fallback || "file";
    if (match?.[1]) {
      try {
        filename = decodeURIComponent(match[1]);
      } catch {
        filename = match[1];
      }
    }
    return AIExporter.utils.sanitizeFilename(filename);
  },

  async enrichProjectDetails(project) {
    if (project.instructions && project.files?.length) return project;

    try {
      const data = await this.get(`gizmos/${encodeURIComponent(project.id)}`);
      const gizmo = data?.gizmo?.gizmo || data?.gizmo || data;
      if (!project.instructions) {
        project.instructions = String(
          gizmo?.instructions || gizmo?.prompt_instructions || data?.instructions || ""
        ).trim();
      }
      project.files = this.mergeProjectFiles(
        project.files,
        (data?.files || gizmo?.files || []).map((file) => ({
          id: file?.file_id || file?.id,
          name: file?.name || file?.file_name || null,
          type: file?.type || file?.mime_type || null,
          size: file?.size ?? null,
        }))
      );
      if (gizmo && !project.gizmo) project.gizmo = gizmo;
    } catch {
      // sidebar data is enough when detail endpoint is unavailable
    }

    return project;
  },

  async listProjects() {
    const projects = new Map();

    for (const ownedOnly of [true, false]) {
      try {
        const data = await this.get(
          `gizmos/snorlax/sidebar?conversations_per_gizmo=5&owned_only=${ownedOnly}`
        );
        for (const item of data.items || []) {
          const parsed = this.parseSidebarItem(item);
          if (!parsed) continue;

          if (projects.has(parsed.id)) {
            const existing = projects.get(parsed.id);
            existing.files = this.mergeProjectFiles(existing.files, parsed.files);
            if (!existing.instructions && parsed.instructions) {
              existing.instructions = parsed.instructions;
            }
          } else {
            projects.set(parsed.id, parsed);
          }
        }
      } catch {
        // no projects or endpoint unavailable
      }
    }

    const detailed = [];
    for (const project of projects.values()) {
      detailed.push(await this.enrichProjectDetails(project));
      await AIExporter.utils.sleep(this.DELAY_MS);
    }

    this.lastProjectDetails = detailed;
    return detailed;
  },

  normalizeListItem(item, extra = {}) {
    const id = item?.id || item?.conversation_id;
    if (!id) return null;
    return {
      id,
      title: item.title || "Untitled",
      create_time: item.create_time ?? null,
      update_time: item.update_time ?? null,
      gizmo_id: item.gizmo_id ?? extra.gizmo_id ?? null,
      project_name: item.project_name ?? extra.project_name ?? null,
      list_source: extra.list_source || item.list_source || "main",
    };
  },

  async listRegularConversations(onProgress) {
    const conversations = [];
    let offset = 0;

    while (true) {
      const data = await this.get(
        `conversations?offset=${offset}&limit=${this.PAGE_SIZE}`
      );
      const items = data.items || [];
      if (!items.length) break;

      for (const item of items) {
        const row = this.normalizeListItem(item, { list_source: "main" });
        if (row) conversations.push(row);
      }

      const total = data.total || conversations.length;
      onProgress?.({
        phase: "listing-main",
        current: conversations.length,
        total,
      });

      offset += this.PAGE_SIZE;
      if (offset >= total) break;
      await AIExporter.utils.sleep(this.DELAY_MS);
    }

    return conversations;
  },

  async listProjectConversations(project, onProgress) {
    const conversations = [];
    let cursor = "0";
    let page = 0;

    while (page < 500) {
      const path = `gizmos/${encodeURIComponent(project.id)}/conversations?cursor=${encodeURIComponent(cursor)}`;
      const data = await this.get(path);
      const items = data.items || [];

      for (const item of items) {
        const row = this.normalizeListItem(item, {
          list_source: "project",
          gizmo_id: project.id,
          project_name: project.name,
        });
        if (row) conversations.push(row);
      }

      onProgress?.({
        phase: "listing-project-chats",
        project: project.name,
        current: conversations.length,
        total: data.total || conversations.length + items.length,
      });

      if (!items.length) break;

      const nextCursor = data.next_cursor ?? data.cursor;
      const hasMore =
        data.has_more === true ||
        (data.has_more !== false && nextCursor != null && nextCursor !== cursor);

      if (!hasMore) break;
      if (nextCursor == null || nextCursor === cursor) break;

      cursor = String(nextCursor);
      page += 1;
      await AIExporter.utils.sleep(this.DELAY_MS);
    }

    return conversations;
  },

  mergeConversationLists(regular, projectConversations, projects = []) {
    const byId = new Map();

    for (const item of regular) {
      byId.set(item.id, item);
    }

    let projectOnlyCount = 0;
    for (const item of projectConversations) {
      if (!byId.has(item.id)) {
        projectOnlyCount += 1;
        byId.set(item.id, item);
        continue;
      }
      const existing = byId.get(item.id);
      if (!existing.project_name && item.project_name) {
        existing.project_name = item.project_name;
        existing.gizmo_id = item.gizmo_id;
        existing.list_source = "project";
      }
    }

    const merged = [...byId.values()].sort((a, b) => {
      const aTime = a.update_time || a.create_time || 0;
      const bTime = b.update_time || b.create_time || 0;
      return bTime - aTime;
    });

    this.lastListStats = {
      main_list_count: regular.length,
      project_list_count: projectConversations.length,
      project_only_count: projectOnlyCount,
      project_count: projects.length,
      total_unique: merged.length,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        instruction_count: p.instructions ? 1 : 0,
        knowledge_file_count: p.files?.length || 0,
      })),
    };

    return merged;
  },

  formatListProgressMessage(progress) {
    if (!progress) return "Fetching conversation list...";
    if (progress.phase === "listing-project-assets" && progress.project) {
      return `Downloading Project files: ${progress.project}`;
    }
    if (progress.phase === "listing-projects") {
      if (progress.total) {
        return `Discovering ChatGPT Projects... ${progress.current}/${progress.total}`;
      }
      return "Discovering ChatGPT Projects...";
    }
    if (progress.phase === "listing-project-chats" && progress.project) {
      return `Listing ${progress.project}... ${progress.current || 0}`;
    }
    if (progress.current != null && progress.total) {
      return `Fetching conversation list... ${progress.current}/${progress.total}`;
    }
    return "Fetching conversation list...";
  },

  async listConversations(onProgress) {
    const regular = await this.listRegularConversations((progress) =>
      onProgress?.(progress)
    );

    onProgress?.({
      phase: "listing-projects",
      current: 0,
      total: 0,
    });

    const projects = await this.listProjects();
    const projectConversations = [];

    for (let i = 0; i < projects.length; i += 1) {
      const project = projects[i];
      onProgress?.({
        phase: "listing-projects",
        current: i + 1,
        total: projects.length,
        detail: project.name,
      });

      const batch = await this.listProjectConversations(project, (progress) =>
        onProgress?.(progress)
      );
      projectConversations.push(...batch);
      await AIExporter.utils.sleep(this.DELAY_MS);
    }

    return this.mergeConversationLists(regular, projectConversations, projects);
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

  async downloadProjectKnowledgeFile(fileId, fallbackName) {
    try {
      return await this.downloadFile(fileId, fallbackName);
    } catch {
      // try direct file endpoints used for project knowledge uploads
    }

    const candidates = [
      `files/${encodeURIComponent(fileId)}?download=1`,
      `files/${encodeURIComponent(fileId)}`,
      `files/${encodeURIComponent(fileId)}/download`,
    ];

    let lastError;
    for (const path of candidates) {
      try {
        const resp = await fetch(`${this.API_BASE}/${path}`, {
          headers: this.headers,
        });
        if (!resp.ok) {
          lastError = new Error(`HTTP ${resp.status} for ${path}`);
          continue;
        }

        const data = new Uint8Array(await resp.arrayBuffer());
        let filename = this.filenameFromResponse(resp, fallbackName || fileId);
        const contentType = resp.headers.get("content-type") || "";

        if (!filename.includes(".") && contentType) {
          const mime = contentType.split(";")[0].trim();
          const ext = this.MIME_TO_EXT[mime];
          if (ext) filename += ext;
        }

        return { filename, data };
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error(`Could not download project file ${fileId}`);
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
