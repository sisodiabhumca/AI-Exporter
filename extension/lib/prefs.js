/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.prefs = {
  DEFAULTS: {
    formats: [
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
    includeFiles: true,
    includeTimestamps: true,
    preserveCitations: true,
    complianceManifest: false,
    filenameTemplate: "{title}_{id}",
    ragChunkSize: 2000,
  },

  PANEL_FORMATS: [
    { id: "markdown", label: "Markdown" },
    { id: "csv", label: "CSV" },
    { id: "html", label: "HTML/PDF" },
    { id: "notion", label: "Notion" },
    { id: "obsidian", label: "Obsidian" },
    { id: "rag-jsonl", label: "RAG JSONL" },
    { id: "universal", label: "Universal JSON" },
    { id: "claude", label: "Claude JSON" },
    { id: "gemini-import", label: "Gemini" },
  ],

  async get() {
    const stored = await AIExporter.browser.storageGet(["userPrefs"]);
    return { ...this.DEFAULTS, ...(stored.userPrefs || {}) };
  },

  async save(partial) {
    const current = await this.get();
    await AIExporter.browser.storageSet({
      userPrefs: { ...current, ...partial },
    });
  },
};
