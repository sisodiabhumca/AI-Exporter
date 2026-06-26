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

  formatDateShort() {
    return new Date().toISOString().slice(0, 10);
  },

  getSpeakerLabel(msg) {
    if (msg.authorName) return msg.authorName;
    if (msg.role === "assistant") return "Assistant";
    if (msg.role === "user") return "You";
    return msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
  },

  panelMessages(convo, options = {}) {
    if (!convo?._panelMessages?.length) return null;
    const selectedIds = options.selectedMessageIds?.length
      ? new Set(options.selectedMessageIds)
      : null;
    return convo._panelMessages.filter(
      (m) => !selectedIds || selectedIds.has(m.id)
    );
  },

  applyFilenameTemplate(template, vars) {
    const t = template || "{title}_{id}";
    return this.sanitizeFilename(
      t
        .replace(/\{date\}/g, vars.date || this.formatDateShort())
        .replace(/\{title\}/g, vars.title || "untitled")
        .replace(/\{id\}/g, vars.id || "unknown")
        .replace(/\{time\}/g, vars.time || Date.now().toString())
    );
  },

  async mapPool(items, limit, fn) {
    const results = new Array(items.length);
    let index = 0;

    async function worker() {
      while (index < items.length) {
        const i = index;
        index += 1;
        results[i] = await fn(items[i], i);
      }
    }

    const workers = Array(Math.min(limit, items.length))
      .fill(null)
      .map(() => worker());
    await Promise.all(workers);
    return results;
  },
};
