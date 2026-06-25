const ext = typeof globalThis.browser !== "undefined" ? globalThis.browser : globalThis.chrome;

const CHATGPT_URLS = ["chatgpt.com", "chat.openai.com"];

const exportBtn = document.getElementById("export-btn");
const statusEl = document.getElementById("status");
const mainForm = document.getElementById("main-form");
const notOnChatgpt = document.getElementById("not-on-chatgpt");
const searchInput = document.getElementById("search-query");
const scopeRadios = document.querySelectorAll('input[name="scope"]');

function isChatGptUrl(url) {
  try {
    const host = new URL(url).hostname;
    return CHATGPT_URLS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
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
  return [...document.querySelectorAll('input[name="format"]:checked')].map(
    (el) => el.value
  );
}

function getScope() {
  return document.querySelector('input[name="scope"]:checked')?.value || "all";
}

scopeRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    const scope = getScope();
    searchInput.classList.toggle("hidden", scope !== "search");
  });
});

async function init() {
  const tab = await getActiveTab();
  const onChatgpt = tab?.url && isChatGptUrl(tab.url);

  if (!onChatgpt) {
    notOnChatgpt.classList.remove("hidden");
    mainForm.classList.add("hidden");
    return;
  }

  notOnChatgpt.classList.add("hidden");
  mainForm.classList.remove("hidden");
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

  if (scope === "current") {
    statusEl.textContent =
      "Tip: You can also use the floating Export chat button on any conversation page.";
  }

  exportBtn.disabled = true;
  statusEl.textContent = "Starting export on ChatGPT tab...";
  statusEl.classList.remove("hidden");

  const tab = await getActiveTab();

  try {
    const response = await sendTabMessage(tab.id, {
      type: "AI_EXPORTER_START",
      options: {
        scope,
        searchQuery,
        formats,
        includeFiles: document.getElementById("include-files").checked,
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
    statusEl.textContent =
      "Could not connect. Refresh chatgpt.com and try again.";
  }

  exportBtn.disabled = false;
});

init();
