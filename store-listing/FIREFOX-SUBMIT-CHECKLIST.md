# Firefox Add-ons (AMO) — Submit Checklist

**Extension:** AI Exporter v1.7.2  
**Contact:** sisodiabhumca@gmail.com  
**Source:** https://github.com/sisodiabhumca/AI-Exporter

---

## 1. Package (use v1.7.2+)

```bash
bash scripts/package-extension.sh
```

Upload: **`dist/ai-exporter-firefox-v1.7.2.zip`** only — not the Chrome zip.

The Firefox package uses **`background.scripts` only** (no `service_worker`). Chrome zip keeps `service_worker` only.

---

## 2. Common AMO errors & fixes

| AMO message | Fix |
|-------------|-----|
| **`service_worker` ignored / unsupported on Firefox** | Use **`dist/ai-exporter-firefox-v*.zip`** — scripts only, no service_worker |
| **Android `data_collection_permissions` min version** | `gecko_android.strict_min_version: 142.0` in manifest |
| **Missing `data_collection_permissions`** | `gecko` + `gecko_android`: `"required": ["none"]` |
| **Invalid or duplicate add-on ID** | Keep `ai-exporter@chatgpt-export.local` — do not change after first successful upload. |
| **Source code required** | On the upload page, provide: `https://github.com/sisodiabhumca/AI-Exporter` and note “unminified source in repo `extension/` folder”. |
| **Permission warnings (host permissions)** | Add reviewer notes (Section 4 below). Expected for a multi-platform export tool. |
| **This slug is already in use** | Pick a different **Add-on URL** slug (Section 3 below). Do not change `gecko.id` in manifest. |

---

## 3. Listing

| Field | Value |
|-------|-------|
| **Name** | AI Exporter |
| **Add-on URL (slug)** | See below — `ai-exporter` is often taken |
| **Summary** | Copy from `store-listing/short-description.txt` |
| **Description** | Copy from `store-listing/description.md` |
| **Category** | Productivity |
| **Icon** | `store-listing/icon-128.png` |
| **Screenshots** | `store-listing/screenshots/*.png` (1280×800) |
| **License** | MIT |
| **Privacy policy** | `https://github.com/sisodiabhumca/AI-Exporter/blob/main/store-listing/privacy-policy.md` |

### Add-on URL slug (“This slug is already in use”)

The **slug** is only the public listing URL, e.g.  
`https://addons.mozilla.org/firefox/addon/ai-chat-exporter/`

It is **not** the same as `browser_specific_settings.gecko.id` in `manifest.json` — keep the manifest ID as `ai-exporter@chatgpt-export.local`.

On the submit form, click **Edit** next to “Add-on URL” and use one of these (first available):

| Try (in order) | Resulting URL |
|----------------|---------------|
| `ai-chat-exporter` | …/addon/ai-chat-exporter/ |
| `ai-exporter-local` | …/addon/ai-exporter-local/ |
| `multi-ai-exporter` | …/addon/multi-ai-exporter/ |
| `chatgpt-claude-exporter` | …/addon/chatgpt-claude-exporter/ |
| `sisodiabhumca-ai-exporter` | …/addon/sisodiabhumca-ai-exporter/ |

**Display name stays “AI Exporter”** — only the URL slug changes.

**If you already started a submission:** go to [Developer Hub](https://addons.mozilla.org/developers/addons) → **My Add-ons** → open the **Incomplete** entry and continue it (don’t click “Submit a new add-on” again — that forces a new slug).

**If a slug looks free but still fails:** another add-on may hold it (disabled/incomplete). Email `amo-admins@mozilla.org` or pick a different slug.

---

## 4. Reviewer notes (paste on submission)

```
AI Exporter lets users export their own AI chat history from supported sites
(ChatGPT, Claude, Gemini, Copilot, DeepSeek, Grok) to local files on their device.

Data handling:
- data_collection_permissions: required ["none"] — no data is transmitted to the
  developer or any third-party server. Export runs entirely in the browser; files
  are saved via the browser download API.
- Host permissions are required to inject the export UI and call each platform's
  same-origin APIs using the user's existing login session.
- alarms + notifications: optional scheduled export only; notification shown
  locally if no supported tab is open at export time.
- storage: saves export preferences and last-export timestamp locally only.

Source code: https://github.com/sisodiabhumca/AI-Exporter (extension/ folder)
```

---

## 5. Source code questionnaire (AMO upload form)

### “Do you use any of the following?”

**Answer: No** to all four options:

| Question | Answer | Why |
|----------|--------|-----|
| Code generators or minifiers | **No** | All `.js` files are hand-written, readable source |
| webpack / file combiners | **No** | No bundler — each file is listed separately in `manifest.json` |
| Web template engines (HTML/CSS) | **No** | Static `popup.html` / CSS only |
| Any other build tool that transforms code | **No** | `scripts/package-extension.sh` only **zips** files and adjusts `manifest.json` for Firefox (`background.scripts`); it does not modify JavaScript |

### “Do you need to submit source code?”

**Usually No** — the uploaded ZIP **is** the source. Reviewers can open any file (e.g. `extension/lib/exporter.js`) directly.

Still provide this **in the notes / source code field** (if shown):

```
Source code is included in the upload — all JavaScript is unminified and readable.

Public repo (same source): https://github.com/sisodiabhumca/AI-Exporter
Extension source lives in the extension/ folder.

Build (optional, for reviewers):
  git clone https://github.com/sisodiabhumca/AI-Exporter.git
  bash scripts/package-extension.sh
  → dist/ai-exporter-firefox-v1.7.2.zip

The only build step is zipping extension/ and setting background.scripts
in manifest.json for Firefox (no JS compilation or minification).
```

If AMO **requires** a separate source upload, upload a zip of the **`extension/`** folder from GitHub (not `dist/`).

---

## 6. Privacy & permissions (for AMO form)

- **Collects data?** No transmission outside the browser (`none` in manifest).
- **Host permissions:** Required for on-page export UI and same-origin API access.
- **alarms / notifications:** Optional recurring export feature only.
- **Remote code:** None — all JS is bundled in the XPI/ZIP.

---

## 7. Test before resubmit

1. `about:debugging` → **Load Temporary Add-on** → select `extension/manifest.json`
2. Open [chatgpt.com](https://chatgpt.com) → sign in → click **Export chat**
3. Confirm panel loads messages and ZIP downloads
4. Firefox **140+** required (current release)

---

## 8. If AMO still warns about `websiteContent`

Only if reviewers reject `none` (rare for local-only exports), change manifest to:

```json
"data_collection_permissions": {
  "required": ["websiteContent", "personalCommunications"]
}
```

and explain in reviewer notes that data is processed locally and never sent to the developer. **Try `none` first** — it matches our privacy policy.

---

## Notes

- Copilot export uses DOM scraping; works in Firefox.
- Upload page: [addons.mozilla.org/developers](https://addons.mozilla.org/developers/)
- If the upload page shows a browser “Client Challenge” error, disable ad blockers or try another browser.
