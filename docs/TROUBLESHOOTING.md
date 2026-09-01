# Troubleshooting Guide

Welcome to the TriageCore troubleshooting guide. If you spend more than 30 minutes blocked on an issue (e.g., Docker crashes, Playwright failures, or API errors), please document the symptom and the fix here so the rest of the team doesn't suffer the same headache.

---

### Format
**Symptom:** What went wrong? (Paste the error message or describe the behavior).
**Cause:** Why did it happen?
**Fix:** How do you solve it?

---

## Known Issues

*(Add new issues above this line)*

**Symptom:** `playwright.TimeoutError` or "Browser closed unexpectedly" during early testing.
**Cause:** Playwright requires system-level browser binaries that don't always install via simple `pip install`.
**Fix:** Run `playwright install` and `playwright install-deps` in your terminal to ensure the underlying Chromium/Firefox binaries are present on your OS.

**Symptom:** FastAPI webhook server immediately returns `401 Unauthorized`.
**Cause:** The HMAC signature validation failed. You likely forgot to set the `GITHUB_WEBHOOK_SECRET` in your `.env` file, or it doesn't match the one configured in your GitHub App.
**Fix:** Ensure your `.env` file exists and has the correct `GITHUB_WEBHOOK_SECRET` populated. Restart the server.
