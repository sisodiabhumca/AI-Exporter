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

  scrapeGeminiMessages() {
    const messages = [];
    const chatRoot =
      document.querySelector("#chat-history, chat-window, main") || document.body;
    const turns = chatRoot.querySelectorAll("user-query, model-response");

    for (const turn of turns) {
      const tag = turn.tagName.toLowerCase();
      const role = tag === "user-query" ? "user" : "assistant";
      const textEl =
        turn.querySelector(
          ".query-text, .markdown, message-content, .model-response-text, .response-content, .response-container-content"
        ) || turn;
      const text = this.textFrom(textEl);
      if (text) {
        messages.push({
          id: `dom-${messages.length}`,
          role,
          content: text,
        });
      }
    }

    if (messages.length) return messages;

    const blocks = chatRoot.querySelectorAll(
      ".conversation-container, [data-test-id='conversation-turn'], article"
    );
    for (const block of blocks) {
      const isUser =
        block.matches("user-query, .user-query, [data-message-author='user']") ||
        block.querySelector("user-query, .user-query");
      const role = isUser ? "user" : "assistant";
      const text = this.textFrom(block);
      if (text.length > 2) {
        messages.push({ id: `dom-${messages.length}`, role, content: text });
      }
    }

    return messages;
  },

  scrapeForPlatform(platformId) {
    if (platformId === "gemini") {
      const geminiMessages = this.scrapeGeminiMessages();
      if (geminiMessages.length) return geminiMessages;
    }

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
          "user-query",
          ".query-text",
          '[data-message-author="user"]',
          ".query-content",
          '[class*="user-query"]',
        ],
        assistant: [
          "model-response",
          "message-content",
          ".markdown",
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
        user: [
          '[data-testid="user-message"]',
          '[data-role="user"]',
          ".user-message",
        ],
        assistant: [
          '[data-testid="assistant-message"]',
          '[data-role="assistant"]',
          ".assistant-message",
        ],
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
