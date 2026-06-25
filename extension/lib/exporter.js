/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.exporter = {
  DEFAULT_FORMATS: [
    "universal",
    "markdown",
    "claude",
    "claude-project",
    "gemini",
    "gemini-import",
  ],

  defaultOptions(overrides = {}) {
    return {
      scope: "all",
      searchQuery: "",
      formats: [...this.DEFAULT_FORMATS],
      includeFiles: true,
      conversationIds: null,
      ...overrides,
    };
  },

  async getLastExportTime() {
    const result = await AIExporter.browser.storageGet(["lastExportTime"]);
    return result.lastExportTime || 0;
  },

  async processConversation(convo, options, fname) {
    const zipEntries = [];
    const fileMap = {};

    if (options.includeFiles) {
      const fileRefs = AIExporter.parser.extractFileReferences(convo);
      const usedNames = new Set();

      for (const ref of fileRefs) {
        try {
          const { filename: dlName, data } = await AIExporter.api.downloadFile(
            ref.fileId,
            ref.filename
          );
          const actualName = AIExporter.utils.deduplicateFilename(
            dlName || ref.filename,
            usedNames
          );
          zipEntries.push({ path: `files/${fname}/${actualName}`, data });
          fileMap[ref.fileId] = `../files/${fname}/${actualName}`;
          await AIExporter.utils.sleep(AIExporter.api.DELAY_MS);
        } catch {
          // skip failed file downloads
        }
      }
    }

    if (options.formats.includes("raw")) {
      zipEntries.push({
        path: `raw/${fname}.json`,
        data: JSON.stringify(convo, null, 2),
      });
    }

    if (options.formats.includes("markdown")) {
      zipEntries.push({
        path: `markdown/${fname}.md`,
        data: AIExporter.formats.markdown(convo, fileMap),
      });
    }

    if (options.formats.includes("claude")) {
      const summary = AIExporter.parser.toConversationSummary(convo);
      zipEntries.push({
        path: `claude/${fname}.json`,
        data: JSON.stringify(
          {
            title: summary.title,
            created_at: summary.created_at,
            messages: summary.messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((m) => ({ role: m.role, content: m.content })),
          },
          null,
          2
        ),
      });
    }

    if (options.formats.includes("claude-project")) {
      const projectFiles = AIExporter.formats.claudeProjectFiles(convo, fileMap);
      for (const file of projectFiles) {
        zipEntries.push({
          path: `claude-project/knowledge/${file.filename}`,
          data: file.content,
        });
      }
    }

    if (options.formats.includes("gemini-import")) {
      const geminiFiles = AIExporter.formats.geminiImportFiles(convo);
      for (const file of geminiFiles) {
        zipEntries.push({
          path: `gemini-import/${file.path}`,
          data: file.content,
        });
      }
    }

    return zipEntries;
  },

  appendAggregateFormats(zipEntries, fullConversations, options) {
    if (options.formats.includes("universal")) {
      zipEntries.push({
        path: "universal/conversations.json",
        data: JSON.stringify(
          AIExporter.formats.universal(fullConversations, {
            accountId: AIExporter.api.accountId,
            exporterVersion: "1.2.0",
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
          AIExporter.formats.openai(fullConversations),
          null,
          2
        ),
      });
    }

    if (options.formats.includes("gemini")) {
      zipEntries.push({
        path: "gemini/conversations.json",
        data: JSON.stringify(
          AIExporter.formats.gemini(fullConversations),
          null,
          2
        ),
      });
    }

    if (options.formats.includes("claude-project") && fullConversations.length) {
      zipEntries.push({
        path: "claude-project/PROJECT_SETUP.md",
        data: AIExporter.formats.claudeProjectSetup(fullConversations.length),
      });
      zipEntries.push({
        path: "claude-project/custom-instructions.txt",
        data: AIExporter.formats.claudeProjectInstructions(),
      });
      zipEntries.push({
        path: "claude-project/manifest.json",
        data: JSON.stringify(
          AIExporter.formats.claudeProjectManifest(fullConversations),
          null,
          2
        ),
      });
    }

    if (options.formats.includes("gemini-import") && fullConversations.length) {
      zipEntries.push({
        path: "gemini-import/GEMINI_SETUP.md",
        data: AIExporter.formats.geminiImportSetup(fullConversations.length),
      });
      zipEntries.push({
        path: "gemini-import/manifest.json",
        data: JSON.stringify(
          AIExporter.formats.geminiImportManifest(fullConversations),
          null,
          2
        ),
      });
      zipEntries.push({
        path: "gemini-import/api/conversations.json",
        data: JSON.stringify(
          AIExporter.formats.gemini(fullConversations),
          null,
          2
        ),
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
      const id = AIExporter.sidebar?.getConversationIdFromUrl?.();
      if (!id) {
        return Promise.reject(
          new Error("Open a conversation first, or use the Export chat button.")
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
    const opts = this.defaultOptions(options);
    const ui = AIExporter.ui.show();
    const zipEntries = [];
    const fullConversations = [];
    let failed = 0;

    try {
      ui.set("Connecting to ChatGPT...");
      const account = await AIExporter.api.init();
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
        const id = AIExporter.sidebar?.getConversationIdFromUrl?.();
        if (!id) {
          throw new Error(
            "Open a conversation first, or use the Export chat button."
          );
        }
        list = [{ id, title: "Current conversation" }];
      } else if (opts.conversationIds?.length === 1) {
        list = [{ id: opts.conversationIds[0], title: "Current conversation" }];
      } else if (opts.conversationIds?.length > 1) {
        list = opts.conversationIds.map((id) => ({ id, title: id.slice(0, 8) }));
      } else {
        list = await AIExporter.api.listConversations((progress) => {
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

      ui.set(`Downloading ${total} conversation${total === 1 ? "" : "s"}...`, 15);

      for (let i = 0; i < total; i += 1) {
        if (ui.isCancelled()) throw new Error("Cancelled");

        const { id, title: rawTitle } = filtered[i];
        const title = rawTitle || "Untitled";
        const fname = `${AIExporter.utils.sanitizeFilename(title)}_${id.slice(0, 8)}`;
        const pct = 15 + Math.round(((i + 1) / total) * 70);

        ui.set(`Downloading ${i + 1} of ${total}`, pct, title);

        try {
          const convo = await AIExporter.api.getConversation(id);
          if (!convo.title && title !== id.slice(0, 8)) {
            convo.title = title;
          }
          fullConversations.push(convo);
          const entries = await this.processConversation(convo, opts, fname);
          zipEntries.push(...entries);
        } catch {
          failed += 1;
        }

        await AIExporter.utils.sleep(AIExporter.api.DELAY_MS);
      }

      if (ui.isCancelled()) throw new Error("Cancelled");

      ui.set("Building export files...", 88);
      this.appendAggregateFormats(zipEntries, fullConversations, opts);

      ui.set("Creating ZIP archive...", 95);
      const blob = AIExporter.zip.buildBlob(zipEntries);
      const date = new Date().toISOString().slice(0, 10);
      const suffix =
        opts.conversationIds?.length === 1
          ? `-${AIExporter.utils.sanitizeFilename(fullConversations[0]?.title || "chat")}`
          : "";
      AIExporter.zip.downloadBlob(blob, `chatgpt-export${suffix}-${date}.zip`);

      await AIExporter.browser.storageSet({ lastExportTime: Date.now() / 1000 });

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
    return this.run(
      this.defaultOptions({
        ...options,
        scope: "all",
        conversationIds: [conversationId],
      })
    );
  },
};
