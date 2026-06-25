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
};
