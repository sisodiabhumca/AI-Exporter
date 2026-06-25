# Chrome Web Store — Privacy Practices (copy-paste)

**Extension:** AI Exporter v1.7.0  
**Author:** Gaurav Sisodia ([@sisodiabhumca](https://github.com/sisodiabhumca))  
**Contact email:** sisodiabhumca@gmail.com

Use the text below on the **Privacy practices** tab of the Chrome Web Store Developer Dashboard.  
**Full step-by-step submit guide:** [SUBMIT-CHECKLIST.md](./SUBMIT-CHECKLIST.md)

---

## Single purpose description

AI Exporter has a single purpose: to let users export their own AI conversation history from supported chat platforms (ChatGPT, Claude, Gemini, Copilot, DeepSeek, Grok) to their local computer in portable file formats (JSON, Markdown, RAG JSONL, etc.) so they can archive, migrate, or use that history in other tools. The extension does not modify these sites, inject ads, or collect data for any other purpose.

---

## Permission justifications

### activeTab

This permission is required so that when the user clicks the extension icon or starts an export, the extension can send a one-time message to the active tab (a supported AI chat site) to begin the export. The extension only interacts with the tab the user is currently viewing after the user explicitly clicks Export. No background access to other tabs is used.

### Host permissions (chatgpt.com, claude.ai, gemini.google.com, copilot.microsoft.com, chat.deepseek.com, grok.com)

Host permissions are required because the extension must run on supported AI chat sites to:

1. Inject the export UI (progress overlay and “Export chat” button) on pages the user visits
2. Call each platform’s same-origin APIs (or read page content for Copilot) using the user’s existing login session to download their conversations
3. Save the exported files directly to the user’s computer via the browser

All requests go only to the supported platform domains (OpenAI, Anthropic, Google, Microsoft, DeepSeek, xAI). Conversation data is not sent to any server operated by the extension developer.

### alarms and notifications

These permissions support the **optional** scheduled export feature. When enabled by the user, the extension sets a recurring alarm to remind the extension to export on a schedule. A local notification is shown only if no supported platform tab is open at export time. No data is sent externally.

### storage

The `storage` permission is used to save small pieces of local metadata on the user’s device: the timestamp of the last successful export (for “New since last export”) and the user’s export preferences (selected formats, filename pattern, and options). No conversation content, tokens, or personal data are stored in extension storage.

### Remote code

**This extension does not use remote code.**

All JavaScript is bundled inside the extension package and executed locally in the user’s browser. The extension does not load external scripts, use `eval()` on remote content, or execute code from a remote server.

If the form asks whether you use remote code, select **No**.

If a free-text justification is still required, use:

> This extension does not use remote code. All functionality is implemented in files included in the extension package. Network requests are made only to chatgpt.com to retrieve the signed-in user’s own conversation data via OpenAI’s APIs; no remotely hosted scripts are loaded or executed.

---

## Data usage certification

When certifying compliance with the [Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/):

**Certify YES** — the extension complies, because:

- It does **not** sell or transfer user data to third parties
- It does **not** use user data for purposes unrelated to its single purpose (exporting the user’s own chats)
- It does **not** collect analytics, advertising data, or personal information on developer servers
- All export processing happens **locally in the browser**
- Data is only accessed from **supported platform domains** using the user’s own session, at the user’s explicit request
- The only data stored locally is an optional last-export timestamp

**Privacy policy URL** (host on GitHub after you push the repo):

```
https://github.com/sisodiabhumca/ai-exporter/blob/main/store-listing/privacy-policy.md
```

**Data handling questionnaire (typical answers):**

| Question | Answer |
|----------|--------|
| Does your extension collect user data? | No — data stays on the user’s device |
| Is data sold to third parties? | No |
| Is data used for purposes unrelated to the extension? | No |
| Is data encrypted in transit? | HTTPS to platform domains only |

---

## Contact email (Settings page — not Privacy tab)

| Field | Value |
|-------|-------|
| **Publisher contact email** | `sisodiabhumca@gmail.com` |

**Steps:**
1. Developer Dashboard → **Settings** (gear icon)
2. Enter **sisodiabhumca@gmail.com** as Publisher contact email
3. Check inbox → click Google's verification link
4. Return to listing → **Save Draft** → submit when all warnings are cleared

---

## Pre-submit checklist

- [ ] **Settings:** Contact email `sisodiabhumca@gmail.com` added and **verified**
- [ ] Single purpose description entered
- [ ] activeTab justification entered
- [ ] Host permission justification entered
- [ ] Remote code: **No** (or justification above if required)
- [ ] storage justification entered
- [ ] Data usage compliance certified (**Yes**)
- [ ] Privacy policy URL added (GitHub repo must be public)
- [ ] Extension ZIP uploaded (`dist/ai-exporter-chrome-v1.7.0.zip`)
- [ ] Store icon uploaded (`store-listing/icon-128.png`)
- [ ] Screenshots uploaded (6 images)
- [ ] **Save Draft** clicked
- [ ] Submit for review (only after all warnings cleared)
