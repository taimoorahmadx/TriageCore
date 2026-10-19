import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Play } from 'lucide-react';
import { pageUrl, qaApi } from './api';
import { StepDecisionCard } from './StepDecisionCard';
import { ACTION, CAUSE, CAUSE_ORDER, RISK, pct } from './theme';

function useElapsed(running) {
  const [ms, setMs] = useState(0);
  const start = useRef(0);
  useEffect(() => {
    if (!running) return undefined;
    start.current = performance.now();
    const id = setInterval(() => setMs(performance.now() - start.current), 100);
    return () => clearInterval(id);
  }, [running]);
  return ms;
}

function StatusBanner({ status, error }) {
  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[#ff453a]/30 bg-[#ff453a]/10 px-4 py-3 text-sm text-neutral-200">
        <AlertTriangle className="h-4 w-4 text-[#ff453a]" />
        API not reachable on :8000. Start it with <code className="font-mono">python3 -m uvicorn poc_api.main:app --port 8000</code>
      </div>
    );
  }
  if (!status) return null;
  const items = [
    [status.engine_ready, status.engine_ready ? 'Engine loaded (weights.yaml valid)' : `Engine unavailable: ${status.engine_error}`],
    [status.groq_configured, status.groq_configured ? 'Groq relocation available' : 'GROQ_API_KEY missing: relocation will fail, so every renamed step escalates (fail-safe)'],
  ];
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
      {items.map(([ok, text]) => (
        <span key={text} className="flex items-center gap-1.5 text-neutral-300">
          {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-[#30d158]" /> : <AlertTriangle className="h-3.5 w-3.5 text-[#ff9f0a]" />}{text}
        </span>
      ))}
    </div>
  );
}

function EngineNumbers({ engine }) {
  if (!engine) return null;
  return (
    <details className="glass-card rounded-2xl px-5 py-4 text-xs text-neutral-400">
      <summary className="cursor-pointer text-sm text-neutral-200 font-medium">The human-authored numbers behind every decision</summary>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div>
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-neutral-500">Starting guess (of 100 broken steps)</div>
          {CAUSE_ORDER.map((c) => <div key={c} className="flex justify-between border-b border-white/[0.04] py-1"><span>{CAUSE[c].label}</span><span className="font-mono tabular-nums text-neutral-200">{Math.round(engine.priors[c] * 100)}</span></div>)}
        </div>
        <div>
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-neutral-500">Certainty needed to auto-heal</div>
          {Object.entries(engine.thresholds).map(([tier, t]) => (
            <div key={tier} className="flex justify-between border-b border-white/[0.04] py-1">
              <span>{RISK[tier]} <span className="text-neutral-500">(masking a bug costs {engine.loss[tier].heal.likely_regression})</span></span>
              <span className="font-mono tabular-nums text-neutral-200">{pct(t.heal)}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4">Source: <code>src/core/weights.yaml</code>, with the reason for each value in <code>docs/contracts/weights_elicitation.md</code>.</p>
    </details>
  );
}

export function QAEngineScreen() {
  const [status, setStatus] = useState(null);
  const [apiError, setApiError] = useState(false);
  const [engine, setEngine] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selected, setSelected] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [runError, setRunError] = useState(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const elapsed = useElapsed(running);

  useEffect(() => {
    Promise.all([qaApi.status(), qaApi.scenarios(), qaApi.engine().catch(() => null)])
      .then(([st, sc, en]) => { setStatus(st); setScenarios(sc); setEngine(en); setSelected(sc[0]?.id ?? null); })
      .catch(() => setApiError(true));
  }, []);

  const scenario = scenarios.find((s) => s.id === selected);

  const run = async () => {
    setRunning(true); setRunError(null); setResult(null);
    try {
      setResult(await qaApi.run(selected, !showBrowser));
    } catch (err) {
      setRunError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const decided = result?.steps.filter((s) => s.engine) || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div className="space-y-2">
        <div className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">QA agent · live</div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Should this broken test heal itself, or call a human?</h1>
        <p className="max-w-3xl text-sm text-neutral-400 leading-relaxed">
          Pick a test scenario. A real Chromium browser runs it; when a button can't be found, Groq proposes a replacement,
          we click it and watch what happens, and the ConfidenceEngine decides from that evidence. Nothing here is pre-scripted.
        </p>
        <StatusBanner status={status} error={apiError} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-2">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSelected(s.id); setResult(null); setRunError(null); }}
              className={`w-full rounded-xl border px-4 py-3.5 text-left transition-all cursor-pointer ${s.id === selected ? 'border-white/20 bg-white/[0.08] shadow-sm' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]'}`}
            >
              <div className="text-sm font-medium text-white">{s.title}</div>
              <div className="mt-0.5 text-[11px] text-neutral-400">{s.steps.length} step{s.steps.length > 1 ? 's' : ''} · {[...new Set(s.steps.map((st) => st.risk_tier))].join(', ')} risk</div>
            </button>
          ))}
        </aside>

        <section className="space-y-5">
          {scenario && (
            <div className="glass-card space-y-4 rounded-2xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-xl">
                  <h2 className="text-lg font-semibold text-white tracking-tight">{scenario.title}</h2>
                  <p className="mt-1 text-sm text-neutral-400 leading-relaxed">{scenario.description}</p>
                  <a href={pageUrl(scenario.page)} target="_blank" rel="noreferrer" className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors">
                    Open the test page <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex flex-col items-end gap-2.5">
                  <button
                    onClick={run}
                    disabled={running || apiError}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-all shadow-sm active:scale-[0.98] disabled:opacity-40 cursor-pointer"
                  >
                    {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                    {running ? `Running… ${(elapsed / 1000).toFixed(1)}s` : 'Run in browser'}
                  </button>
                  <label className="flex items-center gap-1.5 text-[11px] text-neutral-400 cursor-pointer select-none">
                    <input type="checkbox" checked={showBrowser} onChange={(e) => setShowBrowser(e.target.checked)} className="rounded accent-white" />
                    show the browser window
                  </label>
                </div>
              </div>
              <ol className="space-y-1 text-xs text-neutral-400">
                {scenario.steps.map((st, i) => (
                  <li key={st.id} className="font-mono">
                    {i + 1}. {st.name} · <code>{st.original_selector}</code> · {st.risk_tier} risk
                  </li>
                ))}
              </ol>
            </div>
          )}

          {runError && <div className="rounded-xl border border-[#ff453a]/30 bg-[#ff453a]/10 px-4 py-3 text-sm text-neutral-200">{runError}</div>}

          {result && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-xs text-neutral-300">
              <span>Finished in <b className="text-white font-mono tabular-nums">{(result.duration_ms / 1000).toFixed(1)} s</b></span>
              {['heal', 'flag', 'escalate'].map((a) => {
                const n = decided.filter((s) => s.engine.recommended_action === a).length;
                return n ? <span key={a} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: ACTION[a].color }} />{n} × {ACTION[a].label}</span> : null;
              })}
              <span>{decided.filter((s) => s.score.action_acceptable).length}/{decided.length} match ground truth</span>
              {decided.some((s) => s.score.masked_regression) && <span className="font-semibold text-[#ff453a]">real bug let through</span>}
            </div>
          )}

          {result?.steps.map((st, i) => <StepDecisionCard key={st.step_id} step={st} index={i} priors={engine?.priors} />)}

          <EngineNumbers engine={engine} />
        </section>
      </div>
    </div>
  );
}
