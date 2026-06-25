/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.platform = {
  id: null,

  detect() {
    const host = location.hostname;
    if (host === "claude.ai" || host.endsWith(".claude.ai")) return "claude";
    if (host === "gemini.google.com") return "gemini";
    if (host === "chatgpt.com" || host === "chat.openai.com") return "chatgpt";
    return null;
  },

  get api() {
    if (this.id === "claude") return AIExporter.apiClaude;
    if (this.id === "gemini") return AIExporter.apiGemini;
    return AIExporter.api;
  },

  get parser() {
    if (this.id === "claude") return AIExporter.parserClaude;
    if (this.id === "gemini") return AIExporter.parserGemini;
    return AIExporter.parser;
  },

  get label() {
    return (
      { chatgpt: "ChatGPT", claude: "Claude", gemini: "Gemini" }[this.id] ||
      "AI"
    );
  },

  get exportPrefix() {
    return (
      { chatgpt: "chatgpt", claude: "claude", gemini: "gemini" }[this.id] ||
      "ai"
    );
  },

  getConversationIdFromUrl() {
    const path = location.pathname;
    if (this.id === "chatgpt") {
      const m = path.match(/\/c\/([a-f0-9-]{36})/i);
      return m ? m[1] : null;
    }
    if (this.id === "claude") {
      const m = path.match(/\/chat\/(?:[a-f0-9-]{36}\/)?([a-f0-9-]{36})/i);
      return m ? m[1] : null;
    }
    if (this.id === "gemini") {
      const m = path.match(/\/app\/([a-zA-Z0-9_-]+)/);
      return m ? m[1] : null;
    }
    return null;
  },

  init() {
    this.id = this.detect();
    return this.id;
  },
};

AIExporter.platform.init();
