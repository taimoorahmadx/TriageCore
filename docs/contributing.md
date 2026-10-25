# Contributing

## Workflow

1. Update `main`: `git checkout main && git pull origin main`
2. Branch: `git checkout -b <type>/<short-description>`, where type is `feature`, `bugfix` or `chore`
   (e.g. `feature/ci-log-facts`).
3. Work, then check: `make verify` (tests, weights check, frontend build).
4. Stage the files you changed by name (not `git add .`), then commit with a
   [Conventional Commit](https://www.conventionalcommits.org) message, optional scope:
   `feat(core): ...`, `fix(browser): ...`, `docs: ...`, `test(qa): ...`, `chore: ...`
5. Push: `git push -u origin <branch>` and open a pull request.
6. Ask another member to review before merging. The reviewer should be able to explain the change.
7. After merging: `git checkout main && git pull && git branch -d <branch>`.

## Rules

- Commit under your own name; ownership is assessed from repo history and your ability to explain it.
- Non-trivial AI-assisted changes get one line in `docs/log/ai-usage-log.md`.
- Scope, design, target or ownership changes get a row in `docs/log/changes.md` first.
- Never commit `.env` or other secrets.
- PRs opened by the CI agent are never routine: read the confidence score and reasoning trace in
  the PR body before merging.
