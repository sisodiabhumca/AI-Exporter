/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.exporter = {
  exportInProgress: false,

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
      ragChunkStrategy: overrides.ragChunkStrategy ?? prefs.ragChunkStrategy ?? "turn-pair",
      includeToc: overrides.includeToc ?? prefs.includeToc ?? false,
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

  attachListMetadata(convo, item) {
    if (item.project_name) {
      convo.project_name = item.project_name;
      convo.gizmo_id = item.gizmo_id;
      convo.list_source = item.list_source || "project";
      convo._aiExporterPathPrefix = `projects/${AIExporter.utils.sanitizeFilename(item.project_name)}/`;

      const project = AIExporter.platform.id === "chatgpt"
        ? this.api().lastProjectDetails?.find((p) => p.id === item.gizmo_id)
        : null;
      if (project?.instructions) {
        convo.project_instructions = project.instructions;
      }
    } else if (item.list_source) {
      convo.list_source = item.list_source;
    }
    if (!convo.create_time && item.create_time) convo.create_time = item.create_time;
    if (!convo.update_time && item.update_time) convo.update_time = item.update_time;
    return convo;
  },

  async appendChatGptProjectAssets(zipEntries, ui) {
    if (AIExporter.platform.id !== "chatgpt") {
      return { knowledgeFiles: 0, errors: [] };
    }

    const api = this.api();
    const projects = api.lastProjectDetails || [];
    if (!projects.length) return { knowledgeFiles: 0, errors: [] };

    const errors = [];
    let knowledgeFiles = 0;

    for (const project of projects) {
      const slug = AIExporter.utils.sanitizeFilename(project.name);
      const prefix = `projects/${slug}/`;

      ui?.set?.(
        this.formatListProgress({
          phase: "listing-project-assets",
          project: project.name,
        }),
        86,
        project.name
      );

      zipEntries.push({
        path: `${prefix}project.json`,
        data: JSON.stringify(api.sanitizeGizmoForExport(project), null, 2),
      });

      if (project.instructions) {
        zipEntries.push({
          path: `${prefix}custom-instructions.txt`,
          data: project.instructions,
        });
        zipEntries.push({
          path: `${prefix}instructions.md`,
          data: `# ${project.name} — Project instructions\n\n${project.instructions}\n`,
        });
      }

      const manifestFiles = [];
      const usedNames = new Set();

      for (const file of project.files || []) {
        try {
          const { filename, data } = await api.downloadProjectKnowledgeFile(
            file.id,
            file.name
          );
          const actualName = AIExporter.utils.deduplicateFilename(
            filename || file.name || file.id,
            usedNames
          );
          zipEntries.push({
            path: `${prefix}knowledge-files/${actualName}`,
            data,
          });
          manifestFiles.push({
            id: file.id,
            filename: actualName,
            original_name: file.name,
            type: file.type,
            size: file.size,
          });
          knowledgeFiles += 1;
          await AIExporter.utils.sleep(api.DELAY_MS);
        } catch (err) {
          errors.push({
            project_id: project.id,
            project_name: project.name,
            file_id: file.id,
            filename: file.name,
            error: err?.message || String(err),
          });
        }
      }

      if (manifestFiles.length || errors.some((e) => e.project_id === project.id)) {
        zipEntries.push({
          path: `${prefix}knowledge-manifest.json`,
          data: JSON.stringify(
            {
              project_id: project.id,
              project_name: project.name,
              exported_at: new Date().toISOString(),
              files: manifestFiles,
              errors: errors.filter((e) => e.project_id === project.id),
            },
            null,
            2
          ),
        });
      }
    }

    if (errors.length) {
      zipEntries.push({
        path: "chatgpt/project-knowledge-errors.json",
        data: JSON.stringify(
          {
            exported_at: new Date().toISOString(),
            errors,
          },
          null,
          2
        ),
      });
    }

    return { knowledgeFiles, errors };
  },

  formatListProgress(progress) {
    if (AIExporter.platform.id === "chatgpt" && AIExporter.api.formatListProgressMessage) {
      return AIExporter.api.formatListProgressMessage(progress);
    }
    if (progress?.current != null && progress?.total) {
      return `Fetching conversation list... ${progress.current}/${progress.total}`;
    }
    return "Fetching conversation list...";
  },

  listProgressPercent(progress) {
    if (!progress?.total) return 5;
    return Math.min(15, Math.round((progress.current / progress.total) * 15));
  },

  formatOptions(options) {
    return {
      selectedMessageIds: options.selectedMessageIds,
      preserveCitations: options.preserveCitations,
      includeTimestamps: options.includeTimestamps,
      includeToc: options.includeToc,
    };
  },

  async processConversation(convo, options, fname, pathPrefix = "") {
    const zipEntries = [];
    const fileMap = {};
    const fileDownloadFailures = [];
    const prepared = this.prepareConvo(convo, options);
    const fmtOpts = this.formatOptions(options);
    const prefix = pathPrefix || convo._aiExporterPathPrefix || "";

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
          zipEntries.push({ path: `${prefix}files/${fname}/${actualName}`, data });
          fileMap[ref.fileId] = `../files/${fname}/${actualName}`;
          await AIExporter.utils.sleep(this.api().DELAY_MS);
        } catch (err) {
          fileDownloadFailures.push({
            fileId: ref.fileId,
            filename: ref.filename,
            error: err?.message || String(err),
          });
        }
      }

      if (fileDownloadFailures.length) {
        zipEntries.push({
          path: `${prefix}files/${fname}/_download-warnings.json`,
          data: JSON.stringify(fileDownloadFailures, null, 2),
        });
      }
    }

    if (options.formats.includes("raw")) {
      zipEntries.push({
        path: `${prefix}raw/${fname}.json`,
        data: JSON.stringify(prepared, null, 2),
      });
    }

    if (options.formats.includes("markdown")) {
      zipEntries.push({
        path: `${prefix}markdown/${fname}.md`,
        data: AIExporter.formats.markdown(prepared, fileMap, fmtOpts),
      });
    }

    if (options.formats.includes("html")) {
      zipEntries.push({
        path: `${prefix}html/${fname}.html`,
        data: AIExporter.formats.html(prepared, fileMap, fmtOpts),
      });
    }

    if (options.formats.includes("notion")) {
      zipEntries.push({
        path: `${prefix}notion/${fname}.md`,
        data: AIExporter.formats.notion(prepared, fileMap, fmtOpts),
      });
    }

    if (options.formats.includes("obsidian")) {
      zipEntries.push({
        path: `${prefix}obsidian/${fname}.md`,
        data: AIExporter.formats.obsidian(prepared, fileMap, fmtOpts),
      });
    }

    if (options.formats.includes("csv")) {
      const summary = this.parser().toConversationSummary(prepared, fmtOpts);
      zipEntries.push({
        path: `${prefix}csv/${fname}.csv`,
        data: AIExporter.formats.csvRowsForSummary(summary),
      });
    }

    if (options.formats.includes("claude")) {
      const summary = this.parser().toConversationSummary(prepared, fmtOpts);
      zipEntries.push({
        path: `${prefix}claude/${fname}.json`,
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

    if (
      options.formats.includes("gemini-import") ||
      options.formats.includes("gemini")
    ) {
      const geminiFiles = AIExporter.formats.geminiImportFiles(prepared);
      for (const file of geminiFiles) {
        zipEntries.push({
          path: `${prefix}gemini-import/${file.path}`,
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
            exporterVersion: AIExporter.feedback.getVersion(),
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

    const includeGeminiImport =
      options.formats.includes("gemini-import") ||
      options.formats.includes("gemini");

    if (includeGeminiImport && prepared.length) {
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
      const norm = AIExporter.platform.normalizeConversationId?.(id) || id;
      filtered = list.filter(
        (c) =>
          c.id === id ||
          c.id === norm ||
          AIExporter.platform.conversationIdsMatch?.(c.id, id)
      );
      if (!filtered.length) {
        filtered = [{ id: norm, title: "Current conversation" }];
      }
      return Promise.resolve(filtered);
    }

    if (options.conversationIds?.length) {
      const ids = new Set(
        options.conversationIds.flatMap((id) => {
          const norm = AIExporter.platform.normalizeConversationId?.(id) || id;
          return [id, norm];
        })
      );
      filtered = list.filter((c) => {
        const norm = AIExporter.platform.normalizeConversationId?.(c.id) || c.id;
        return ids.has(c.id) || ids.has(norm);
      });
    }

    if (options.searchQuery) {
      const q = options.searchQuery.toLowerCase();
      filtered = filtered.filter((c) =>
        (c.title || "").toLowerCase().includes(q)
      );
    }

    if (options.scope === "new") {
      return this.getLastExportTime().then((lastExport) =>
        filtered.filter((c) => {
          const ts = c.update_time || c.create_time;
          if (ts == null) return true;
          return ts > lastExport;
        })
      );
    }

    return Promise.resolve(filtered);
  },

  isRetryableExportError(err) {
    const msg = err?.message || String(err || "");
    return (
      /HTTP 429|rate limit|too many requests/i.test(msg) ||
      /HTTP 5\d\d/.test(msg) ||
      /network|failed to fetch|load failed/i.test(msg)
    );
  },

  downloadConcurrency(total) {
    if (AIExporter.platform.id === "chatgpt") {
      if (total > 80) return 1;
      if (total > 30) return 2;
      return 2;
    }
    return 3;
  },

  downloadDelayMs() {
    if (AIExporter.platform.id === "chatgpt") return 700;
    return this.api().DELAY_MS;
  },

  async downloadOneConversation(item, opts) {
    const { id, title: rawTitle } = item;
    const title = rawTitle || "Untitled";

    let convo = await this.api().getConversation(id);
    convo = this.attachListMetadata(convo, item);
    if (!convo.title && title !== id.slice(0, 8)) convo.title = title;

    const summary = this.parser().toConversationSummary(
      this.prepareConvo(convo, opts),
      this.formatOptions(opts)
    );
    if (!summary.messages?.length) {
      throw new Error("No messages found in conversation");
    }

    const fname = this.buildFname(convo, opts);
    const result = await this.processConversation(convo, opts, fname);
    return { convo, fname, result, title, id };
  },

  async retryFailedDownloads(filtered, exportErrors, opts, zipEntries, htmlEntries, fullConversations, ui) {
    const retryable = exportErrors.filter((entry) =>
      this.isRetryableExportError({ message: entry.error })
    );
    if (!retryable.length || ui.isCancelled()) return 0;

    ui.set(
      `Retrying ${retryable.length} chat${retryable.length === 1 ? "" : "s"} after rate limits...`,
      84
    );

    let recovered = 0;
    const byId = new Map(filtered.map((item) => [item.id, item]));

    for (let i = 0; i < retryable.length; i += 1) {
      if (ui.isCancelled()) break;

      const entry = retryable[i];
      const item = byId.get(entry.id);
      if (!item) continue;

      ui.set(
        `Retrying ${i + 1} of ${retryable.length} after rate limits...`,
        84,
        entry.title || entry.id
      );
      await AIExporter.utils.sleep(2500);

      try {
        const downloaded = await this.downloadOneConversation(item, opts);
        fullConversations.push(downloaded.convo);
        zipEntries.push(...downloaded.result.zipEntries);
        if (downloaded.result.htmlBody) {
          htmlEntries.push({
            title: downloaded.result.title,
            html: downloaded.result.htmlBody,
            fname: downloaded.fname,
          });
        }

        const idx = exportErrors.findIndex((e) => e.id === entry.id);
        if (idx >= 0) exportErrors.splice(idx, 1);
        recovered += 1;
      } catch {
        // keep original error entry
      }
    }

    return recovered;
  },

  async run(options = {}) {
    if (this.exportInProgress) {
      throw new Error("An export is already in progress. Wait for it to finish.");
    }
    this.exportInProgress = true;

    const opts = await this.defaultOptions(options);
    const ui = AIExporter.ui.show();
    const zipEntries = [];
    const fullConversations = [];
    const htmlEntries = [];
    let failed = 0;
    const exportErrors = [];

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
          ui.set(this.formatListProgress(progress), this.listProgressPercent(progress));
        });

        if (
          AIExporter.platform.id === "chatgpt" &&
          this.api().lastListStats?.total_unique
        ) {
          const stats = this.api().lastListStats;
          const projectNote =
            stats.project_count > 0
              ? ` (${stats.project_count} project${stats.project_count === 1 ? "" : "s"}, ${stats.project_only_count} project-only chat${stats.project_only_count === 1 ? "" : "s"})`
              : "";
          ui.set(
            `Found ${stats.total_unique} conversations${projectNote}`,
            15
          );
        }
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

      const concurrency = this.downloadConcurrency(total);
      const delayMs = this.downloadDelayMs();
      let completed = 0;
      await AIExporter.utils.mapPool(filtered, concurrency, async (item) => {
        if (ui.isCancelled()) return;

        const { id, title: rawTitle } = item;
        const title = rawTitle || "Untitled";

        try {
          const downloaded = await this.downloadOneConversation(item, opts);
          fullConversations.push(downloaded.convo);
          zipEntries.push(...downloaded.result.zipEntries);
          if (downloaded.result.htmlBody) {
            htmlEntries.push({
              title: downloaded.result.title,
              html: downloaded.result.htmlBody,
              fname: downloaded.fname,
            });
          }
        } catch (err) {
          failed += 1;
          exportErrors.push({
            id,
            title,
            project_name: item.project_name || null,
            error: err?.message || String(err),
          });
        }

        completed += 1;
        const pct = 15 + Math.round((completed / total) * 70);
        ui.set(`Downloading ${completed} of ${total}`, pct, title);
        await AIExporter.utils.sleep(delayMs);
      });

      if (!ui.isCancelled() && exportErrors.length) {
        const recovered = await this.retryFailedDownloads(
          filtered,
          exportErrors,
          opts,
          zipEntries,
          htmlEntries,
          fullConversations,
          ui
        );
        failed = Math.max(0, failed - recovered);
      }

      if (ui.isCancelled()) throw new Error("Cancelled");

      if (!fullConversations.length) {
        const detail =
          exportErrors[0]?.error ||
          "No conversations could be exported. Try Current conversation only.";
        ui.error(detail, exportErrors);
        return { success: false, count: 0, failed, errors: exportErrors };
      }

      ui.set("Building export files...", 88);

      if (AIExporter.platform.id === "chatgpt") {
        const assetResult = await this.appendChatGptProjectAssets(zipEntries, ui);
        if (this.api().lastListStats) {
          this.api().lastListStats.knowledge_files_exported = assetResult.knowledgeFiles;
          this.api().lastListStats.knowledge_file_errors = assetResult.errors.length;
        }
      }

      this.appendAggregateFormats(zipEntries, fullConversations, opts, htmlEntries);

      if (
        AIExporter.platform.id === "chatgpt" &&
        this.api().lastListStats
      ) {
        zipEntries.push({
          path: "chatgpt/export-index.json",
          data: JSON.stringify(
            {
              exported_at: new Date().toISOString(),
              exporter_version: AIExporter.feedback.getVersion(),
              ...this.api().lastListStats,
            },
            null,
            2
          ),
        });
      }

      if (opts.complianceManifest) {
        ui.set("Generating compliance manifest...", 92);
        const summaries = fullConversations.map((c) =>
          this.parser().toConversationSummary(this.prepareConvo(c, opts), this.formatOptions(opts))
        );
        const manifest = await AIExporter.compliance.buildManifest(zipEntries, {
          accountId: this.api().accountId,
          conversationCount: fullConversations.length,
          exporterVersion: AIExporter.feedback.getVersion(),
          platform: AIExporter.platform.id,
        });
        zipEntries.push({
          path: "compliance/manifest.json",
          data: JSON.stringify(manifest, null, 2),
        });
        zipEntries.push({
          path: "compliance/audit-log.csv",
          data: AIExporter.compliance.buildAuditLog(summaries, {
            platform: AIExporter.platform.id,
            exported_at: manifest.exported_at,
          }),
        });
        zipEntries.push({
          path: "compliance/README.md",
          data: AIExporter.compliance.complianceReadme(manifest),
        });
      }

      if (failed > 0) {
        zipEntries.push({
          path: "export-errors.json",
          data: JSON.stringify(
            {
              exported_at: new Date().toISOString(),
              platform: AIExporter.platform.id,
              version: AIExporter.feedback.getVersion(),
              failed,
              errors: exportErrors,
            },
            null,
            2
          ),
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

      const succeeded = total - failed;
      if (succeeded > 0) {
        await AIExporter.browser.storageSet({ lastExportTime: Date.now() / 1000 });
      }

      await AIExporter.prefs.save({
        formats: opts.formats,
        includeFiles: opts.includeFiles,
        complianceManifest: opts.complianceManifest,
        filenameTemplate: opts.filenameTemplate,
      });

      let msg = `Done! Exported ${succeeded} conversation${succeeded === 1 ? "" : "s"}.`;
      if (failed) {
        msg += ` (${failed} failed — see export-errors.json in the ZIP)`;
      }
      ui.done(msg, { failed, exportErrors });

      return { success: true, count: succeeded, failed, errors: exportErrors };
    } catch (err) {
      if (err.message === "Cancelled") {
        ui.error("Export cancelled.");
        return { success: false, cancelled: true };
      }
      ui.error(`Export failed: ${err.message}`, [{ error: err.message }]);
      return { success: false, error: err.message };
    } finally {
      this.exportInProgress = false;
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
