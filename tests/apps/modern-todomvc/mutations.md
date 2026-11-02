# B1 mutation harness

The copied upstream app remains the control. `js/bootstrap.js` reads `mode`, `target`, and `item` from the query string. It seeds one item in local storage before importing the app module, then adds visible success/error markers for the QA collector. The injected mutation does not write to the project or upstream source files.

| `mode` | Mutation | Expected observable behavior |
|---|---|---|
| `rename` | Renames the control's CSS class while preserving `data-todo`, which the app itself uses for event delegation. | Click works; seeded item is toggled/deleted. |
| `throw` | Renames the control and intercepts the click with an uncaught injected error before the app handler. | Page error is observed; seeded item is unchanged. |
| `noop` | Renames the control and stops the click before the app handler. | No page error; seeded item is unchanged. |
| `request` | Renames the control, stops the app handler, and requests a deliberately missing local resource. | HTTP 404 is observed and an injected error marker appears; seeded item is unchanged. |
| `slow` | Defers importing the app module for 1.8 seconds; the original control is initially absent and later appears. | The original selector resolves after the wait; action then works. |

Targets are `delete` (`button.destroy`) and `toggle` (`input.toggle`). The harness exposes those controls for browser automation. Use distinct `item` IDs and titles per scenario. Suggested URL shape: `apps/modern-todomvc/index.html?mode=rename&target=delete&item=b1-rename-delete`.

For every mode, the test author must independently set the human ground-truth cause and acceptable action in `tests/scenarios/qa_scenarios.yaml` before running an evaluation. This file describes the controlled mutation only; it does not assign evaluation labels.
