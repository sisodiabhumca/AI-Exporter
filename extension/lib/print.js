/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.print = {
  openPrintView(html, title) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "width=900,height=700");
    if (!win) {
      URL.revokeObjectURL(url);
      throw new Error("Pop-up blocked. Allow pop-ups to print/save as PDF.");
    }

    const cleanup = () => URL.revokeObjectURL(url);
    win.addEventListener(
      "load",
      () => {
        try {
          win.document.title = title || "AI Exporter";
        } catch {
          // cross-origin guard if blob URL behaves differently
        }
        setTimeout(() => {
          win.print();
          cleanup();
        }, 300);
      },
      { once: true }
    );
  },
};
