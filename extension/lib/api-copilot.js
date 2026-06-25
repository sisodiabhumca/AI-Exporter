/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.apiCopilot = {
  DELAY_MS: 600,
  accountId: null,

  USER_SELECTORS: [
    '[data-testid="user-message"]',
    ".fai-UserMessage",
    '[class*="UserMessage"]',
    '[data-author="user"]',
  ],

  ASSISTANT_SELECTORS: [
    '[data-testid="copilot-message"]',
    ".fai-CopilotMessage",
    '[class*="CopilotMessage"]',
    '[data-author="bot"]',
  ],

  async init() {
    this.accountId = "copilot";
    return { accountId: this.accountId, email: null };
  },

  scrapeCurrentMessages() {
    return AIExporter.domScraper.scrapeMessages(
      this.USER_SELECTORS,
      this.ASSISTANT_SELECTORS
    );
  },

  getCurrentTitle() {
    const titleEl = document.querySelector(
      'h1, [data-testid="conversation-title"], header h2'
    );
    return (
      titleEl?.innerText?.trim() ||
      document.title.replace(/ - Microsoft Copilot/i, "").trim() ||
      "Copilot conversation"
    );
  },

  getConversationIdFromUrl() {
    const m = location.pathname.match(/\/c\/([a-f0-9-]+)/i);
    return m ? m[1] : `copilot-${Date.now()}`;
  },

  async listConversations(onProgress) {
    const sidebar = AIExporter.domScraper.scrapeSidebarLinks(
      /\/c\/([a-f0-9-]+)/i
    );

    if (sidebar.length) {
      onProgress?.({
        phase: "listing",
        current: sidebar.length,
        total: sidebar.length,
      });
      return sidebar.map((c) => ({
        id: c.id,
        title: c.title,
        create_time: null,
        update_time: null,
      }));
    }

    const id = this.getConversationIdFromUrl();
    const current = [
      {
        id,
        title: this.getCurrentTitle(),
        create_time: null,
        update_time: null,
      },
    ];
    onProgress?.({ phase: "listing", current: 1, total: 1 });
    return current;
  },

  async getConversation(id) {
    const currentId = this.getConversationIdFromUrl();
    if (id !== currentId && !location.pathname.includes(id)) {
      throw new Error(
        "Navigate to the conversation in Copilot, then export. Bulk sidebar export requires visible chat history."
      );
    }

    const messages = this.scrapeCurrentMessages();
    return {
      id: currentId,
      conversation_id: currentId,
      title: this.getCurrentTitle(),
      source: "copilot",
      _domMessages: messages,
    };
  },

  async downloadFile() {
    throw new Error("Copilot attachment download not supported");
  },
};
