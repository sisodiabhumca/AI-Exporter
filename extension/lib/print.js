/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.print = {
  openPrintView(html, title) {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      throw new Error("Pop-up blocked. Allow pop-ups to print/save as PDF.");
    }
    win.document.write(html);
    win.document.close();
    win.document.title = title || "AI Exporter";
    win.onload = () => {
      setTimeout(() => win.print(), 300);
    };
  },
};
