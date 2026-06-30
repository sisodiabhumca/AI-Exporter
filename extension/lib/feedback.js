/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.feedback = {
  ISSUES_URL: "https://github.com/sisodiabhumca/AI-Exporter/issues/new",
  /** Browsers and GitHub often fail above ~6–8 KB total URL length. */
  MAX_URL_BYTES: 6000,

  getVersion() {
    try {
      return AIExporter.browser?.ext?.runtime?.getManifest?.()?.version || "unknown";
    } catch {
      return "unknown";
    }
  },

  buildTitle(opts = {}) {
    return (
      opts.title ||
      `[Bug] ${opts.platformLabel || opts.context?.platformLabel || AIExporter.platform?.label || "AI Exporter"} — export issue`
    );
  },

  buildBody({ error, context = {}, userNotes, steps, platformLabel, url, failedCount } = {}) {
    const platform =
      platformLabel ||
      AIExporter.platform?.label ||
      context.platformLabel ||
      context.platform ||
      "unknown";
    const pageUrl =
      url ||
      (typeof location !== "undefined" && location.href) ||
      context.url ||
      "n/a";
    const failures = failedCount ?? context.failedCount;

    return [
      "## What happened",
      userNotes || error || "(please describe the issue)",
      "",
      "## Steps to reproduce",
      steps || "1. Open AI chat site\n2. Click Export\n3. ",
      "",
      "## Environment",
      `- Extension version: ${this.getVersion()}`,
      `- Platform: ${platform}`,
      `- Page URL: ${pageUrl}`,
      error ? `- Error message: ${error}` : "",
      failures != null ? `- Failed conversations: ${failures}` : "",
      "",
      "---",
      "Submitted via AI Exporter in-extension feedback (no chat content included).",
    ]
      .filter((line) => line !== undefined)
      .join("\n");
  },

  issueUrl(title, body) {
    return `${this.ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  },

  urlByteLength(url) {
    return new TextEncoder().encode(url).length;
  },

  shortenPageUrl(body) {
    return body.replace(/(- Page URL: )(.+)/m, (_, prefix, pageUrl) => {
      if (pageUrl.length <= 160) return `${prefix}${pageUrl}`;
      return `${prefix}${pageUrl.slice(0, 160)}…`;
    });
  },

  bodyForUrl(fullBody, title) {
    const stub =
      "## What happened\n\n(Full report copied to your clipboard — paste it here.)\n\n---\nSubmitted via AI Exporter.";

    const attempts = [
      fullBody,
      this.shortenPageUrl(fullBody),
    ];

    for (const body of attempts) {
      const url = this.issueUrl(title, body);
      if (this.urlByteLength(url) <= this.MAX_URL_BYTES) {
        return { url, body, truncated: body !== fullBody };
      }
    }

    let lo = 200;
    let hi = fullBody.length;
    let best = "";
    const suffix =
      "\n\n---\n_(Full report copied to your clipboard — paste below if needed.)_";

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const candidate = fullBody.slice(0, mid) + suffix;
      const url = this.issueUrl(title, candidate);
      if (this.urlByteLength(url) <= this.MAX_URL_BYTES) {
        best = candidate;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (best) {
      return { url: this.issueUrl(title, best), body: best, truncated: true };
    }

    return { url: this.issueUrl(title, stub), body: stub, truncated: true };
  },

  async openTab(url) {
    const ext = AIExporter.browser?.ext;
    if (ext?.tabs?.create) {
      try {
        const result = ext.tabs.create({ url });
        if (result?.then) await result;
        else await new Promise((resolve, reject) => {
          ext.tabs.create({ url }, () => {
            const err = ext.runtime?.lastError;
            if (err) reject(new Error(err.message));
            else resolve();
          });
        });
        return;
      } catch {
        /* fall through */
      }
    }
    window.open(url, "_blank", "noopener,noreferrer");
  },

  async copyBody(text) {
    if (AIExporter.clipboard?.copy) {
      return AIExporter.clipboard.copy(text);
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  },

  async openIssue(opts = {}) {
    const title = this.buildTitle(opts);
    const fullBody = this.buildBody(opts);
    const fullUrl = this.issueUrl(title, fullBody);
    const needsClipboard =
      this.urlByteLength(fullUrl) > this.MAX_URL_BYTES;

    const { url, truncated } = needsClipboard
      ? this.bodyForUrl(fullBody, title)
      : { url: fullUrl, truncated: false };

    let copied = false;
    if (needsClipboard || truncated) {
      copied = await this.copyBody(fullBody);
    }

    await this.openTab(url);

    let message = "GitHub opened — review and submit the issue.";
    if (copied) {
      message =
        "GitHub opened — full report copied. Paste it into the issue body (⌘V / Ctrl+V).";
    } else if (truncated) {
      message =
        "GitHub opened with a short summary. Add more detail in the issue body.";
    }

    return { url, copied, truncated, message };
  },
};
