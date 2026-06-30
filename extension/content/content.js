/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.ui = {
  overlay: null,

  show() {
    if (this.overlay) this.overlay.remove();

    this.overlay = document.createElement("div");
    this.overlay.id = "ai-exporter-overlay";
    this.overlay.innerHTML = `
      <style>
        #ai-exporter-overlay {
          position: fixed; inset: 0; z-index: 2147483647;
          background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        #ai-exporter-card {
          background: #fff; border-radius: 16px; padding: 28px 32px;
          width: min(420px, 90vw); box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        #ai-exporter-card h2 {
          margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #0d0d0d;
        }
        #ai-exporter-status {
          margin: 0 0 16px; font-size: 14px; color: #444;
        }
        #ai-exporter-bar-wrap {
          height: 8px; background: #e5e5e5; border-radius: 4px; overflow: hidden;
        }
        #ai-exporter-bar {
          height: 100%; width: 0%; background: #10a37f;
          border-radius: 4px; transition: width 0.3s ease;
        }
        #ai-exporter-detail {
          margin: 12px 0 0; font-size: 12px; color: #888;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        #ai-exporter-cancel, #ai-exporter-feedback {
          margin-top: 16px; background: none; border: 1px solid #ddd;
          border-radius: 8px; padding: 8px 16px; cursor: pointer;
          font-size: 13px; color: #666; width: 100%;
        }
        #ai-exporter-cancel:hover, #ai-exporter-feedback:hover { background: #f5f5f5; }
        #ai-exporter-feedback { margin-top: 8px; color: #1a7f64; border-color: #b8e0d4; }
      </style>
      <div id="ai-exporter-card">
        <h2>AI Exporter</h2>
        <p id="ai-exporter-status">Starting export...</p>
        <div id="ai-exporter-bar-wrap"><div id="ai-exporter-bar"></div></div>
        <p id="ai-exporter-detail"></p>
        <button id="ai-exporter-cancel" type="button">Cancel</button>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.statusEl = this.overlay.querySelector("#ai-exporter-status");
    this.barEl = this.overlay.querySelector("#ai-exporter-bar");
    this.detailEl = this.overlay.querySelector("#ai-exporter-detail");
    this.cancelled = false;

    this.overlay.querySelector("#ai-exporter-cancel").addEventListener("click", () => {
      this.cancelled = true;
      this.set("Cancelling...", null, "");
    });

    return this;
  },

  set(status, pct, detail) {
    if (status) this.statusEl.textContent = status;
    if (pct != null) this.barEl.style.width = `${pct}%`;
    if (detail != null) this.detailEl.textContent = detail;
  },

  addFeedbackButton(context = {}) {
    if (!AIExporter.feedback || this.overlay.querySelector("#ai-exporter-feedback")) {
      return;
    }
    const btn = document.createElement("button");
    btn.id = "ai-exporter-feedback";
    btn.type = "button";
    btn.textContent = "Report issue on GitHub";
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      btn.disabled = true;
      const result = await AIExporter.feedback.openIssue({
        error: context.message || context.exportErrors?.[0]?.error,
        userNotes: context.exportErrors?.length
          ? `Export had ${context.failed} failure(s). First: ${context.exportErrors[0].title || "Untitled"} — ${context.exportErrors[0].error}`
          : undefined,
        context: {
          failedCount: context.failed,
          platformLabel: AIExporter.platform?.label,
          url: location.href,
        },
      });
      btn.disabled = false;
      btn.textContent = result.copied
        ? "Opened — paste from clipboard"
        : "Opened GitHub — submit there";
    });
    this.overlay.querySelector("#ai-exporter-card").appendChild(btn);
  },

  finish(closeOnClick = true) {
    this.overlay.querySelector("#ai-exporter-cancel").style.display = "none";
    if (closeOnClick) {
      this.overlay.addEventListener("click", () => this.remove(), { once: true });
    }
  },

  done(message, context = {}) {
    const detail =
      context.detail ||
      (context.failed && context.exportErrors?.[0]
        ? `${context.exportErrors[0].title || "Untitled"}: ${context.exportErrors[0].error}`
        : "Click anywhere to close.");
    this.set(message, 100, detail);
    this.barEl.style.background = "#22c55e";
    if (context.failed) this.addFeedbackButton({ ...context, message });
    this.finish();
  },

  error(message, exportErrors = []) {
    this.set(message, null, "Click anywhere to close.");
    this.barEl.style.background = "#ef4444";
    this.addFeedbackButton({ message, exportErrors, failed: exportErrors.length });
    this.finish();
  },

  remove() {
    this.overlay?.remove();
    this.overlay = null;
  },

  isCancelled() {
    return this.cancelled;
  },
};

AIExporter.browser.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "AI_EXPORTER_START") {
    AIExporter.exporter
      .run(message.options)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err?.message || String(err) }));
    return true;
  }

  if (message.type === "AI_EXPORTER_SINGLE") {
    AIExporter.exporter
      .runSingle(message.conversationId, message.options)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err?.message || String(err) }));
    return true;
  }

  if (message.type === "AI_EXPORTER_OPEN_PANEL") {
    AIExporter.panel.open().then(sendResponse);
    return true;
  }

  return false;
});
