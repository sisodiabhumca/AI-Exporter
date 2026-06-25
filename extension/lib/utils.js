/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.utils = {
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  sanitizeFilename(name) {
    return (name || "untitled")
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .replace(/^[. ]+|[. ]+$/g, "")
      .slice(0, 80) || "untitled";
  },

  deduplicateFilename(name, usedNames) {
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    let i = 1;
    while (usedNames.has(`${base}_${i}${ext}`)) i += 1;
    const deduped = `${base}_${i}${ext}`;
    usedNames.add(deduped);
    return deduped;
  },

  stripCitations(text) {
    return String(text).replace(/\u3010[^\u3011]*\u3011/g, "");
  },

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  toIsoTimestamp(unixSeconds) {
    if (!unixSeconds) return null;
    return new Date(unixSeconds * 1000).toISOString();
  },

  formatDateForDisplay(unixSeconds) {
    if (!unixSeconds) return "";
    return new Date(unixSeconds * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 16) + " UTC";
  },
};
