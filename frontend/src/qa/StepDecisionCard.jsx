import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Flag, Info, ShieldAlert, XCircle } from 'lucide-react';
import { CauseBars, EvidenceBars, LossBars } from './charts';
import { ACTION, CAUSE, RISK, pct } from './theme';

const ACTION_ICON = { heal: CheckCircle2, flag: Flag, escalate: ShieldAlert };

function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block ml-1">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(!open)}
        className="text-neutral-500 hover:text-neutral-300 transition-colors p-0.5 rounded cursor-help inline-flex items-center"
        aria-label="Info"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 w-64 p-2 text-[11px] leading-normal text-neutral-200 bg-[#16161a] border border-white/10 rounded-lg shadow-xl backdrop-blur-md pointer-events-none">
          {text}
        </div>
      )}
    </div>
  );
}

function Section({ n, title, hint, children }) {
  return (
    <section className="space-y-3 bg-black/25 p-4 rounded-xl border border-white/[0.04]">
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-white/[0.06] text-neutral-300 text-[10px] font-mono font-bold flex items-center justify-center">{n}</span>
          <span className="text-xs font-semibold text-white tracking-tight">{title}</span>
          {hint && <InfoTooltip text={hint} />}
        </div>
      </div>
      <div>
        {children}
      </div>
    </section>
  );
}

