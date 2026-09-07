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

**Symptom:** `[Errno 98] error while attempting to bind on address ('127.0.0.1', 8000): address already in use`.
**Cause:** A previous instance of the FastAPI/Uvicorn server is already running in the background and occupying port 8000.
**Fix:** Free port 8000 by running `fuser -k 8000/tcp` in your terminal, or find and terminate the process using `lsof -i :8000`.

**Symptom:** `playwright.TimeoutError` or "Browser closed unexpectedly" during early testing.
**Cause:** Playwright requires system-level browser binaries that don't always install via simple `pip install`.
**Fix:** Run `playwright install` and `playwright install-deps` in your terminal to ensure the underlying Chromium/Firefox binaries are present on your OS.

**Symptom:** FastAPI webhook server immediately returns `401 Unauthorized`.
**Cause:** The HMAC signature validation failed. You likely forgot to set the `GITHUB_WEBHOOK_SECRET` in your `.env` file, or it doesn't match the one configured in your GitHub App.
**Fix:** Ensure your `.env` file exists and has the correct `GITHUB_WEBHOOK_SECRET` populated. Restart the server.
