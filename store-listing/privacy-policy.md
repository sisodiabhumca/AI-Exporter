# Privacy Policy — AI Exporter

**Last updated:** June 25, 2025  
**Author:** Gaurav Sisodia ([@sisodiabhumca](https://github.com/sisodiabhumca))

## Summary

AI Exporter processes all data **locally in your browser**. We do not collect, store, or transmit your ChatGPT conversations to any external server.

## What data the extension accesses

- Your ChatGPT session token (used only to call `chatgpt.com` APIs on your behalf)
- Your ChatGPT conversation history (downloaded directly to your computer)
- Extension preferences stored locally (e.g., last export timestamp)

## What we do NOT do

- We do not send your data to third-party servers
- We do not use analytics or tracking
- We do not sell or share your data
- We do not store your conversations on any remote server

## Permissions explained

| Permission | Why it's needed |
|------------|-----------------|
| `activeTab` | Communicate with the ChatGPT tab when you click Export |
| `storage` | Remember your last export time for incremental exports |
| `chatgpt.com` host access | Run export scripts on the ChatGPT website using your session |

## Data storage

All exported files are saved directly to your computer via your browser's download mechanism. Incremental export metadata is stored in `chrome.storage.local` on your device only.

## Third-party services

This extension interacts only with **chatgpt.com** (OpenAI) using your existing login session — the same way the ChatGPT website does. No other third-party services are involved.

## Children's privacy

This extension is not directed at children under 13.

## Changes

We may update this policy. Changes will be reflected in the extension's GitHub repository.

## Contact

**Gaurav Sisodia**  
Email: [sisodiabhumca@gmail.com](mailto:sisodiabhumca@gmail.com)  
GitHub: [github.com/sisodiabhumca/ai-exporter](https://github.com/sisodiabhumca/ai-exporter)  
Issues: [github.com/sisodiabhumca/ai-exporter/issues](https://github.com/sisodiabhumca/ai-exporter/issues)
