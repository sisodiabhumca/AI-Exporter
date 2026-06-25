const ext = typeof globalThis.browser !== "undefined" ? globalThis.browser : globalThis.chrome;

ext.commands.onCommand.addListener((command, tab) => {
  if (command === "export-current" && tab?.id) {
    ext.tabs.sendMessage(tab.id, { type: "AI_EXPORTER_OPEN_PANEL" });
  }
});
