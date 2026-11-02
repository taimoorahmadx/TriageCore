# QA app candidates for B1

**Reviewed:** 2026-11-02  
**Purpose:** Preserve the search-agent shortlist, record a demo candidate, and flag claims that need checking before copying code.  
**Selection:** `1Marc/modern-todomvc-vanillajs` is the B1 candidate. This is a repository selection, not a completed B1 integration or an evaluation result.

## Selected for the B1 demo

[`1Marc/modern-todomvc-vanillajs`](https://github.com/1Marc/modern-todomvc-vanillajs)

The repository README describes a small TodoMVC implementation of about 200 lines, with native JavaScript modules and no build tools. It provides standard TodoMVC controls, which should make selector rename, thrown-handler, no-op, and delayed-render mutations straightforward. Run it over HTTP because browser modules are not reliably loadable from `file://`. It has no real network request, so a failed-request case will need an injected, deterministic request or a different application.

The README states CC BY 4.0. Keep the required attribution and verify which licence covers each copied asset when integrating. The GitHub root listing did not show a root `LICENSE` file, so preserve the README's attribution/licence statement and check the relevant source/asset terms before copying. Do not represent this as legal review.

**Why this is the best first demo candidate:** the repository specifically claims zero build tooling, its UI and controls match the existing B1 mutation plan, and it has a compact surface area. Compared with the classic TodoMVC repo paths in the search output, it has fewer dependencies and less setup. Its main limitation is that HTTP failure must be injected rather than exercised against a real backend.

## Candidate audit

| # | Search-agent candidate | Audit finding | Future use / caution |
|---|---|---|---|
| 1 | [tastejs/todomvc `examples/vanillajs`](https://github.com/tastejs/todomvc/tree/master/examples/vanillajs) | **Provided path returns 404.** Current repository search results describe a modern framework showcase and say most current examples require package installation/build. The repo is MIT, but this specific candidate/path is not the claimed zero-build vanilla app. | Keep as a source for a canonical spec or newer TodoMVC examples; do not copy from the supplied path. |
| 2 | [1Marc/modern-todomvc-vanillajs](https://github.com/1Marc/modern-todomvc-vanillajs) | README says no build tools, native modules, ~200 LOC, and CC BY 4.0. HTTP serving required. | **Selected B1 candidate.** Attribute it; inject the network-failure case. |
| 3 | [raravi/todo-vanilla](https://github.com/raravi/todo-vanilla) | GitHub lists an MIT licence and ES5, ES6, and MVC variants. Repository root also has package/Babel files, so choose a checked-in browser-ready variant and verify it runs without the build step. | Strong MIT fallback. Confirm folder paths, event behavior, and static serving before use. |
| 4 | [tastejs/todomvc `examples/vanilla-es6`](https://github.com/tastejs/todomvc/tree/master/examples/vanilla-es6) | **Supplied path appears stale.** Search found `examples/javascript-es6`; its page title identifies Webpack. Canonical repo is MIT, but this is not verified as build-free. | Keep only if the build requirement is acceptable or a built artifact is available with clear provenance. |
| 5 | [bradtraversy/50projects50days `todo-list`](https://github.com/bradtraversy/50projects50days/tree/master/todo-list) | Parent repository README confirms MIT and that projects are HTML/CSS/JS. Search result confirms the folder exists. The claimed exact controls and right-click behavior were not checked against source. | Useful MIT alternative; verify interaction semantics and selectors first. |
| 6 | [john-smilga/javascript-basic-projects `14-grocery-bud/final`](https://github.com/john-smilga/javascript-basic-projects/tree/master/14-grocery-bud/final) | Link could not be independently fetched in this audit; the shortlist itself calls the licence a “community” MIT mirror, which is not enough to establish provenance. | Do not copy until the repo, exact subfolder, and licence are verified. Error banner may suit QA signals well. |
| 7 | [bradtraversy/50projects50days `notes-app`](https://github.com/bradtraversy/50projects50days/tree/master/notes-app) | Parent repo confirms MIT and the `notes-app` folder. Exact selectors and static behavior not inspected. | Future CRUD app option; inspect source and mutation feasibility. |
| 8 | [bradtraversy/50projects50days `github-profiles`](https://github.com/bradtraversy/50projects50days/tree/master/github-profiles) | Parent repo confirms MIT and folder. Search shortlist says it calls GitHub's API; this would add network/rate-limit variability to a demo. | Useful later for real network-failure scenarios; avoid as first deterministic benchmark app. |
| 9 | [bradtraversy/50projects50days `content-placeholder`](https://github.com/bradtraversy/50projects50days/tree/master/content-placeholder) | Parent repo confirms MIT and folder. The advertised 2.5-second delay was not confirmed from source in this audit. | Strong future delayed-render scenario, but not a CRUD app for the complete B1 set. |
| 10 | [mithatercan/developer-kanban-board](https://github.com/mithatercan/developer-kanban-board) | Repository page describes a vanilla JavaScript Kanban board. Licence, backend/runtime requirements, and all five mutations were not confirmed here. | Potentially more visually engaging, but higher complexity; verify licence and standalone run before choosing it. |

## Source checks

- The [modern TodoMVC repository README](https://github.com/1Marc/modern-todomvc-vanillajs) states its no-build/native-module design and CC BY 4.0 terms.
- The [current TodoMVC repository](https://github.com/tastejs/todomvc) describes its maintained framework examples and build/test workflow; its [JavaScript ES6 example page](https://github.com/tastejs/todomvc/blob/master/examples/javascript-es6/src/index.html) is titled “JavaScript Es6 Webpack”.
- [Raravi's repository](https://github.com/raravi/todo-vanilla) lists MIT and the ES5/ES6/MVC directories.
- The [50 Projects repository](https://github.com/bradtraversy/50projects50days) lists MIT and identifies its contents as HTML/CSS/JavaScript projects.

The shortlist's detailed claims about exact selectors, event interception, error banners, and individual licence coverage are not automatically verified by these high-level page checks. B1 should inspect the copied snapshot before writing scenarios and labels.
