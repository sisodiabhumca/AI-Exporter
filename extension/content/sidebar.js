/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.sidebar = {
  button: null,
  currentConversationId: null,
  observer: null,

  getConversationIdFromUrl() {
    return AIExporter.platform.getConversationIdFromUrl();
  },

  injectStyles() {
    if (document.getElementById("ai-exporter-sidebar-styles")) return;

    const style = document.createElement("style");
    style.id = "ai-exporter-sidebar-styles";
    style.textContent = `
      #ai-exporter-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483646;
        display: none;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: #10a37f;
        color: #fff;
        border: none;
        border-radius: 999px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(16, 163, 127, 0.45);
        transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
      }
      #ai-exporter-fab:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 24px rgba(16, 163, 127, 0.55);
      }
      #ai-exporter-fab:disabled {
        opacity: 0.7;
        cursor: wait;
        transform: none;
      }
      #ai-exporter-fab svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
      @media (max-width: 640px) {
        #ai-exporter-fab {
          bottom: 16px;
          right: 16px;
          padding: 10px 14px;
          font-size: 12px;
        }
        #ai-exporter-fab .ai-exporter-fab-label {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
  },

  createButton() {
    if (this.button) return;

    this.injectStyles();
    this.button = document.createElement("button");
    this.button.id = "ai-exporter-fab";
    this.button.type = "button";
    this.button.title = "Open AI Exporter panel";
    this.button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>
      </svg>
      <span class="ai-exporter-fab-label">Export</span>
    `;

    this.button.addEventListener("click", () => AIExporter.panel.open());
    document.body.appendChild(this.button);
  },

  updateVisibility() {
    const id = this.getConversationIdFromUrl();
    this.currentConversationId = id;

    if (!this.button) this.createButton();

    const colors = {
      chatgpt: "#10a37f",
      claude: "#d97757",
      gemini: "#1a73e8",
    };
    const color = colors[AIExporter.platform?.id] || colors.chatgpt;
    this.button.style.background = color;
    this.button.style.boxShadow = `0 4px 20px ${color}66`;

    if (id) {
      this.button.style.display = "flex";
      this.button.disabled = false;
      this.button.querySelector(".ai-exporter-fab-label").textContent =
        "Export chat";
    } else {
      this.button.style.display = "none";
    }
  },

  async exportCurrent() {
    const id = this.getConversationIdFromUrl();
    if (!id || !this.button) return;

    this.button.disabled = true;
    this.button.querySelector(".ai-exporter-fab-label").textContent =
      "Exporting...";

    try {
      await AIExporter.exporter.runSingle(id);
    } finally {
      if (this.button) {
        this.button.disabled = false;
        this.button.querySelector(".ai-exporter-fab-label").textContent =
          "Export chat";
      }
    }
  },

  watchNavigation() {
    let throttleTimer = null;
    const check = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        this.updateVisibility();
      }, 300);
    };

    window.addEventListener("popstate", check);
    window.addEventListener("hashchange", check);

    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);

    history.pushState = (...args) => {
      origPush(...args);
      check();
    };
    history.replaceState = (...args) => {
      origReplace(...args);
      check();
    };

    this.updateVisibility();
    setInterval(() => this.updateVisibility(), 2000);
  },

  init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.watchNavigation());
    } else {
      this.watchNavigation();
    }
  },
};

AIExporter.sidebar.init();
