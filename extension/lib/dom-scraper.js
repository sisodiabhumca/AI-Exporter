/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.domScraper = {
  textFrom(el) {
    if (!el) return "";
    const clone = el.cloneNode(true);
    clone.querySelectorAll("script, style, button, svg").forEach((n) => n.remove());
    return (clone.innerText || clone.textContent || "").trim();
  },

  queryAll(selectors) {
    for (const sel of selectors) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length) return [...nodes];
    }
    return [];
  },

  scrapeMessages(userSelectors, assistantSelectors) {
    const messages = [];
    const containers = this.queryAll([
      '[data-testid="chat-message-list"]',
      '[role="log"]',
      "main",
      "#app",
    ]);

    const root = containers[0] || document.body;
    const userEls = this.queryAll(userSelectors).filter((el) => root.contains(el));
    const asstEls = this.queryAll(assistantSelectors).filter((el) => root.contains(el));

    const all = [
      ...userEls.map((el) => ({ el, role: "user" })),
      ...asstEls.map((el) => ({ el, role: "assistant" })),
    ];

    if (!all.length) {
      const articles = root.querySelectorAll("article, [data-content='message']");
      for (const art of articles) {
        const role =
          art.getAttribute("data-author") === "user" ||
          art.className?.toLowerCase().includes("user")
            ? "user"
            : "assistant";
        const text = this.textFrom(art);
        if (text) messages.push({ role, content: text });
      }
      return messages;
    }

    all.sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    for (const item of all) {
      const text = this.textFrom(item.el);
      if (text) {
        messages.push({
          id: `dom-${messages.length}`,
          role: item.role,
          content: text,
        });
      }
    }

    return messages;
  },

  scrapeSidebarLinks(linkPattern) {
    const links = document.querySelectorAll("a[href]");
    const results = [];
    const seen = new Set();

    for (const a of links) {
      const href = a.getAttribute("href") || "";
      const m = href.match(linkPattern);
      if (!m) continue;
      const id = m[1];
      if (seen.has(id)) continue;
      seen.add(id);
      results.push({
        id,
        title: (a.innerText || a.textContent || "Untitled").trim().slice(0, 120),
      });
    }

    return results;
  },

  scrapeForPlatform(platformId) {
    const configs = {
      chatgpt: {
        user: [
          '[data-message-author-role="user"]',
          '[data-testid="user-message"]',
        ],
        assistant: [
          '[data-message-author-role="assistant"]',
          '[data-testid="assistant-message"]',
        ],
      },
      claude: {
        user: ['[data-testid="user-message"]', ".font-user-message"],
        assistant: [
          '[data-testid="assistant-message"]',
          ".font-claude-message",
        ],
      },
      gemini: {
        user: [
          '[data-message-author="user"]',
          ".query-content",
          '[class*="user-query"]',
        ],
        assistant: [
          '[data-message-author="model"]',
          ".model-response-text",
          '[class*="model-response"]',
        ],
      },
      copilot: {
        user: AIExporter.apiCopilot?.USER_SELECTORS || [],
        assistant: AIExporter.apiCopilot?.ASSISTANT_SELECTORS || [],
      },
      deepseek: {
        user: ['[class*="user"]', '[data-role="user"]'],
        assistant: ['[class*="assistant"]', '[data-role="assistant"]'],
      },
      grok: {
        user: ['[data-testid="user-message"]', '[class*="UserMessage"]'],
        assistant: [
          '[data-testid="assistant-message"]',
          '[class*="AssistantMessage"]',
        ],
      },
    };

    const cfg = configs[platformId];
    if (!cfg) return [];
    return this.scrapeMessages(cfg.user, cfg.assistant);
  },
};
