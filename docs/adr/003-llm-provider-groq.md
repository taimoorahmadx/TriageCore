# 3. LLM Provider: Groq as Primary (supersedes the provider choice in ADR 002)

**Date:** 2026-10-11
**Status:** Accepted

## Context
ADR 002 named Google Gemini (free tier) as the primary LLM and Groq as the fallback. While the proposal-stage POC was being built (2026-09-02), Gemini's free-tier rate limits caused repeated failures during rapid test runs. The POC was therefore built on Groq (model `openai/gpt-oss-20b`, OpenAI-compatible API) and has run on Groq ever since. The Gemini integration was never implemented: no code reads `GEMINI_API_KEY`. The change was recorded in the MILESTONES AI Usage Log but not as an ADR.

## Decision
Groq is the primary LLM provider for all new work. Gemini is no longer a dependency.

The LLM's role is unchanged and deliberately narrow (core-assist under FAST Idea Guide §14):
- relocating a broken selector from the page HTML;
- (Iteration 2) extracting structured facts from CI logs.

The LLM never makes the heal/escalate decision; the ConfidenceEngine does (ADR 004).

## Consequences
- **Positive:** the documentation matches the running code. Groq's low latency keeps the QA heal cycle within the < 10 s target.
- **Negative/Risk:** a single provider. If Groq is unavailable, relocation fails. The engine then receives `relocated_match_count = 0` and escalates, so the system fails safe rather than guessing.
- **Follow-up:** remove the Gemini references from `AGENTS.md` §5, `.env.example`, `pyproject.toml` and the Milestone 3/5 Agent Prompts.
