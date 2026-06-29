/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.feedback = {
  ISSUES_URL: "https://github.com/sisodiabhumca/AI-Exporter/issues/new",

  getVersion() {
    try {
      return AIExporter.browser?.ext?.runtime?.getManifest?.()?.version || "unknown";
    } catch {
      return "unknown";
    }
  },

  buildBody({ error, context, userNotes, steps } = {}) {
    const platform =
      AIExporter.platform?.label ||
      context?.platformLabel ||
      context?.platform ||
      "unknown";
    const pageUrl =
      (typeof location !== "undefined" && location.href) || context?.url || "n/a";

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
      context?.failedCount != null
        ? `- Failed conversations: ${context.failedCount}`
        : "",
      "",
      "---",
      "Submitted via AI Exporter in-extension feedback (no chat content included).",
    ]
      .filter((line) => line !== undefined)
      .join("\n");
  },

  openIssue(opts = {}) {
    const title = encodeURIComponent(
      opts.title ||
        `[Bug] ${AIExporter.platform?.label || "AI Exporter"} — export issue`
    );
    const body = encodeURIComponent(this.buildBody(opts));
    const url = `${this.ISSUES_URL}?title=${title}&body=${body}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    return url;
  },
};
