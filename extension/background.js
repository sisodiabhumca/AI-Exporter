const ext = typeof globalThis.browser !== "undefined" ? globalThis.browser : globalThis.chrome;

ext.commands.onCommand.addListener((command, tab) => {
  if (command === "export-current" && tab?.id) {
    ext.tabs.sendMessage(tab.id, { type: "AI_EXPORTER_OPEN_PANEL" });
  }
});

ext.alarms?.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "ai-exporter-scheduled") return;

  const PLATFORM_URLS = {
    chatgpt: ["https://chatgpt.com/*", "https://chat.openai.com/*"],
    claude: ["https://claude.ai/*"],
    gemini: ["https://gemini.google.com/*"],
    copilot: ["https://copilot.microsoft.com/*"],
    deepseek: ["https://chat.deepseek.com/*"],
    grok: ["https://grok.com/*"],
  };

  const { exportSchedule } = await ext.storage.local.get(["exportSchedule"]);
  const schedule = exportSchedule || {};
  if (!schedule.enabled) return;

  const patterns = PLATFORM_URLS[schedule.platform] || PLATFORM_URLS.chatgpt;
  let tab = null;
  for (const pattern of patterns) {
    const tabs = await ext.tabs.query({ url: pattern });
    if (tabs.length) {
      tab = tabs[0];
      break;
    }
  }

  if (tab?.id) {
    try {
      await ext.tabs.sendMessage(tab.id, {
        type: "AI_EXPORTER_START",
        options: {
          scope: schedule.scope || "new",
          formats: schedule.formats || ["universal", "markdown"],
          includeFiles: false,
        },
      });
    } catch (err) {
      if (ext.notifications) {
        ext.notifications.create(`ai-exporter-scheduled-fail-${Date.now()}`, {
          type: "basic",
          iconUrl: ext.runtime.getURL("icons/icon128.png"),
          title: "AI Exporter — scheduled export failed",
          message:
            err?.message ||
            "Could not connect to the tab. Refresh the page and try again.",
        });
      }
    }
    return;
  }

  if (ext.notifications) {
    ext.notifications.create({
      type: "basic",
      iconUrl: ext.runtime.getURL("icons/icon128.png"),
      title: "AI Exporter — scheduled export",
      message: `Open ${schedule.platform || "your AI chat"} to run the scheduled export.`,
    });
  }
});

ext.runtime.onInstalled.addListener(async () => {
  const { exportSchedule } = await ext.storage.local.get(["exportSchedule"]);
  if (exportSchedule?.enabled && ext.alarms) {
    const periodMinutes = Math.max(60, (exportSchedule.intervalHours || 168) * 60);
    ext.alarms.create("ai-exporter-scheduled", { periodInMinutes: periodMinutes });
  }
});
