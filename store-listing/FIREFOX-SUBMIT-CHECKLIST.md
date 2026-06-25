# Firefox Add-ons (AMO) — Submit Checklist

**Extension:** AI Exporter v1.7.0  
**Contact:** sisodiabhumca@gmail.com

## Package

1. Zip the `extension/` folder (same as Chrome)
2. Upload at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/)

## Listing

- **Name:** AI Exporter
- **Summary:** Copy from `store-listing/short-description.txt`
- **Description:** Copy from `store-listing/description.md`
- **Category:** Productivity
- **Screenshots:** `store-listing/screenshots/*.png`
- **Icon:** `store-listing/icon-128.png`

## Privacy

- All processing is local in the browser
- Host permissions: ChatGPT, Claude, Gemini, Copilot, DeepSeek, Grok
- `alarms` + `notifications` for optional scheduled exports only
- No data sent to developer servers

## Notes

- `browser_specific_settings.gecko.id` is set in manifest.json
- Test with **Load Temporary Add-on** at `about:debugging`
- Copilot export may be blocked in **Edge** (Microsoft restriction) — works in Firefox and Chrome

## Source code

Submit link to GitHub: https://github.com/sisodiabhumca/ai-exporter
