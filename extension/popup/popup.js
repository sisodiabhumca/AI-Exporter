const ext = typeof globalThis.browser !== "undefined" ? globalThis.browser : globalThis.chrome;

const PLATFORMS = {
  chatgpt: { hosts: ["chatgpt.com", "chat.openai.com"], label: "ChatGPT", url: "https://chatgpt.com" },
  claude: { hosts: ["claude.ai"], label: "Claude", url: "https://claude.ai" },
  gemini: { hosts: ["gemini.google.com"], label: "Gemini", url: "https://gemini.google.com" },
  copilot: { hosts: ["copilot.microsoft.com"], label: "Copilot", url: "https://copilot.microsoft.com" },
  deepseek: { hosts: ["chat.deepseek.com"], label: "DeepSeek", url: "https://chat.deepseek.com" },
  grok: { hosts: ["grok.com"], label: "Grok", url: "https://grok.com" },
};

const exportBtn = document.getElementById("export-btn");
const statusEl = document.getElementById("status");
const mainForm = document.getElementById("main-form");
const notSupported = document.getElementById("not-supported");
const platformBadge = document.getElementById("platform-badge");
const subtitle = document.getElementById("subtitle");
const searchInput = document.getElementById("search-query");
const scopeRadios = document.querySelectorAll('input[name="scope"]');
const chatgptOnlyEls = document.querySelectorAll("[data-chatgpt-only]");

let currentPlatform = null;

function storageGet(keys) {
  const r = ext.storage.local.get(keys);
  if (r?.then) return r;
  return new Promise((resolve) => ext.storage.local.get(keys, resolve));
}

