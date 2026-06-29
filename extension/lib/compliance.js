/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.compliance = {
  async sha256(data) {
    const bytes =
      typeof data === "string"
        ? new TextEncoder().encode(data)
        : data instanceof Uint8Array
          ? data
          : new Uint8Array(data);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)]
      .map((b) => b.toString(16).padStart(2, "hex"))
      .join("");
  },

  async buildManifest(zipEntries, meta = {}) {
    const files = [];
    for (const entry of zipEntries) {
      const data = entry.data;
      const size =
        typeof data === "string"
          ? new TextEncoder().encode(data).length
          : data?.length || 0;
      files.push({
        path: entry.path,
        sha256: await this.sha256(data),
        size_bytes: size,
      });
    }

    const fileHashes = files.map((f) => f.sha256).join("");
    const aggregateHash = await this.sha256(fileHashes);

    return {
      schema: "ai-exporter-compliance-manifest",
      version: "2.0",
      exported_at: new Date().toISOString(),
      exporter_version: meta.exporterVersion || AIExporter.feedback?.getVersion?.() || "unknown",
      platform: meta.platform || AIExporter.platform?.id || "chatgpt",
      account_id: meta.accountId || null,
      conversation_count: meta.conversationCount || 0,
      file_count: files.length,
      aggregate_sha256: aggregateHash,
      chain_of_custody: {
        exported_by: "AI Exporter browser extension",
        export_method: "local_browser_session",
        data_transmission: "none",
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent : null,
      },
      files,
    };
  },

  buildAuditLog(summaries, meta = {}) {
    const lines = [
      "conversation_id,title,platform,message_count,exported_at,model,is_group_chat",
    ];
    const exportedAt = meta.exported_at || new Date().toISOString();
    const platform = meta.platform || "unknown";

    for (const s of summaries) {
      const row = [
        s.id,
        `"${(s.title || "").replace(/"/g, '""')}"`,
        platform,
        s.message_count || (s.messages || []).length,
        exportedAt,
        s.model || "",
        s.is_group_chat ? "true" : "false",
      ];
      lines.push(row.join(","));
    }

    return lines.join("\n") + "\n";
  },

  complianceReadme(manifest) {
    return `# Compliance Export Manifest

This export includes a SHA-256 integrity manifest for audit and archival.

## Verification

1. Compute SHA-256 of each exported file
2. Compare against \`files[].sha256\` in \`manifest.json\`
3. Concatenate all file hashes (in manifest order) and SHA-256 the result
4. Compare against \`aggregate_sha256\`

## Export metadata

- **Platform:** ${manifest.platform}
- **Exported at:** ${manifest.exported_at}
- **Files:** ${manifest.file_count}
- **Conversations:** ${manifest.conversation_count}
- **Aggregate hash:** \`${manifest.aggregate_sha256}\`

## Chain of custody

- Export method: ${manifest.chain_of_custody?.export_method}
- Data transmission: ${manifest.chain_of_custody?.data_transmission}
- All processing occurred locally in the user's browser
`;
  },
};
