# Publishing AI Exporter

**Author:** Gaurav Sisodia ([@sisodiabhumca](https://github.com/sisodiabhumca))

## 1. Generate assets

```bash
pip install pillow          # if not installed
python3 scripts/generate-screenshots.py
bash scripts/package-extension.sh
```

Outputs:
- `store-listing/screenshots/*.png` — Chrome Web Store images (1280×800)
- `dist/ai-exporter-chrome-v1.2.0.zip` — upload package

## 2. Publish to Chrome Web Store

1. Create a [Chrome Web Store developer account](https://chrome.google.com/webstore/devconsole) ($5 one-time fee)
2. Click **New Item** → upload `dist/ai-exporter-chrome-v*.zip`
3. Fill in listing from `store-listing/`:
   - **Short description:** `store-listing/short-description.txt`
   - **Detailed description:** `store-listing/description.md`
   - **Category:** Productivity
   - **Language:** English
4. Upload screenshots from `store-listing/screenshots/`:
   - `01-extension-popup.png`
   - `02-floating-export-button.png`
   - `03-export-progress.png`
   - `04-export-formats.png`
   - `05-claude-import.png`
   - `06-gemini-import.png`
5. **Privacy policy URL:** `https://github.com/sisodiabhumca/ai-exporter/blob/main/store-listing/privacy-policy.md`
6. **Permissions justification:** See privacy policy — only accesses chatgpt.com with user's session
7. Submit for review (typically 1–3 business days)

## 3. Publish to Firefox Add-ons

1. Create account at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/)
2. Zip the `extension/` folder (same as Chrome package)
3. Submit for review with the same screenshots and description
4. For signed permanent install, Mozilla review is required

**Temporary install (no review):** `about:debugging` → Load Temporary Add-on

## 4. GitHub repository

```bash
git init
git add .
git commit -m "Initial release: AI Exporter v1.2.0"
gh repo create sisodiabhumca/ai-exporter --public --source=. --push
```

## 5. Checklist before submit

- [ ] Test export on chatgpt.com (personal account)
- [ ] Test export on Enterprise/Team account
- [ ] Test floating Export chat button
- [ ] Test Firefox temporary add-on
- [ ] Screenshots generated and look correct
- [ ] Privacy policy URL is publicly accessible
- [ ] Version bumped in manifest.json
- [ ] ZIP package created without .DS_Store files

## Store listing references

| Asset | Path |
|-------|------|
| Screenshots | `store-listing/screenshots/` |
| Short description | `store-listing/short-description.txt` |
| Full description | `store-listing/description.md` |
| Privacy policy | `store-listing/privacy-policy.md` |
| User guide | `docs/USER_GUIDE.md` |
| Chrome ZIP | `dist/ai-exporter-chrome-v*.zip` |
