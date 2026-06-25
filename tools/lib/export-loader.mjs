import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const CHUNK_SIZE = 28000;

export function sanitize(name) {
  return (name || "untitled")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/^[. ]+|[. ]+$/g, "")
    .slice(0, 80) || "untitled";
}

export function chunkText(text, maxChars = CHUNK_SIZE) {
  if (text.length <= maxChars) return [text];

  const chunks = [];
  const sections = text.split(/\n(?=## )/);
  let current = "";

  for (const section of sections) {
    if ((current + section).length > maxChars && current) {
      chunks.push(current.trim());
      current = section;
    } else {
      current += (current ? "\n" : "") + section;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

export function resolveInput(inputPath) {
  const resolved = path.resolve(inputPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Path not found: ${resolved}`);
  }

  if (resolved.endsWith(".zip")) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-exporter-"));
    execSync(`unzip -q "${resolved}" -d "${tmp}"`, { stdio: "pipe" });
    return { root: tmp, isTemp: true };
  }

  return { root: resolved, isTemp: false };
}

function fromUniversalJson(data) {
  return (data.conversations || []).map((c) => ({
    id: c.id,
    title: c.title || "Untitled",
    created_at: c.created_at,
    updated_at: c.updated_at,
    messages: c.messages || [],
  }));
}

function fromClaudeJsonDir(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      return {
        id: file.replace(/\.json$/, ""),
        title: data.title || "Untitled",
        created_at: data.created_at,
        messages: data.messages || [],
      };
    });
}

function fromMarkdownDir(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      const titleMatch = content.match(/^#\s+(.+)$/m);
      return {
        id: file.replace(/\.md$/, ""),
        title: titleMatch ? titleMatch[1] : file,
        created_at: null,
        messages: [{ role: "assistant", content }],
      };
    });
}

function fromGeminiJson(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return (data.conversations || []).map((c, index) => ({
    id: `gemini-${index}`,
    title: c.title || "Untitled",
    created_at: null,
    messages: (c.turns || []).flatMap((turn) => {
      const role = turn.role === "model" ? "assistant" : "user";
      const text = (turn.parts || []).map((p) => p.text || "").join("\n");
      return text ? [{ role, content: text }] : [];
    }),
  }));
}

export function loadConversations(root) {
  const universal = path.join(root, "universal", "conversations.json");
  const geminiJson = path.join(root, "gemini", "conversations.json");
  const claudeJsonDir = path.join(root, "claude");
  const markdownDir = path.join(root, "markdown");
  const knowledgeDir = path.join(root, "claude-project", "knowledge");

  if (fs.existsSync(universal)) {
    return fromUniversalJson(JSON.parse(fs.readFileSync(universal, "utf8")));
  }
  if (fs.existsSync(geminiJson)) {
    return fromGeminiJson(geminiJson);
  }
  if (fs.existsSync(claudeJsonDir)) {
    return fromClaudeJsonDir(claudeJsonDir);
  }
  if (fs.existsSync(markdownDir)) {
    return fromMarkdownDir(markdownDir);
  }
  if (fs.existsSync(knowledgeDir)) {
    return fromMarkdownDir(knowledgeDir);
  }

  throw new Error(
    "No supported export data found. Expected universal/conversations.json, gemini/, claude/, or markdown/"
  );
}

export function conversationToMarkdown(conv) {
  const lines = [];
  for (const msg of conv.messages) {
    if (msg.role !== "user" && msg.role !== "assistant") continue;
    const label = msg.role === "user" ? "User" : "Assistant";
    lines.push(`## ${label}`, "", msg.content || "", "");
  }
  return lines.join("\n");
}

export function parseArgs(argv) {
  const args = argv.slice(2);
  const inputArg = args.find((a) => !a.startsWith("--"));
  const outIdx = args.indexOf("--out");
  return {
    inputArg,
    outDir: outIdx >= 0 ? path.resolve(args[outIdx + 1]) : null,
    help: !args.length || args.includes("-h") || args.includes("--help"),
  };
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function writeText(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}
