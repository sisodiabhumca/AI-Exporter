# Chrome Web Store — Submit Checklist

**Item:** AI Exporter v1.5.0  
**Publisher:** Gaurav Sisodia  
**Contact email:** sisodiabhumca@gmail.com  
**GitHub:** [github.com/sisodiabhumca](https://github.com/sisodiabhumca)

Complete each section below, then click **Save Draft**. Do not click **Submit for review** until every item is checked.

---

## Step 1 — Account Settings (do this first)

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
| **Language** | English |
| **Title** | `AI Exporter — ChatGPT` |
| **Summary** (132 chars max) | Copy from `short-description.txt` below |
| **Description** | Copy from `description.md` |
| **Category** | `Productivity` |
| **Language** | English (United States) |

### Short description (copy-paste)

```
Export ChatGPT, Claude & Gemini to JSON, Markdown, RAG JSONL, PDF. Selective export. Enterprise-ready. 100% local.
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
| **Homepage URL** | `https://github.com/sisodiabhumca/ai-exporter` |
| **Support URL** | `https://github.com/sisodiabhumca/ai-exporter/issues` |

---

## Step 3 — Privacy practices tab

### Single purpose description (copy-paste)

```
AI Exporter has a single purpose: to let users export their own ChatGPT conversation history from chatgpt.com to their local computer in portable file formats (JSON, Markdown, etc.) so they can use that history in other AI tools such as Claude or Gemini. The extension does not modify ChatGPT, inject ads, or collect data for any other purpose.
```

### Permission justifications

**activeTab** — copy-paste:

```
This permission is required so that when the user clicks the extension icon or starts an export, the extension can send a one-time message to the active ChatGPT tab to begin the export. The extension only interacts with the tab the user is currently viewing on chatgpt.com after the user explicitly clicks Export. No background access to other tabs is used.
```

**Host permission** (`https://chatgpt.com/*`, `https://chat.openai.com/*`) — copy-paste:

```
Host permissions are required because the extension must run on chatgpt.com to: (1) show the export UI (progress overlay and optional "Export chat" button), (2) call ChatGPT's same-origin APIs using the user's existing login session to download their conversations, and (3) save exported files to the user's computer. All requests go only to OpenAI's ChatGPT domains. Conversation data is not sent to any server operated by the extension developer.
```

**storage** — copy-paste:

```
The storage permission saves small pieces of local metadata on the user's device: the timestamp of the last successful export (for "New since last export") and the user's export preferences (selected formats, filename pattern, and options). No conversation content, authentication tokens, or personal data are stored in extension storage.
```

**Remote code** — select **No**.

If free text is required:

```
This extension does not use remote code. All JavaScript is bundled in the extension package and runs locally in the browser. Network requests are made only to chatgpt.com to retrieve the signed-in user's own conversation data; no remotely hosted scripts are loaded or executed.
```

### Privacy policy URL

```
https://github.com/sisodiabhumca/ai-exporter/blob/main/store-listing/privacy-policy.md
```

> **Important:** Push your repo to GitHub before submitting so this URL is publicly accessible. Google will check it.

### Data usage — certify compliance

Check **Yes** — I certify that my data usage complies with the Developer Program Policies.

**Rationale:** No user data is collected on developer servers. No selling or sharing of data. All export processing is local. Only chatgpt.com is contacted, using the user's own session, when the user clicks Export.

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

Upload: `dist/ai-exporter-chrome-v1.5.0.zip`

If you changed icons after packaging, regenerate first:

```bash
.venv/bin/python scripts/generate-store-icon.py
bash scripts/package-extension.sh
```

---

## Step 6 — Save Draft

Click **Save Draft** on the item edit page.

Review the draft listing preview. Fix any warnings shown at the top of the page.

---

## Step 7 — Submit for review (after all warnings cleared)

Only click **Submit for review** when:

- [x] Contact email `sisodiabhumca@gmail.com` entered and **verified**
- [ ] Single purpose description entered
- [ ] activeTab justification entered
- [ ] Host permission justification entered
- [ ] storage justification entered
- [ ] Remote code: **No**
- [ ] Data usage compliance certified
- [ ] Privacy policy URL live on GitHub
- [ ] ZIP uploaded
- [ ] Icon + screenshots uploaded
- [ ] **Save Draft** clicked

Typical review time: 1–3 business days.

---

## Contact

**Gaurav Sisodia**  
Email: sisodiabhumca@gmail.com  
GitHub: https://github.com/sisodiabhumca
