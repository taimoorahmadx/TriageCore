import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Flag, ShieldAlert, XCircle } from 'lucide-react';
import { CauseBars, EvidenceBars, LossBars } from './charts';
import { ACTION, CAUSE, RISK, pct } from './theme';

const ACTION_ICON = { heal: CheckCircle2, flag: Flag, escalate: ShieldAlert };

function Section({ n, title, hint, children }) {
  return (
    <section className="space-y-3">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">{n} · {title}</div>
        {hint && <div className="text-[11px] text-neutral-500">{hint}</div>}
      </div>
      {children}
    </section>
  );
}

function Observed({ step }) {
  const s = step.raw_signals;
  const o = step.observations || {};
  const yesNo = (v) => (v == null ? <span className="text-neutral-500">not checked</span> : v ? 'yes' : 'no');
  const rows = [
    ['Original button reappeared after waiting', yesNo(s.original_resolved_after_wait)],
    ['New button proposed by Groq', step.context.proposed_selector
      ? <code key="v" className="text-neutral-200">{step.context.proposed_selector}</code>
      : <span key="v" className="text-neutral-500">{s.original_resolved_after_wait ? 'not needed' : 'none'}</span>],
    ['Elements matching it', s.relocated_match_count ?? <span key="v" className="text-neutral-500">n/a</span>],
    ['Click went through', yesNo(s.action_succeeded)],
    ['Expected result appeared', yesNo(s.expected_state_reached)],
    ['Error banner shown', yesNo(s.error_state_shown)],
    ['Page crashes (uncaught errors)', s.uncaught_page_errors ?? '—'],
    ['Failed network requests', s.failed_requests ?? '—'],
    ['Console errors', s.console_errors ?? '—'],
  ];
  const messages = [...(o.page_errors || []).map((m) => ['crash', m]), ...(o.failed_requests || []).map((m) => ['request', m]), ...(o.console_errors || []).map((m) => ['console', m])];
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-white/[0.04] pb-1">
            <dt className="text-neutral-400">{k}</dt><dd className="text-right font-mono text-neutral-200">{v}</dd>
          </div>
        ))}
      </dl>
      {step.relocation_error && (
        <div className="flex items-start gap-2 rounded-md border border-[#fab219]/30 bg-[#fab219]/5 px-3 py-2 text-xs text-neutral-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-[#fab219]" />
          <span>Relocation problem: {step.relocation_error}</span>
        </div>
      )}
      {messages.length > 0 && (
        <div className="max-h-28 overflow-auto rounded-md border border-white/[0.06] bg-black/60 p-2 font-mono text-[11px] text-neutral-400">
          {messages.map(([kind, m], i) => <div key={i}><span className="text-neutral-600">[{kind}]</span> {m}</div>)}
        </div>
      )}
    </div>
  );
}

export function StepDecisionCard({ step, index, priors }) {
  const [showTrace, setShowTrace] = useState(false);
  if (!step.engine) {
    return (
      <div className="glass-card rounded-xl p-5 text-sm text-neutral-300">
        Step {index + 1} · {step.name}: the original selector still works, so there was nothing to triage.
      </div>
    );
  }
  const e = step.engine;
  const d = step.details;
  const act = ACTION[e.recommended_action];
  const Icon = ACTION_ICON[e.recommended_action];
  const sc = step.score;
  const heal = d.thresholds?.heal;

  return (
    <article className="glass-card overflow-hidden rounded-xl">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
        <div className="min-w-0">
          <div className="font-mono text-[11px] text-neutral-500">STEP {index + 1} · {RISK[step.risk_tier]}</div>
          <h3 className="text-base font-semibold text-white">{step.name}</h3>
          <div className="mt-1 font-mono text-[11px] text-neutral-500">
            looked for <code className="text-neutral-300">{step.context.original_selector}</code>
            {step.context.proposed_selector && <> → found <code className="text-neutral-300">{step.context.proposed_selector}</code></>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold text-white ${act.tone}`}>
            <Icon className="h-4 w-4" style={{ color: act.color }} />{act.label}
          </span>
          <span className="text-[11px] text-neutral-400">
            Most likely cause: <b className="text-neutral-200">{CAUSE[e.classification].label}</b> ({pct(d.posterior[e.classification])})
          </span>
        </div>
      </header>

      <div className="grid gap-8 px-5 py-5 lg:grid-cols-2">
        <Section n="1" title="What the browser saw" hint="Collected by Playwright after the click">
          <Observed step={step} />
        </Section>

        <Section n="2" title="Which way each clue points" hint="Bar length = how strongly the clue changes the odds (hover for the factor)">
          <EvidenceBars details={d} priors={priors} />
          {d.missing_groups?.length > 0 && (
            <p className="text-[11px] text-neutral-500">Not observed, so ignored (never assumed fine): {d.missing_groups.join(', ')}</p>
          )}
        </Section>

        <Section n="3" title="Most likely cause" hint="Starting guess updated by every clue (Bayes' rule)">
          <CauseBars posterior={d.posterior} />
        </Section>

        <Section n="4" title="Decision: cheapest action on average" hint="Probability of each cause × cost of a wrong action at this risk level. Lower is better.">
          <LossBars details={d} chosen={e.recommended_action} />
          {heal != null && (
            <p className="text-[11px] text-neutral-400">
              At {step.risk_tier} risk, auto-heal needs P(harmless rename) ≥ <b className="text-neutral-200">{pct(heal)}</b>; this step: <b className="text-neutral-200">{pct(d.posterior.stale_selector)}</b>.
            </p>
          )}
        </Section>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-neutral-400">
          <span className="flex items-center gap-1.5">
            {sc.action_acceptable ? <CheckCircle2 className="h-3.5 w-3.5 text-[#0ca30c]" /> : <XCircle className="h-3.5 w-3.5 text-[#d03b3b]" />}
            Ground truth: {CAUSE[step.truth.cause].label}; acceptable: {step.truth.acceptable.join(' or ')}
          </span>
          {sc.masked_regression && <span className="font-semibold text-[#d03b3b]">⚠ real bug let through</span>}
          <span className="font-mono text-neutral-500">
            step {step.timings_ms.total} ms{step.timings_ms.relocation ? ` · Groq ${step.timings_ms.relocation} ms` : ''} · engine {step.timings_ms.engine} ms
          </span>
        </div>
        <button onClick={() => setShowTrace(!showTrace)} className="flex items-center gap-1 text-neutral-400 hover:text-white">
          Engine explanation <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showTrace ? 'rotate-180' : ''}`} />
        </button>
      </footer>
      {showTrace && (
        <pre className="whitespace-pre-wrap border-t border-white/[0.06] bg-black/60 px-5 py-4 font-mono text-[11px] leading-relaxed text-neutral-400">
          {e.reasoning_trace.split('. ').join('.\n')}
        </pre>
      )}
    </article>
  );
}
