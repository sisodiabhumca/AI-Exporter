#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  ensureDir,
  loadConversations,
  parseArgs,
  resolveInput,
  writeJson,
} from "./lib/export-loader.mjs";

function parseMergeArgs(argv) {
  const base = parseArgs(argv);
  const args = argv.slice(2);
  const inputs = args.filter((a) => !a.startsWith("--") && a !== base.outDir);
  const outIdx = args.indexOf("--out");
  return {
    inputs,
    outDir: outIdx >= 0 ? path.resolve(args[outIdx + 1]) : path.join(process.cwd(), "merged-export"),
    help: !inputs.length || args.includes("-h") || args.includes("--help"),
  };
}

function main() {
  const opts = parseMergeArgs(process.argv);

  if (opts.help) {
    console.log(`Usage: node tools/merge-exports.mjs <export1.zip|folder> [export2 ...] [--out <dir>]

Merges universal/conversations.json from multiple AI Exporter exports
into one combined archive-ready folder. Deduplicates by conversation ID.
`);
    process.exit(opts.inputs.length ? 0 : 1);
  }

  const byId = new Map();
  const sources = new Set();

  for (const input of opts.inputs) {
    const { root, isTemp } = resolveInput(input);
    try {
      const convos = loadConversations(root);
      let source = "unknown";
      const universal = path.join(root, "universal", "conversations.json");
      if (fs.existsSync(universal)) {
        try {
          source = JSON.parse(fs.readFileSync(universal, "utf8")).source || source;
        } catch {
          // ignore
        }
      }
      sources.add(source);

      for (const c of convos) {
        const key = `${source}:${c.id}`;
        if (!byId.has(key)) {
          byId.set(key, { ...c, source });
        }
      }
    } finally {
      if (isTemp) fs.rmSync(root, { recursive: true, force: true });
    }
  }

  const conversations = [...byId.values()];
  ensureDir(opts.outDir);
  ensureDir(path.join(opts.outDir, "universal"));

  const payload = {
    version: "1.1",
    schema: "ai-exporter-universal",
    source: sources.size === 1 ? [...sources][0] : "merged",
    exported_at: new Date().toISOString(),
    exporter_version: "1.7.0",
    conversation_count: conversations.length,
    conversations: conversations.map((c) => ({
      id: c.id,
      title: c.title,
      source: c.source,
      created_at: c.created_at,
      updated_at: c.updated_at,
      messages: c.messages || [],
    })),
  };

  writeJson(path.join(opts.outDir, "universal", "conversations.json"), payload);

  fs.writeFileSync(
    path.join(opts.outDir, "MERGE_README.md"),
    `# Merged AI Exporter Archive

- **Sources:** ${[...sources].join(", ")}
- **Conversations:** ${conversations.length}
- **Merged at:** ${payload.exported_at}

Use with CLI tools:
\`\`\`bash
node tools/ai-exporter.mjs rag-jsonl ${opts.outDir}
node tools/ai-exporter.mjs claude-import ${opts.outDir}
\`\`\`
`,
    "utf8"
  );

  console.log(`Merged ${conversations.length} conversations from ${opts.inputs.length} export(s)`);
  console.log(`  ${path.join(opts.outDir, "universal", "conversations.json")}`);
}

main();
