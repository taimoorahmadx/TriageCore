// Chart colours: dark-mode steps of the validated reference palette
// (categorical slots 1-3 pass all-pairs CVD checks on the app's #0d0d10 surface).
export const CAUSE = {
  stale_selector: { label: 'Harmless rename', short: 'Rename', color: '#3987e5' },
  likely_regression: { label: 'Real bug', short: 'Bug', color: '#d95926' },
  flaky: { label: 'Slow page', short: 'Slow', color: '#199e70' },
};
export const CAUSE_ORDER = ['stale_selector', 'likely_regression', 'flaky'];

export const POLICY = {
  triagecore: { label: 'TriageCore engine', color: '#3987e5' },
  blind_heal: { label: 'Blind healing', color: '#d95926' },
  penalty_rule: { label: 'Simple penalty rule', color: '#199e70' },
};
export const POLICY_ORDER = ['triagecore', 'penalty_rule', 'blind_heal'];

// Diverging pair (blue <-> red) for "this clue points toward rename vs real bug".
export const TOWARD_RENAME = '#3987e5';
export const TOWARD_BUG = '#e66767';

// Status colours are reserved for decisions and always shipped with an icon + label.
export const ACTION = {
  heal: { label: 'Auto-heal', color: '#0ca30c', tone: 'border-[#0ca30c]/40 bg-[#0ca30c]/10' },
  flag: { label: 'Flag as flaky', color: '#fab219', tone: 'border-[#fab219]/40 bg-[#fab219]/10' },
  escalate: { label: 'Escalate to human', color: '#ec835a', tone: 'border-[#ec835a]/40 bg-[#ec835a]/10' },
};

export const GROUP = {
  runtime_failure: { label: 'Failure signs after click', help: 'Count of: page crash, error banner, failed request' },
  state_progression: { label: 'Expected result appeared?', help: 'Did the step’s success marker show up' },
  console_noise: { label: 'Console errors', help: 'console.error messages written by the page' },
  action_outcome: { label: 'Click executed', help: 'Did the click itself go through' },
  timing: { label: 'Original button reappeared', help: 'Re-tried the original selector with growing pauses' },
};

export const STATE_LABEL = {
  '0': 'none', '1': 'one', '2+': 'two or more',
  reached: 'yes', not_reached: 'no',
  present: 'yes', absent: 'none',
  succeeded: 'yes', failed: 'no',
  resolved_after_wait: 'yes', not_resolved: 'no',
};

export const RISK = {
  low: 'Low risk (reversible)',
  medium: 'Medium risk',
  high: 'High risk (irreversible)',
};

export const pct = (p) => `${(p * 100).toFixed(p > 0.995 || p < 0.005 ? 1 : 0)}%`;
