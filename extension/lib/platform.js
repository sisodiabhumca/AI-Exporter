/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.platform = {
  id: null,

  PLATFORMS: {
    chatgpt: {
      hosts: ["chatgpt.com", "chat.openai.com"],
      api: () => AIExporter.api,
      parser: () => AIExporter.parser,
      label: "ChatGPT",
      exportPrefix: "chatgpt",
      urlPattern: /\/c\/([a-f0-9-]{36})/i,
    },
    claude: {
      hosts: ["claude.ai"],
      api: () => AIExporter.apiClaude,
      parser: () => AIExporter.parserClaude,
      label: "Claude",
      exportPrefix: "claude",
      urlPattern: /\/chat\/(?:[a-f0-9-]{36}\/)?([a-f0-9-]{36})/i,
    },
    gemini: {
      hosts: ["gemini.google.com"],
      api: () => AIExporter.apiGemini,
      parser: () => AIExporter.parserGemini,
      label: "Gemini",
      exportPrefix: "gemini",
      urlPattern: /\/app\/([a-zA-Z0-9_-]+)/,
    },
    copilot: {
      hosts: ["copilot.microsoft.com"],
      api: () => AIExporter.apiCopilot,
      parser: () => AIExporter.parserCopilot,
      label: "Copilot",
      exportPrefix: "copilot",
      urlPattern: /\/c\/([a-f0-9-]+)/i,
    },
    deepseek: {
      hosts: ["chat.deepseek.com"],
      api: () => AIExporter.apiDeepseek,
      parser: () => AIExporter.parserDeepseek,
      label: "DeepSeek",
      exportPrefix: "deepseek",
      urlPattern: /\/chat\/([a-zA-Z0-9_-]+)/,
    },
    grok: {
      hosts: ["grok.com"],
      api: () => AIExporter.apiGrok,
      parser: () => AIExporter.parserGrok,
      label: "Grok",
      exportPrefix: "grok",
      urlPattern: /\/c\/([a-f0-9-]+)/i,
    },
  },

  detect() {
    const host = location.hostname;
    for (const [id, cfg] of Object.entries(this.PLATFORMS)) {
      if (cfg.hosts.some((h) => host === h || host.endsWith(`.${h}`))) {
        return id;
      }
    }
    return null;
  },

  get api() {
    const cfg = this.PLATFORMS[this.id];
    return cfg ? cfg.api() : AIExporter.api;
  },

  get parser() {
    const cfg = this.PLATFORMS[this.id];
    return cfg ? cfg.parser() : AIExporter.parser;
  },

  get label() {
    return this.PLATFORMS[this.id]?.label || "AI";
  },

  get exportPrefix() {
    return this.PLATFORMS[this.id]?.exportPrefix || "ai";
  },

  getConversationIdFromUrl() {
    const cfg = this.PLATFORMS[this.id];
    if (!cfg?.urlPattern) return null;
    const m = location.pathname.match(cfg.urlPattern);
    return m ? m[1] : null;
  },

  normalizeConversationId(id) {
    if (!id || this.id !== "gemini") return id;
    return id.startsWith("c_") ? id : `c_${id}`;
  },

  conversationIdsMatch(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    if (this.id === "gemini") {
      return this.normalizeConversationId(a) === this.normalizeConversationId(b);
    }
    return false;
  },

  init() {
    this.id = this.detect();
    return this.id;
  },
};

AIExporter.platform.init();