function Observed({ step }) {
  const s = step.raw_signals;
  const o = step.observations || {};
  const yesNo = (v) => (v == null ? <span className="text-neutral-500 font-mono">not checked</span> : v ? <span className="text-[#30d158] font-mono font-semibold">yes</span> : <span className="text-neutral-400 font-mono">no</span>);
  const rows = [
    ['Original button reappeared after waiting', yesNo(s.original_resolved_after_wait)],
    ['New button proposed by Groq', step.context.proposed_selector
      ? <code key="v" className="text-neutral-200 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.06] text-[11px]">{step.context.proposed_selector}</code>
      : <span key="v" className="text-neutral-500 font-mono">{s.original_resolved_after_wait ? 'not needed' : 'none'}</span>],
    ['Elements matching it', s.relocated_match_count ?? <span key="v" className="text-neutral-500 font-mono">n/a</span>],
    ['Click went through', yesNo(s.action_succeeded)],
    ['Expected result appeared', yesNo(s.expected_state_reached)],
    ['Error banner shown', s.error_state_shown ? <span className="text-[#ff453a] font-mono font-semibold">yes</span> : yesNo(s.error_state_shown)],
    ['Page crashes (uncaught errors)', s.uncaught_page_errors > 0 ? <span className="text-[#ff453a] font-mono font-semibold">{s.uncaught_page_errors}</span> : (s.uncaught_page_errors ?? '—')],
    ['Failed network requests', s.failed_requests > 0 ? <span className="text-[#ff453a] font-mono font-semibold">{s.failed_requests}</span> : (s.failed_requests ?? '—')],
    ['Console errors', s.console_errors > 0 ? <span className="text-[#ff9f0a] font-mono font-semibold">{s.console_errors}</span> : (s.console_errors ?? '—')],
  ];
  const messages = [...(o.page_errors || []).map((m) => ['crash', m]), ...(o.failed_requests || []).map((m) => ['request', m]), ...(o.console_errors || []).map((m) => ['console', m])];
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between items-center gap-3 border-b border-white/[0.04] pb-1.5">
            <dt className="text-neutral-400 text-[11px]">{k}</dt>
            <dd className="text-right font-mono text-neutral-200">{v}</dd>
          </div>
        ))}
      </dl>
      {step.relocation_error && (
        <div className="flex items-start gap-2 rounded-xl border border-[#ff9f0a]/30 bg-[#ff9f0a]/10 px-3.5 py-2.5 text-xs text-neutral-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-[#ff9f0a]" />
          <span>Relocation problem: {step.relocation_error}</span>
        </div>
      )}
      {messages.length > 0 && (
        <div className="max-h-28 overflow-auto rounded-xl border border-white/[0.08] bg-black/70 p-3 font-mono text-[11px] text-neutral-300 space-y-1">
          {messages.map(([kind, m], i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`px-1 py-0.2 rounded text-[10px] uppercase font-bold ${
                kind === 'crash' ? 'text-[#ff453a] bg-[#ff453a]/15' :
                kind === 'request' ? 'text-[#ff9f0a] bg-[#ff9f0a]/15' :
                'text-[#0a84ff] bg-[#0a84ff]/15'
              }`}>[{kind}]</span>
              <span className="flex-1 break-all text-neutral-300">{m}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StepDecisionCard({ step, index, priors }) {
  const [showTrace, setShowTrace] = useState(false);
  if (step.status === 'error') {
    return (
      <div className="glass-card rounded-2xl border border-[#ff453a]/30 p-5 text-sm text-neutral-200">
        <div className="flex items-center gap-2 font-semibold text-[#ff453a]">
          <AlertTriangle className="h-4 w-4" />
          Step {index + 1} · {step.name}: Escalated (fail-safe)
        </div>
        <p className="mt-2 break-words font-mono text-xs text-neutral-300">{step.error}</p>
      </div>
    );
  }
  if (!step.engine) {
    return (
      <div className="glass-card rounded-2xl p-5 text-sm text-neutral-300">
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
    <article className="glass-card overflow-hidden rounded-2xl shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] bg-white/[0.015] px-6 py-4.5">
        <div className="min-w-0">
          <div className="font-mono text-[11px] text-neutral-500 uppercase tracking-wider">STEP {index + 1} · {RISK[step.risk_tier]}</div>
          <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">{step.name}</h3>
          <div className="mt-1 font-mono text-[11px] text-neutral-400">
            looked for <code className="text-neutral-200">{step.context.original_selector}</code>
            {step.context.proposed_selector && <> → found <code className="text-neutral-200">{step.context.proposed_selector}</code></>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${act.tone}`}>
            <Icon className="h-3.5 w-3.5" style={{ color: act.color }} />{act.label}
          </span>
          <span className="text-[11px] text-neutral-400">
            Most likely cause: <b className="text-neutral-200 font-medium">{CAUSE[e.classification].label}</b> ({pct(d.posterior[e.classification])})
          </span>
        </div>
      </header>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-2">
        <Section n="1" title="What the browser saw" hint="Collected by Playwright after the click">
          <Observed step={step} />
        </Section>

        <Section n="2" title="Most likely cause" hint="Starting guess updated by every clue (Bayes' rule)">
          <CauseBars posterior={d.posterior} />
        </Section>

        <div className="lg:col-span-2">
          <details className="rounded-xl border border-white/[0.06] bg-black/20 p-4 transition-all">
            <summary className="cursor-pointer text-xs font-semibold text-neutral-300 flex items-center justify-between select-none">
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white/[0.06] text-neutral-400 text-[10px] font-mono font-bold flex items-center justify-center">3</span>
                <span>Bayesian evidence weights & decision math</span>
              </span>
              <span className="text-[11px] font-mono text-neutral-500 hover:text-neutral-300">Click to expand / collapse</span>
            </summary>
            
            <div className="mt-4 grid gap-6 pt-4 border-t border-white/[0.04] lg:grid-cols-2">
              <Section n="A" title="Which way each clue points" hint="Bar length = how strongly the clue changes the odds (hover for the factor)">
                <EvidenceBars details={d} priors={priors} />
                {d.missing_groups?.length > 0 && (
                  <p className="text-[11px] text-neutral-500">Not observed, so ignored (never assumed fine): {d.missing_groups.join(', ')}</p>
                )}
              </Section>

              <Section n="B" title="Decision: cheapest action on average" hint="Probability of each cause × cost of a wrong action at this risk level. Lower is better.">
                <LossBars details={d} chosen={e.recommended_action} />
                {heal != null && (
                  <p className="text-[11px] text-neutral-400">
                    At {step.risk_tier} risk, auto-heal needs P(harmless rename) ≥ <b className="text-neutral-200">{pct(heal)}</b>; this step: <b className="text-neutral-200">{pct(d.posterior.stale_selector)}</b>.
                  </p>
                )}
              </Section>
            </div>
          </details>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] bg-white/[0.01] px-6 py-3.5 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-neutral-400">
          <span className="flex items-center gap-1.5">
            {sc.action_acceptable ? <CheckCircle2 className="h-3.5 w-3.5 text-[#30d158]" /> : <XCircle className="h-3.5 w-3.5 text-[#ff453a]" />}
            Ground truth: {CAUSE[step.truth.cause].label}; acceptable: {step.truth.acceptable.join(' or ')}
          </span>
          {sc.masked_regression && <span className="font-semibold text-[#ff453a]">⚠ real bug let through</span>}
          <span className="font-mono text-neutral-500 tabular-nums">
            step {step.timings_ms.total} ms{step.timings_ms.relocation ? ` · Groq ${step.timings_ms.relocation} ms` : ''} · engine {step.timings_ms.engine} ms
          </span>
        </div>
        <button onClick={() => setShowTrace(!showTrace)} className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors cursor-pointer">
          Engine explanation <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showTrace ? 'rotate-180' : ''}`} />
        </button>
      </footer>
      {showTrace && (
        <pre className="whitespace-pre-wrap border-t border-white/[0.06] bg-black/60 px-6 py-4 font-mono text-[11px] leading-relaxed text-neutral-300">
          {e.reasoning_trace.split('. ').join('.\n')}
        </pre>
      )}
    </article>
  );
}
