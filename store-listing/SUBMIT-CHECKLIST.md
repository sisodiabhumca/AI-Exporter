# Chrome Web Store — Submit Checklist

**Item:** AI Exporter v1.7.2  
**Publisher:** Gaurav Sisodia  
**Contact email:** sisodiabhumca@gmail.com  
**GitHub:** [github.com/sisodiabhumca/AI-Exporter](https://github.com/sisodiabhumca/AI-Exporter)

Complete each section, then click **Save Draft**. Submit for review only when all warnings are cleared.

**Privacy copy-paste (detailed):** [privacy-practices-answers.md](./privacy-practices-answers.md)  
**Firefox AMO (separate):** [FIREFOX-SUBMIT-CHECKLIST.md](./FIREFOX-SUBMIT-CHECKLIST.md)

---

## Step 1 — Account settings (do this first)

**Dashboard → Settings (gear icon)**

| Field | Value |
|-------|-------|
| **Publisher contact email** | `sisodiabhumca@gmail.com` |
| **Verify email** | Check inbox → click Google verification link |

You cannot publish until this email is verified.

---

## Step 2 — Store listing tab

| Field | Value |
|-------|-------|
| **Language** | English (United States) |
| **Title** | `AI Exporter` |
| **Summary** (132 chars max) | Copy from below or `short-description.txt` |
| **Description** | Copy from `description.md` |
| **Category** | `Productivity` |

### Short description (copy-paste)

> **Policy note:** Do not list multiple AI brand names in the summary or description ([keyword spam FAQ](https://developer.chrome.com/webstore/spam-faq#keyword-spam)). The **Summary** must match `manifest.json` `description` — Chrome shows it above the long description.

```
Export AI chat history to your computer as JSON, Markdown, PDF, and knowledge-base files. Fully local.
```

### Icon

Upload: `store-listing/icon-128.png` (128×128 PNG)

### Screenshots (upload 7, 1280×800)

1. `store-listing/screenshots/01-extension-popup.png`
2. `store-listing/screenshots/02-floating-export-button.png`
3. `store-listing/screenshots/03-export-progress.png`
4. `store-listing/screenshots/04-export-formats.png`
5. `store-listing/screenshots/05-claude-import.png`
6. `store-listing/screenshots/06-gemini-import.png`
7. `store-listing/screenshots/07-export-panel.png`

### Optional URLs

| Field | Value |
|-------|-------|
| **Homepage URL** | `https://github.com/sisodiabhumca/AI-Exporter` |
| **Support URL** | `https://github.com/sisodiabhumca/AI-Exporter/issues` |

---

## Step 3 — Privacy practices tab

Use [privacy-practices-answers.md](./privacy-practices-answers.md) for full text. Summary below.

### Single purpose description (copy-paste)

```
AI Exporter has a single purpose: to let users export their own AI conversation history from supported chat platforms (ChatGPT, Claude, Gemini, Copilot, DeepSeek, Grok) to their local computer in portable file formats (JSON, Markdown, RAG JSONL, etc.) so they can archive, migrate, or use that history in other tools. The extension does not modify these sites, inject ads, or collect data for any other purpose.
```

### Permission justifications

**activeTab** — copy-paste:

```
This permission is required so that when the user clicks the extension icon or starts an export, the extension can send a one-time message to the active tab (a supported AI chat site) to begin the export. The extension only interacts with the tab the user is currently viewing after the user explicitly clicks Export. No background access to other tabs is used.
```

**Host permissions** — copy-paste:

```
Host permissions are required because the extension must run on supported AI chat sites to: (1) inject the export UI (progress overlay and "Export chat" button), (2) call each platform's same-origin APIs (or read page content for Copilot) using the user's existing login session to download their conversations, and (3) save exported files to the user's computer. Hosts: chatgpt.com, chat.openai.com, claude.ai, gemini.google.com, copilot.microsoft.com, chat.deepseek.com, grok.com. Conversation data is not sent to any server operated by the extension developer.
```

**storage** — copy-paste:

```
The storage permission saves small pieces of local metadata on the user's device: the timestamp of the last successful export (for "New since last export"), export preferences (formats, filename pattern, options), and optional scheduled-export settings. No conversation content, authentication tokens, or personal data are stored in extension storage.
```

**alarms** — paste into the **alarms** justification field on Privacy practices:

```
The alarms permission supports the optional scheduled export feature. When the user enables recurring export in the extension popup, the extension schedules a local alarm (daily, weekly, or monthly) to trigger an export at the chosen interval. The alarm runs only in the user's browser; no data is sent to the extension developer or any third party.
```

**notifications** — paste into the **notifications** justification field on Privacy practices:

```
The notifications permission is used only when a scheduled export cannot run because no supported AI chat tab is open. The extension then shows a single local notification reminding the user to open ChatGPT, Claude, Gemini, or another supported site so the export can proceed. Notifications are not used for marketing or analytics. No conversation data is included in notifications.
```

**Remote code** — select **No**.

If free text is required:

```
This extension does not use remote code. All JavaScript is bundled in the extension package and runs locally in the browser. Network requests go only to supported AI platform domains to retrieve the signed-in user's own conversation data; no remotely hosted scripts are loaded or executed.
```

### Privacy policy URL

```
https://github.com/sisodiabhumca/AI-Exporter/blob/main/store-listing/privacy-policy.md
```

> Repo must be **public** before submit — Google checks this URL.

### Data usage — certify compliance

Check **Yes** — I certify that my data usage complies with the Developer Program Policies.

**Rationale:** No user data on developer servers. No selling or sharing. All export processing is local. Platform domains are contacted only when the user clicks Export, using their existing session.

### Data collection questionnaire (if shown)

| Question | Answer |
|----------|--------|
| Personally identifiable information | **No** |
| Health information | **No** |
| Financial / payment information | **No** |
| Authentication information | **No** (session used in-page only; not stored by extension) |
| Personal communications | **No** (not transmitted to developer) |
| Location | **No** |
| Web history | **No** |
| User activity | **No** |
| Website content | **No** (processed locally; not sent to developer) |

---

## Step 4 — Distribution tab

| Field | Value |
|-------|-------|
| **Visibility** | Public |
| **Regions** | All regions (or your preference) |
| **Pricing** | Free |

---

## Step 5 — Package tab

**Upload the Chrome zip only** (not the Firefox build):

```bash
bash scripts/package-extension.sh
```

Upload: `dist/ai-exporter-chrome-v1.7.2.zip`

| Package | Use for |
|---------|---------|
| `dist/ai-exporter-chrome-v*.zip` | **Chrome Web Store** (`background.service_worker`) |
| `dist/ai-exporter-firefox-v*.zip` | **Firefox AMO only** — do not upload to Chrome |

Regenerate assets if needed:

```bash
bash scripts/package-extension.sh
# Screenshots (optional refresh):
# python3 scripts/generate-screenshots.py  # requires Pillow
```

---

## Step 6 — Updating an existing listing (after first submit)

If the extension is **already in review** or **published**:

1. Developer Dashboard → **AI Exporter** → **Package** → **Upload new package**
2. Upload latest `dist/ai-exporter-chrome-v1.7.2.zip`
3. Update **Store listing** / **Privacy** if permissions or platforms changed
4. **Save Draft** → **Submit for review** (or publish update when approved)

You do **not** need to create a new listing item for version updates.

---

## Step 7 — Save draft & submit

Click **Save Draft**, fix any warnings at the top of the page, then **Submit for review** when:

- [ ] Contact email `sisodiabhumca@gmail.com` entered and **verified**
- [ ] Title, summary, and description updated (no platform keyword lists — see `description.md`)
- [ ] Single purpose description entered
- [ ] activeTab justification entered
- [ ] Host permission justification entered (all 7 domains)
- [ ] storage justification entered
- [ ] **alarms** justification entered (Privacy practices tab)
- [ ] **notifications** justification entered (Privacy practices tab)
- [ ] Remote code: **No**
- [ ] Data usage compliance certified (**Yes**)
- [ ] Privacy policy URL live on GitHub
- [ ] Chrome ZIP uploaded (`dist/ai-exporter-chrome-v1.7.2.zip`)
- [ ] Icon + 7 screenshots uploaded
- [ ] **Save Draft** clicked
- [ ] Submit for review (only after warnings cleared)

Typical review time: 1–3 business days (first submit); updates often faster.

---

## Resubmit after metadata rejection (Yellow Argon / keyword stuffing)

**Violation ID:** Yellow Argon — [troubleshooting guide](https://developer.chrome.com/docs/webstore/troubleshooting/#keyword-stuffing)  
**Policy:** [Spam & Placement](https://developer.chrome.com/webstore/program_policies#spam) · [Keyword spam FAQ](https://developer.chrome.com/webstore/spam-faq#keyword-spam)

Google’s explicit example: *“a long list of the different sites on which the extension works.”* The [FAQ](https://developer.chrome.com/webstore/spam-faq#keyword-spam) adds:

- Do **not** list more than **five** supported websites/brands in the **description**
- For a longer list → link to docs or show it in a **screenshot**
- Keep any single keyword under **5** uses; avoid unnatural repetition
- Description should cover **extension functionality only** (not general industry info)

**Resubmit steps:**

1. **Store listing** → replace **Summary** and **Description** with `short-description.txt` and `description.md`.
2. Optional: add supported-site names to screenshot `04-export-formats.png` or rely on the User Guide link in the description.
3. Leave **Privacy practices** justifications as-is — host domains there are functional, not marketing metadata.
4. **Package** → re-upload the same Chrome zip if code unchanged.
5. **Save Draft** → **Submit for review**.

---

## Supported platforms (v1.7.2)

| Platform | Domain |
|----------|--------|
| ChatGPT | chatgpt.com, chat.openai.com |
| Claude | claude.ai |
| Gemini | gemini.google.com |
| Copilot | copilot.microsoft.com |
| DeepSeek | chat.deepseek.com |
| Grok | grok.com |

---

## Contact

**Gaurav Sisodia**  
Email: sisodiabhumca@gmail.com  
GitHub: https://github.com/sisodiabhumca/AI-Exporter
