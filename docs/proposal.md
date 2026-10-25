**AI QA Engineer & CI Reliability Agent**

*A Shared Confidence-Scoring Engine for Self-Healing Test Automation and CI Failure Triage*

**What Is It?**

The core of this project is a shared **confidence-scoring and failure-classification engine**: given ambiguous evidence about why something in the pipeline broke, it decides whether the system can act on its own or must escalate to a human. On the QA side, it decides whether a broken Playwright selector should be healed automatically or flagged as a possible real regression. On the CI side, the same engine, same taxonomy, same evidence-weighting classifies a broken build as flaky, a dependency break, a real bug, or an infra issue, and decides whether a fix can be proposed automatically. The two agents are two applications of one decision engine, not two tools placed side by side.

**The Problem**

UI test suites break constantly as selectors go stale, so teams either burn hours on maintenance or let suites go stale and skip them, letting real regressions through. Separately, CI failures are triaged manually: someone reads logs, decides flaky test vs. dependency break vs. real bug, then acts. Both are the same underlying decision problem: is this evidence strong enough to act on automatically, and what does it cost if I'm wrong, solved today by ad hoc manual judgment with no reusable, auditable process behind it.

**Why This Is a Complex Computing Problem**

* **Conflicting requirements:** automation speed vs. the cost of a wrong automatic decision (a masked regression, or a bad auto-merged fix).

* **No obvious solution:** no standard algorithm separates a stale selector from a real regression, or a flaky test from a genuine bug, from the same surface evidence.

* **Ill-defined cause:** root cause is unknown by definition; tracing a CI failure to a responsible commit across noisy, overlapping logs is an open diagnostic problem.

* **Significant consequences:** a wrong auto-decision can silently mask a bug or merge a bad fix, which is why decisions are human-gated under a real cost/latency budget.

**What We're Building (v1 committed scope)**

* Natural language test planner and browser execution layer, scoped to Playwright.

* Self-healing selectors via DOM/semantic matching (role, text, structural position); visual matching is a stretch goal, not v1.

* CI log ingestion and failure classification for GitHub Actions: flaky test, dependency break, real bug, or infra issue.

* Commit-level root-cause tracing, scoped to single-repo, single-provider (GitHub Actions).

* The shared confidence-scoring engine: one module, one output contract, used by both the self-heal and auto-fix decisions.

* Human-gated auto-fix pull requests, plus a benchmark of mutated repos (known-cause failures) for evaluation, and a dashboard for pass/fail history, flakiness trends, and fix acceptance rate.

*The LLM performs the reasoning step: planning actions, proposing fixes, reading logs. The contribution is the confidence-scoring engine governing when that reasoning can be trusted to act automatically, the shared taxonomy that makes it reusable across both agents, the commit-level root-cause tracing built around it, and the benchmark used to evaluate all of it against ground truth.*

**Technology Stack**

| Component | Detail |
| :---- | :---- |
| **Browser Automation** | Playwright as the execution layer (v1 scope) |
| **AI Reasoning** | LLM (Claude / GPT / Gemini) for planning, self-healing, and log analysis |
| **Agent Orchestration** | LangGraph or CrewAI, coordinating planner, executor, and analyzer agents around the shared confidence engine |
| **CI Integration** | GitHub Apps / Webhooks API (GitHub Actions only, v1) |
| **Data & Queue** | Postgres for run history and evaluation data; Redis with a queue for parallel jobs |
| **Deployment** | Docker, deployed to a cloud environment |

**Use Cases / Who Benefits**

* Small dev teams without dedicated QA headcount.

* Open source maintainers drowning in CI noise on every pull request.

* Indie SaaS builders and solo founders shipping alone.

* Agencies and freelancers maintaining many client sites at once.

* Internal platform and DevEx teams maintaining pipelines across several services.

* Teams doing frequent releases where manual regression testing does not scale.