/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.exporter = {
  DEFAULT_FORMATS: [
    "universal",
    "markdown",
    "csv",
    "html",
    "notion",
    "obsidian",
    "rag-jsonl",
    "claude",
    "claude-project",
    "gemini",
    "gemini-import",
  ],

  api() {
    return AIExporter.platform.api;
  },

  parser() {
    return AIExporter.platform.parser;
  },

  async defaultOptions(overrides = {}) {
    const prefs = await AIExporter.prefs.get();
    return {
      scope: "all",
      searchQuery: "",
      formats: overrides.formats || [...prefs.formats],
      includeFiles: overrides.includeFiles ?? prefs.includeFiles,
      includeTimestamps: overrides.includeTimestamps ?? prefs.includeTimestamps,
      preserveCitations: overrides.preserveCitations ?? prefs.preserveCitations,
      complianceManifest: overrides.complianceManifest ?? prefs.complianceManifest,
      filenameTemplate: overrides.filenameTemplate ?? prefs.filenameTemplate,
      ragChunkSize: overrides.ragChunkSize ?? prefs.ragChunkSize ?? 2000,
      conversationIds: null,
      selectedMessageIds: null,
      ...overrides,
    };
  },

  async getLastExportTime() {
    const result = await AIExporter.browser.storageGet(["lastExportTime"]);
    return result.lastExportTime || 0;
  },

  buildFname(convo, options) {
    const id = convo.conversation_id || convo.id || "unknown";
    const title = convo.title || "Untitled";
    return AIExporter.utils.applyFilenameTemplate(options.filenameTemplate, {
      title,
      id: id.slice(0, 8),
      date: AIExporter.utils.formatDateShort(),
    });
  },

  prepareConvo(convo, options) {
    if (options.selectedMessageIds?.length) {
      return AIExporter.parser.filterConvoMessages(
        convo,
        options.selectedMessageIds
      );
    }
    return convo;
  },

  formatOptions(options) {
    return {
      selectedMessageIds: options.selectedMessageIds,
      preserveCitations: options.preserveCitations,
      includeTimestamps: options.includeTimestamps,
    };
  },

  async processConversation(convo, options, fname) {
    const zipEntries = [];
    const fileMap = {};
    const prepared = this.prepareConvo(convo, options);
    const fmtOpts = this.formatOptions(options);

    if (options.includeFiles && AIExporter.platform.id === "chatgpt") {
      const fileRefs = AIExporter.parser.extractFileReferences(prepared);
      const usedNames = new Set();

      for (const ref of fileRefs) {
        try {
          const { filename: dlName, data } = await this.api().downloadFile(
            ref.fileId,
            ref.filename
          );
          const actualName = AIExporter.utils.deduplicateFilename(
            dlName || ref.filename,
            usedNames
          );
          zipEntries.push({ path: `files/${fname}/${actualName}`, data });
          fileMap[ref.fileId] = `../files/${fname}/${actualName}`;
          await AIExporter.utils.sleep(this.api().DELAY_MS);
        } catch {
          // skip failed file downloads
        }
      }
    }

    if (options.formats.includes("raw")) {
      zipEntries.push({
        path: `raw/${fname}.json`,
        data: JSON.stringify(prepared, null, 2),
      });
    }

    if (options.formats.includes("markdown")) {
      zipEntries.push({
        path: `markdown/${fname}.md`,
        data: AIExporter.formats.markdown(prepared, fileMap, fmtOpts),
      });
    }

    if (options.formats.includes("html")) {
      zipEntries.push({
        path: `html/${fname}.html`,
        data: AIExporter.formats.html(prepared, fileMap, fmtOpts),
      });
    }

    if (options.formats.includes("notion")) {
      zipEntries.push({
        path: `notion/${fname}.md`,
        data: AIExporter.formats.notion(prepared, fileMap, fmtOpts),
      });
    }

    if (options.formats.includes("obsidian")) {
      zipEntries.push({
        path: `obsidian/${fname}.md`,
        data: AIExporter.formats.obsidian(prepared, fileMap, fmtOpts),
      });
    }

    if (options.formats.includes("csv")) {
      const summary = this.parser().toConversationSummary(prepared, fmtOpts);
      zipEntries.push({
        path: `csv/${fname}.csv`,
        data: AIExporter.formats.csvRowsForSummary(summary),
      });
    }

    if (options.formats.includes("claude")) {
      const summary = this.parser().toConversationSummary(prepared, fmtOpts);
      zipEntries.push({
        path: `claude/${fname}.json`,
        data: JSON.stringify(
          {
            title: summary.title,
            created_at: summary.created_at,
            is_group_chat: summary.is_group_chat,
            messages: summary.messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((m) => ({
                role: m.role,
                content: m.content,
                author: m.authorName || null,
              })),
          },
          null,
          2
        ),
      });
    }

    if (options.formats.includes("claude-project")) {
      const projectFiles = AIExporter.formats.claudeProjectFiles(
        prepared,
        fileMap
      );
      for (const file of projectFiles) {
        zipEntries.push({
          path: `claude-project/knowledge/${file.filename}`,
          data: file.content,
        });
      }
    }

    if (options.formats.includes("gemini-import")) {
      const geminiFiles = AIExporter.formats.geminiImportFiles(prepared);
      for (const file of geminiFiles) {
        zipEntries.push({
          path: `gemini-import/${file.path}`,
          data: file.content,
        });
      }
    }

    return { zipEntries, fileMap, htmlBody: options.formats.includes("html")
      ? AIExporter.formats.html(prepared, fileMap, fmtOpts) : null,
      title: prepared.title || "Untitled", fname };
  },

  appendAggregateFormats(zipEntries, fullConversations, options, htmlEntries = []) {
    const prepared = fullConversations.map((c) =>
      this.prepareConvo(c, options)
    );
    const fmtOpts = this.formatOptions(options);

    if (options.formats.includes("universal")) {
      zipEntries.push({
        path: "universal/conversations.json",
        data: JSON.stringify(
          AIExporter.formats.universal(prepared, {
            accountId: this.api().accountId,
            exporterVersion: "1.5.0",
            source: AIExporter.platform.id,
          }),
          null,
          2
        ),
      });
    }

    if (options.formats.includes("openai")) {
      zipEntries.push({
        path: "openai/conversations.json",
        data: JSON.stringify(
          AIExporter.formats.openai(prepared),
          null,
          2
        ),
      });
    }

    if (options.formats.includes("gemini")) {
      zipEntries.push({
        path: "gemini/conversations.json",
        data: JSON.stringify(
          AIExporter.formats.gemini(prepared),
          null,
          2
        ),
      });
    }

    if (options.formats.includes("csv") && prepared.length) {
      zipEntries.push({
        path: "csv/all-conversations.csv",
        data: AIExporter.formats.csv(prepared),
      });
    }

    if (options.formats.includes("html") && htmlEntries.length > 1) {
      zipEntries.push({
        path: "html/index.html",
        data: AIExporter.formats.htmlBundle(htmlEntries),
      });
    }

    if (options.formats.includes("claude-project") && prepared.length) {
      zipEntries.push({
        path: "claude-project/PROJECT_SETUP.md",
        data: AIExporter.formats.claudeProjectSetup(prepared.length),
      });
      zipEntries.push({
        path: "claude-project/custom-instructions.txt",
        data: AIExporter.formats.claudeProjectInstructions(),
      });
      zipEntries.push({
        path: "claude-project/manifest.json",
        data: JSON.stringify(
          AIExporter.formats.claudeProjectManifest(prepared),
          null,
          2
        ),
      });
    }

    if (options.formats.includes("gemini-import") && prepared.length) {
      zipEntries.push({
        path: "gemini-import/GEMINI_SETUP.md",
        data: AIExporter.formats.geminiImportSetup(prepared.length),
      });
      zipEntries.push({
        path: "gemini-import/manifest.json",
        data: JSON.stringify(
          AIExporter.formats.geminiImportManifest(prepared),
          null,
          2
        ),
      });
      zipEntries.push({
        path: "gemini-import/api/conversations.json",
        data: JSON.stringify(
          AIExporter.formats.gemini(prepared),
          null,
          2
        ),
      });
    }

    if (options.formats.includes("rag-jsonl") && prepared.length) {
      zipEntries.push({
        path: "rag/chunks.jsonl",
        data: AIExporter.formats.ragJsonl(prepared, {
          ...fmtOpts,
          ragChunkSize: options.ragChunkSize,
          ragChunkOverlap: options.ragChunkOverlap,
          ragChunkStrategy: options.ragChunkStrategy,
        }),
      });
      zipEntries.push({
        path: "rag/README.md",
        data: `# RAG JSONL Export

One JSON object per line, ready for embedding pipelines.

Regenerate with custom chunking:
\`\`\`bash
node tools/prepare-rag-jsonl.mjs your-export.zip --chunk-size 1500
\`\`\`
`,
      });
    }

    zipEntries.push({
      path: "IMPORT_GUIDE.md",
      data: AIExporter.formats.importGuide(),
    });

    return zipEntries;
  },

  filterConversations(list, options) {
    let filtered = list;

    if (options.scope === "current") {
      const id = AIExporter.platform.getConversationIdFromUrl?.();
      if (!id) {
        return Promise.reject(
          new Error("Open a conversation first, or use the Export panel.")
        );
      }
      filtered = list.filter((c) => c.id === id);
      if (!filtered.length) {
        filtered = [{ id, title: "Current conversation" }];
      }
      return Promise.resolve(filtered);
    }

    if (options.conversationIds?.length) {
      const ids = new Set(options.conversationIds);
      filtered = list.filter((c) => ids.has(c.id));
    }

    if (options.searchQuery) {
      const q = options.searchQuery.toLowerCase();
      filtered = filtered.filter((c) =>
        (c.title || "").toLowerCase().includes(q)
      );
    }

    if (options.scope === "new") {
      return this.getLastExportTime().then((lastExport) =>
        filtered.filter(
          (c) => (c.update_time || c.create_time || 0) > lastExport
        )
      );
    }

    return Promise.resolve(filtered);
  },

  async run(options = {}) {
    const opts = await this.defaultOptions(options);
    const ui = AIExporter.ui.show();
    const zipEntries = [];
    const fullConversations = [];
    const htmlEntries = [];
    let failed = 0;

    try {
      ui.set(`Connecting to ${AIExporter.platform.label}...`);
      const account = await this.api().init();
      ui.set(
        "Connected",
        5,
        account.email
          ? `${account.email}${account.accountId ? " (workspace)" : ""}`
          : ""
      );

      if (ui.isCancelled()) throw new Error("Cancelled");

      let list;
      if (opts.scope === "current") {
        const id = AIExporter.platform.getConversationIdFromUrl?.();
        if (!id) throw new Error("Open a conversation first, or use the Export panel.");
        list = [{ id, title: "Current conversation" }];
      } else if (opts.conversationIds?.length === 1) {
        list = [{ id: opts.conversationIds[0], title: "Current conversation" }];
      } else if (opts.conversationIds?.length > 1) {
        list = opts.conversationIds.map((id) => ({ id, title: id.slice(0, 8) }));
      } else {
        list = await this.api().listConversations((progress) => {
          const pct = Math.round((progress.current / progress.total) * 15);
          ui.set(
            `Fetching conversation list... ${progress.current}/${progress.total}`,
            pct
          );
        });
      }

      if (!list.length) {
        ui.done("No conversations found.");
        return { success: true, count: 0 };
      }

      const filtered = await this.filterConversations(list, opts);
      const total = filtered.length;

      if (!total) {
        ui.done("No conversations match your filters.");
        return { success: true, count: 0 };
      }

      const selectionNote = opts.selectedMessageIds?.length
        ? ` (${opts.selectedMessageIds.length} msgs)`
        : "";
      ui.set(`Downloading ${total} chat${total === 1 ? "" : "s"}...${selectionNote}`, 15);

      let completed = 0;
      await AIExporter.utils.mapPool(filtered, 3, async (item) => {
        if (ui.isCancelled()) return;

        const { id, title: rawTitle } = item;
        const title = rawTitle || "Untitled";

        try {
          const convo = await this.api().getConversation(id);
          if (!convo.title && title !== id.slice(0, 8)) convo.title = title;

          fullConversations.push(convo);
          const fname = this.buildFname(convo, opts);
          const result = await this.processConversation(convo, opts, fname);
          zipEntries.push(...result.zipEntries);

          if (result.htmlBody) {
            htmlEntries.push({ title: result.title, html: result.htmlBody, fname });
          }
        } catch {
          failed += 1;
        }

        completed += 1;
        const pct = 15 + Math.round((completed / total) * 70);
        ui.set(`Downloading ${completed} of ${total}`, pct, title);
        await AIExporter.utils.sleep(this.api().DELAY_MS);
      });

      if (ui.isCancelled()) throw new Error("Cancelled");

      ui.set("Building export files...", 88);
      this.appendAggregateFormats(zipEntries, fullConversations, opts, htmlEntries);

      if (opts.complianceManifest) {
        ui.set("Generating compliance manifest...", 92);
        const manifest = await AIExporter.compliance.buildManifest(zipEntries, {
          accountId: this.api().accountId,
          conversationCount: fullConversations.length,
          exporterVersion: "1.5.0",
          platform: AIExporter.platform.id,
        });
        zipEntries.push({
          path: "compliance/manifest.json",
          data: JSON.stringify(manifest, null, 2),
        });
        zipEntries.push({
          path: "compliance/README.md",
          data: AIExporter.compliance.complianceReadme(manifest),
        });
      }

      ui.set("Creating ZIP archive...", 95);
      const blob = AIExporter.zip.buildBlob(zipEntries);
      const date = AIExporter.utils.formatDateShort();
      const suffix =
        opts.conversationIds?.length === 1 && fullConversations[0]
          ? `-${this.buildFname(fullConversations[0], opts)}`
          : "";
      const prefix = AIExporter.platform.exportPrefix;
      AIExporter.zip.downloadBlob(blob, `${prefix}-export${suffix}-${date}.zip`);

      await AIExporter.browser.storageSet({ lastExportTime: Date.now() / 1000 });
      await AIExporter.prefs.save({
        formats: opts.formats,
        includeFiles: opts.includeFiles,
        complianceManifest: opts.complianceManifest,
        filenameTemplate: opts.filenameTemplate,
      });

      const succeeded = total - failed;
      let msg = `Done! Exported ${succeeded} conversation${succeeded === 1 ? "" : "s"}.`;
      if (failed) msg += ` (${failed} failed)`;
      ui.done(msg);

      return { success: true, count: succeeded, failed };
    } catch (err) {
      if (err.message === "Cancelled") {
        ui.error("Export cancelled.");
        return { success: false, cancelled: true };
      }
      ui.error(`Export failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  runSingle(conversationId, options = {}) {
    return this.run({
      ...options,
      scope: "all",
      conversationIds: [conversationId],
    });
  },
};