function storageSet(items) {
  const r = ext.storage.local.set(items);
  if (r?.then) return r;
  return new Promise((resolve) => ext.storage.local.set(items, resolve));
}

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname;
    for (const [id, cfg] of Object.entries(PLATFORMS)) {
      if (cfg.hosts.some((h) => host === h || host.endsWith(`.${h}`))) {
        return { id, ...cfg };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function getActiveTab() {
  const tabs = await ext.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function sendTabMessage(tabId, message) {
  const result = ext.tabs.sendMessage(tabId, message);
  if (result && typeof result.then === "function") return result;
  return new Promise((resolve, reject) => {
    ext.tabs.sendMessage(tabId, message, (response) => {
      const err = ext.runtime?.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

function getSelectedFormats() {
  return [...document.querySelectorAll('input[name="format"]:checked')].map((el) => el.value);
}

function setSelectedFormats(formats) {
  document.querySelectorAll('input[name="format"]').forEach((el) => {
    el.checked = formats.includes(el.value);
  });
}

function getScope() {
  return document.querySelector('input[name="scope"]:checked')?.value || "all";
}

function updatePlatformUI(platform) {
  currentPlatform = platform;
  const isChatgpt = platform?.id === "chatgpt";

  chatgptOnlyEls.forEach((el) => {
    el.classList.toggle("hidden", !isChatgpt);
    if (!isChatgpt && el.querySelector('input[type="checkbox"]')) {
      el.querySelector('input[type="checkbox"]').checked = false;
    }
  });

  if (platform) {
    platformBadge.textContent = platform.label;
    platformBadge.classList.remove("hidden");
    subtitle.textContent = `Export ${platform.label} → portable formats`;
    exportBtn.textContent = `Export ${platform.label} conversations`;
  }
}

scopeRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    searchInput.classList.toggle("hidden", getScope() !== "search");
  });
});

async function loadPrefs() {
  const { userPrefs, exportSchedule } = await storageGet(["userPrefs", "exportSchedule"]);
  const prefs = userPrefs || {};
  const schedule = exportSchedule || {};

  if (prefs.formats?.length) setSelectedFormats(prefs.formats);
  if (prefs.includeFiles !== undefined) {
    document.getElementById("include-files").checked = prefs.includeFiles;
  }
  if (prefs.includeTimestamps !== undefined) {
    document.getElementById("include-timestamps").checked = prefs.includeTimestamps;
  }
  if (prefs.preserveCitations !== undefined) {
    document.getElementById("preserve-citations").checked = prefs.preserveCitations;
  }
  if (prefs.complianceManifest !== undefined) {
    document.getElementById("compliance-manifest").checked = prefs.complianceManifest;
  }
  if (prefs.includeToc !== undefined) {
    document.getElementById("include-toc").checked = prefs.includeToc;
  }
  if (prefs.filenameTemplate) {
    document.getElementById("filename-template").value = prefs.filenameTemplate;
  }
  if (prefs.ragChunkSize) {
    document.getElementById("rag-chunk-size").value = prefs.ragChunkSize;
  }
  if (prefs.ragChunkStrategy) {
    document.getElementById("rag-chunk-strategy").value = prefs.ragChunkStrategy;
  }

  document.getElementById("schedule-enabled").checked = !!schedule.enabled;
  if (schedule.intervalHours) {
    document.getElementById("schedule-interval").value = String(schedule.intervalHours);
  }
}

async function savePrefs() {
  const formats = getSelectedFormats();
  const scheduleEnabled = document.getElementById("schedule-enabled").checked;
  const intervalHours = parseInt(document.getElementById("schedule-interval").value, 10) || 168;

  await storageSet({
    userPrefs: {
      formats,
      includeFiles: document.getElementById("include-files").checked,
      includeTimestamps: document.getElementById("include-timestamps").checked,
      preserveCitations: document.getElementById("preserve-citations").checked,
      complianceManifest: document.getElementById("compliance-manifest").checked,
      includeToc: document.getElementById("include-toc").checked,
      filenameTemplate: document.getElementById("filename-template").value.trim() || "{title}_{id}",
      ragChunkSize: parseInt(document.getElementById("rag-chunk-size").value, 10) || 2000,
      ragChunkStrategy: document.getElementById("rag-chunk-strategy").value,
    },
    exportSchedule: {
      enabled: scheduleEnabled,
      intervalHours,
      platform: currentPlatform?.id || "chatgpt",
      scope: "new",
      formats,
    },
  });

  if (ext.alarms) {
    await ext.alarms.clear("ai-exporter-scheduled");
    if (scheduleEnabled) {
      await ext.alarms.create("ai-exporter-scheduled", {
        periodInMinutes: Math.max(60, intervalHours * 60),
      });
    }
  }
}

async function init() {
  await loadPrefs();
  const tab = await getActiveTab();
  const platform = tab?.url ? detectPlatform(tab.url) : null;

  if (!platform) {
    notSupported.classList.remove("hidden");
    mainForm.classList.add("hidden");
    return;
  }

  notSupported.classList.add("hidden");
  mainForm.classList.remove("hidden");
  updatePlatformUI(platform);
}

exportBtn.addEventListener("click", async () => {
  const formats = getSelectedFormats();
  if (!formats.length) {
    statusEl.textContent = "Select at least one format.";
    statusEl.classList.remove("hidden");
    return;
  }

  const scope = getScope();
  const searchQuery = scope === "search" ? searchInput.value.trim() : "";

  if (scope === "search" && !searchQuery) {
    statusEl.textContent = "Enter a search keyword.";
    statusEl.classList.remove("hidden");
    return;
  }

  exportBtn.disabled = true;
  statusEl.textContent = `Starting export on ${currentPlatform?.label || "AI"} tab...`;
  statusEl.classList.remove("hidden");

  const tab = await getActiveTab();

  try {
    await savePrefs();
    const response = await sendTabMessage(tab.id, {
      type: "AI_EXPORTER_START",
      options: {
        scope,
        searchQuery,
        formats,
        includeFiles: document.getElementById("include-files").checked,
        includeTimestamps: document.getElementById("include-timestamps").checked,
        preserveCitations: document.getElementById("preserve-citations").checked,
        complianceManifest: document.getElementById("compliance-manifest").checked,
        includeToc: document.getElementById("include-toc").checked,
        filenameTemplate: document.getElementById("filename-template").value.trim() || "{title}_{id}",
        ragChunkSize: parseInt(document.getElementById("rag-chunk-size").value, 10) || 2000,
        ragChunkStrategy: document.getElementById("rag-chunk-strategy").value,
      },
    });

    if (response?.success) {
      statusEl.textContent =
        response.count === 0
          ? "No conversations to export."
          : `Exported ${response.count} conversation${response.count === 1 ? "" : "s"}. Check downloads.`;
    } else if (response?.cancelled) {
      statusEl.textContent = "Export cancelled.";
    } else {
      statusEl.textContent = response?.error || "Export failed.";
    }
  } catch {
    statusEl.textContent = `Could not connect. Refresh ${currentPlatform?.url || "the page"} and try again.`;
  }

  exportBtn.disabled = false;
});

init();
