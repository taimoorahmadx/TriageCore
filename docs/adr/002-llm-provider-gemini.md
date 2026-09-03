# 2. Pivot LLM Provider to Google Gemini (Free Tier)

**Date:** 2026-09-02
**Status:** Accepted

## Context
TriageCore heavily relies on Large Language Models (LLMs) for DOM semantic matching and CI log analysis. The initial architecture proposed using OpenAI (`langchain-openai`). However, OpenAI does not offer a free tier, only paid API credits. For a multi-semester Final Year Project (FYP) run by students, minimizing recurring cloud costs is a critical constraint.

## Decision
We have decided to pivot our primary LLM provider from OpenAI to **Google Gemini** via Google AI Studio (`langchain-google-genai`). 

1. **Primary Provider (Gemini 1.5 Flash):** Offers a highly generous free tier (15 RPM, 1 million tokens/min) with a massive context window ideal for parsing large HTML DOMs and raw CI logs.
2. **Official Fallback (Groq / OpenAI-compatible OSS models):** If Gemini imposes stricter rate limits or performance issues arise, we will fall back to Groq (`langchain-groq` or Groq's OpenAI-compatible API) for fast inference of open-source models.

## Consequences
- **Positive:** The team will incur $0 in LLM API costs during FYP-I and FYP-II development and acceptance testing. The 1M token context window of Gemini 1.5 heavily reduces the risk of truncating large CI logs (mitigating an open risk in Milestone 4).
- **Negative/Risk:** The free tier of Gemini AI Studio is subject to rate limiting (15 requests per minute). If the QA Agent fires rapidly during automated suites, it may hit `429 Too Many Requests` errors, requiring us to implement exponential backoff or switch to the Groq fallback.
