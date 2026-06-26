/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.panel = {
  el: null,
  convo: null,
  messages: [],
  selected: new Set(),
  lastClickIndex: -1,
  panelFormats: [],

  getApi() {
    return AIExporter.platform.api;
  },

  getParser() {
    return AIExporter.platform.parser;
  },

  scrapeDomMessages() {
    const platformId = AIExporter.platform.id;
    const scraped = AIExporter.domScraper.scrapeForPlatform(platformId);
    return scraped.map((msg, index) => ({
      id: msg.id || `dom-${index}`,
      role: msg.role,
      authorName: msg.role === "user" ? "You" : AIExporter.platform.label,
      content: msg.content,
      contentType: "text",
      isReasoning: false,
      timestamp: null,
      images: [],
      attachments: [],
    }));
  },

  getConversationId() {
    return AIExporter.sidebar?.getConversationIdFromUrl?.();
  },

  injectStyles() {
    if (document.getElementById("ai-exporter-panel-styles")) return;
    const style = document.createElement("style");
    style.id = "ai-exporter-panel-styles";
    style.textContent = `
      #ai-exporter-panel-backdrop {
        position: fixed; inset: 0; z-index: 2147483645;
        background: rgba(0,0,0,0.4); display: none;
      }
      #ai-exporter-panel-backdrop.open { display: block; }
      #ai-exporter-panel {
        position: fixed; top: 0; right: 0; z-index: 2147483646;
        width: min(420px, 100vw); height: 100vh;
        background: #fff; box-shadow: -4px 0 24px rgba(0,0,0,0.15);
        display: none; flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px; color: #0d0d0d;
        transform: translateX(100%); transition: transform 0.25s ease;
      }
      #ai-exporter-panel.open { display: flex; transform: translateX(0); }
      .aie-panel-header {
        padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.2);
        display: flex; align-items: center; justify-content: space-between;
        background: linear-gradient(135deg, #10a37f, #1a7f64); color: #fff;
      }
      .aie-panel-header h2 { margin: 0; font-size: 16px; font-weight: 600; }
      .aie-panel-badge {
        font-size: 10px; background: rgba(255,255,255,0.25);
        padding: 2px 8px; border-radius: 10px; margin-left: 8px;
      }
      .aie-panel-close {
        background: rgba(255,255,255,0.2); border: none; color: #fff;
        width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 18px;
      }
      .aie-panel-toolbar {
        padding: 10px 14px; border-bottom: 1px solid #eee;
        display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
      }
      .aie-panel-toolbar button {
        font-size: 12px; padding: 5px 10px; border-radius: 6px;
        border: 1px solid #ddd; background: #f9f9f9; cursor: pointer;
      }
      .aie-panel-toolbar button:hover { background: #eee; }
      .aie-panel-formats {
        padding: 8px 14px; border-bottom: 1px solid #eee;
        max-height: 100px; overflow-y: auto;
      }
      .aie-panel-formats summary {
        font-size: 11px; font-weight: 600; color: #666;
        cursor: pointer; text-transform: uppercase; letter-spacing: 0.04em;
      }
      .aie-format-grid {
        display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;
      }
      .aie-format-grid label {
        font-size: 11px; display: flex; align-items: center; gap: 4px;
        padding: 3px 8px; background: #f5f5f5; border-radius: 4px; cursor: pointer;
      }
      .aie-panel-messages { flex: 1; overflow-y: auto; padding: 4px 0; }
      .aie-msg-row {
        display: flex; gap: 10px; padding: 10px 16px;
        border-bottom: 1px solid #f0f0f0; cursor: pointer; align-items: flex-start;
      }
      .aie-msg-row:hover { background: #f9f9f9; }
      .aie-msg-row.selected { background: #e8f5f0; }
      .aie-msg-row input { margin-top: 3px; flex-shrink: 0; }
      .aie-msg-preview { flex: 1; min-width: 0; }
      .aie-msg-role {
        font-size: 11px; font-weight: 600; text-transform: uppercase;
        color: #10a37f; margin-bottom: 2px;
      }
      .aie-msg-role.user { color: #555; }
      .aie-msg-text {
        font-size: 12px; color: #444; white-space: nowrap;
        overflow: hidden; text-overflow: ellipsis;
      }
      .aie-panel-footer {
        padding: 12px 14px; border-top: 1px solid #e5e5e5;
        display: flex; flex-direction: column; gap: 8px;
      }
      .aie-panel-footer .row { display: flex; gap: 8px; flex-wrap: wrap; }
      .aie-panel-footer button {
        flex: 1; min-width: 90px; padding: 10px; border-radius: 8px;
        border: 1px solid #ddd; background: #fff; cursor: pointer;
        font-size: 12px; font-weight: 500;
      }
      .aie-panel-footer button.primary {
        background: #10a37f; color: #fff; border-color: #10a37f;
      }
      .aie-panel-status { font-size: 11px; color: #888; text-align: center; min-height: 16px; }
      .aie-panel-loading { padding: 40px; text-align: center; color: #888; }
      .aie-hint { font-size: 11px; color: #888; padding: 0 16px 8px; }
    `;
    document.head.appendChild(style);
  },

  async create() {
    if (this.el) return;

    this.injectStyles();
    const prefs = await AIExporter.prefs.get();
    this.panelFormats = prefs.formats || AIExporter.prefs.DEFAULTS.formats;

    const formatChecks = AIExporter.prefs.PANEL_FORMATS.map(
      (f) =>
        `<label><input type="checkbox" name="panel-format" value="${f.id}" ${this.panelFormats.includes(f.id) ? "checked" : ""}/> ${f.label}</label>`
    ).join("");

    this.backdrop = document.createElement("div");
    this.backdrop.id = "ai-exporter-panel-backdrop";
    this.backdrop.addEventListener("click", () => this.close());

    this.el = document.createElement("aside");
    this.el.id = "ai-exporter-panel";
    this.el.innerHTML = `
      <div class="aie-panel-header">
        <div style="display:flex;align-items:center">
          <h2>AI Exporter</h2>
          <span class="aie-panel-badge" id="aie-group-badge" style="display:none">Group</span>
        </div>
        <button class="aie-panel-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="aie-panel-toolbar">
        <button type="button" data-action="select-all">All</button>
        <button type="button" data-action="select-none">None</button>
        <span class="aie-hint" style="padding:0;margin:0">Shift+click range</span>
      </div>
      <details class="aie-panel-formats" open>
        <summary>Export formats</summary>
        <div class="aie-format-grid">${formatChecks}</div>
      </details>
      <p class="aie-hint">Select messages to export. All checked = full chat.</p>
      <div class="aie-panel-messages" id="aie-message-list"></div>
      <div class="aie-panel-footer">
        <div class="row">
          <button type="button" class="primary" data-action="download">↓ Download ZIP</button>
          <button type="button" data-action="print-pdf">Print / PDF</button>
        </div>
        <div class="row">
          <button type="button" data-action="copy-md">Copy Markdown</button>
          <button type="button" data-action="copy-json">Copy JSON</button>
          <button type="button" data-action="copy-notion">Copy Notion</button>
        </div>
        <p class="aie-panel-status" id="aie-panel-status"></p>
      </div>
    `;

    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.el);

    this.el.querySelector(".aie-panel-close").addEventListener("click", () => this.close());
    this.el.querySelector(".aie-panel-toolbar").addEventListener("click", (e) => {
      const action = e.target.dataset?.action;
      if (action === "select-all") this.selectAll(true);
      if (action === "select-none") this.selectAll(false);
    });
    this.el.querySelector(".aie-panel-footer").addEventListener("click", (e) => {
      const action = e.target.dataset?.action;
      if (action === "download") this.downloadZip();
      if (action === "print-pdf") this.printPdf();
      if (action === "copy-md") this.copyMarkdown();
      if (action === "copy-json") this.copyJson();
      if (action === "copy-notion") this.copyNotion();
    });

    this.listEl = this.el.querySelector("#aie-message-list");
    this.statusEl = this.el.querySelector("#aie-panel-status");
    this.groupBadge = this.el.querySelector("#aie-group-badge");
  },

  getPanelFormats() {
    if (!this.el) return this.panelFormats;
    return [...this.el.querySelectorAll('input[name="panel-format"]:checked')].map(
      (el) => el.value
    );
  },

  setStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text || "";
  },

  async open() {
    await this.create();
    AIExporter.platform.init();
    const id = this.getConversationId();
    if (!id) {
      alert("Open a conversation first.");
      return;
    }

    this.backdrop.classList.add("open");
    this.el.classList.add("open");
    this.listEl.innerHTML = `<div class="aie-panel-loading">Loading conversation…</div>`;
    this.setStatus("");

    try {
      const api = this.getApi();
      const parser = this.getParser();
      if (!api?.init || !api?.getConversation) {
        throw new Error("Export API not available for this page. Refresh and try again.");
      }

      await api.init();
      this.convo = await api.getConversation(id);
      this.messages = parser.extractMessages(this.convo, {
        preserveCitations: true,
      });

      if (!this.messages.length) {
        this.messages = this.scrapeDomMessages();
        if (this.messages.length) {
          this.convo._panelMessages = this.messages;
        }
      }

      if (!this.messages.length) {
        throw new Error(
          "No messages found. Scroll the chat to load history, then reopen the panel."
        );
      }

      this.selected = new Set(this.messages.map((m) => m.id));
      this.lastClickIndex = -1;

      const summary = parser.toConversationSummary(this.convo);
      if (summary.is_group_chat) {
        this.groupBadge.style.display = "inline";
        this.groupBadge.title = `Participants: ${summary.participants.join(", ")}`;
      } else {
        this.groupBadge.style.display = "none";
      }

      this.renderList();
      this.setStatus(`${this.messages.length} messages · ${this.selected.size} selected`);
    } catch (err) {
      this.listEl.innerHTML = `<div class="aie-panel-loading">Failed: ${err.message}</div>`;
    }
  },

  close() {
    this.backdrop?.classList.remove("open");
    this.el?.classList.remove("open");
  },

  renderList() {
    if (!this.messages.length) {
      this.listEl.innerHTML = `<div class="aie-panel-loading">No messages found.</div>`;
      return;
    }

    this.listEl.innerHTML = this.messages
      .map((msg, index) => {
        const preview = (msg.content || "[media]")
          .replace(/[#*`>]/g, "")
          .replace(/\s+/g, " ")
          .slice(0, 100);
        const checked = this.selected.has(msg.id) ? "checked" : "";
        const sel = this.selected.has(msg.id) ? "selected" : "";
        const roleClass = msg.role === "user" ? "user" : "";
        const roleLabel = AIExporter.utils.getSpeakerLabel(msg);
        return `<label class="aie-msg-row ${sel}" data-index="${index}">
          <input type="checkbox" ${checked} data-id="${msg.id}" data-index="${index}"/>
          <div class="aie-msg-preview">
            <div class="aie-msg-role ${roleClass}">${AIExporter.utils.escapeHtml(roleLabel)}</div>
            <div class="aie-msg-text">${AIExporter.utils.escapeHtml(preview)}</div>
          </div>
        </label>`;
      })
      .join("");

    this.listEl.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      cb.addEventListener("click", (e) => this.onCheckboxClick(e, cb));
    });
  },

  onCheckboxClick(e, cb) {
    const index = parseInt(cb.dataset.index, 10);
    const id = cb.dataset.id;

    if (e.shiftKey && this.lastClickIndex >= 0) {
      const start = Math.min(this.lastClickIndex, index);
      const end = Math.max(this.lastClickIndex, index);
      const select = cb.checked;
      for (let i = start; i <= end; i += 1) {
        const mid = this.messages[i].id;
        if (select) this.selected.add(mid);
        else this.selected.delete(mid);
      }
      this.renderList();
    } else {
      if (cb.checked) this.selected.add(id);
      else this.selected.delete(id);
      cb.closest(".aie-msg-row")?.classList.toggle("selected", cb.checked);
    }

    this.lastClickIndex = index;
    this.setStatus(`${this.messages.length} messages · ${this.selected.size} selected`);
  },

  selectAll(on) {
    if (on) this.selected = new Set(this.messages.map((m) => m.id));
    else this.selected.clear();
    this.renderList();
    this.setStatus(`${this.messages.length} messages · ${this.selected.size} selected`);
  },

  async getExportOptions() {
    const ids = [...this.selected];
    if (!ids.length) throw new Error("Select at least one message.");
    const prefs = await AIExporter.prefs.get();
    return {
      conversationIds: [this.getConversationId()],
      selectedMessageIds: ids,
      scope: "all",
      includeFiles: prefs.includeFiles,
      preserveCitations: prefs.preserveCitations,
      includeTimestamps: prefs.includeTimestamps,
      complianceManifest: prefs.complianceManifest,
      filenameTemplate: prefs.filenameTemplate,
      formats: this.getPanelFormats(),
    };
  },

  async downloadZip() {
    try {
      const formats = this.getPanelFormats();
      if (!formats.length) throw new Error("Select at least one format.");
      this.setStatus("Exporting…");
      await AIExporter.exporter.run(await this.getExportOptions());
      this.setStatus("Download started!");
    } catch (err) {
      this.setStatus(err.message);
    }
  },

  async copyMarkdown() {
    try {
      const opts = await this.getExportOptions();
      const convo = this.getParser().filterConvoMessages(this.convo, opts.selectedMessageIds);
      await AIExporter.clipboard.copy(AIExporter.formats.markdown(convo, {}, opts));
      this.setStatus("Markdown copied!");
    } catch (err) {
      this.setStatus(err.message);
    }
  },

  async copyNotion() {
    try {
      const opts = await this.getExportOptions();
      const convo = this.getParser().filterConvoMessages(this.convo, opts.selectedMessageIds);
      await AIExporter.clipboard.copy(AIExporter.formats.notion(convo, {}, opts));
      this.setStatus("Notion format copied!");
    } catch (err) {
      this.setStatus(err.message);
    }
  },

  async copyJson() {
    try {
      const opts = await this.getExportOptions();
      const convo = this.getParser().filterConvoMessages(this.convo, opts.selectedMessageIds);
      const summary = this.getParser().toConversationSummary(convo, opts);
      await AIExporter.clipboard.copy(JSON.stringify(summary, null, 2));
      this.setStatus("JSON copied!");
    } catch (err) {
      this.setStatus(err.message);
    }
  },

  async printPdf() {
    try {
      const opts = await this.getExportOptions();
      const convo = this.getParser().filterConvoMessages(this.convo, opts.selectedMessageIds);
      const html = AIExporter.formats.html(convo, {}, opts);
      AIExporter.print.openPrintView(html, convo.title || "Chat Export");
      this.setStatus("Print dialog opened — Save as PDF");
    } catch (err) {
      this.setStatus(err.message);
    }
  },

  init() {},
};

AIExporter.panel.init();
