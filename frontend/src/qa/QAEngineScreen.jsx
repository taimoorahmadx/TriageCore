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
        API not reachable on :8000. Start it with <code className="font-mono">python3 -m uvicorn src.api.app:app --port 8000</code>
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
  const [activeStepTab, setActiveStepTab] = useState(0);
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
    setRunning(true); setRunError(null); setResult(null); setActiveStepTab(0);
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
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-2 px-1 flex items-center justify-between">
            <span>Test Scenarios</span>
            <span className="text-neutral-500 font-mono">{scenarios.length}</span>
          </div>
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSelected(s.id); setResult(null); setRunError(null); setActiveStepTab(0); }}
              className={`group w-full rounded-xl border p-4 text-left transition-all cursor-pointer relative overflow-hidden ${
                s.id === selected 
                  ? 'border-white/20 bg-white/[0.07] shadow-sm' 
                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              {s.id === selected && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0a84ff]" />
              )}
              <div className="text-sm font-semibold text-white tracking-tight group-hover:text-neutral-100">{s.title}</div>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-400 font-mono">
                <span className="bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">{s.steps.length} step{s.steps.length > 1 ? 's' : ''}</span>
                <span>·</span>
                <span className="capitalize">{[...new Set(s.steps.map((st) => st.risk_tier))].join(', ')} risk</span>
              </div>
            </button>
          ))}
        </aside>

        <section className="space-y-5">
          {scenario && (
            <div className="glass-card space-y-5 rounded-2xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-5">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.08] text-neutral-300">
                      {[...new Set(scenario.steps.map((st) => st.risk_tier))].join(', ')} risk
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-white tracking-tight">{scenario.title}</h2>
                  <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed">{scenario.description}</p>
                  <a href={pageUrl(scenario.page)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors">
                    Open the test page <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex flex-col items-end gap-2.5">
                  <button
                    onClick={run}
                    disabled={running || apiError}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all shadow-sm active:scale-[0.98] disabled:opacity-40 cursor-pointer"
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

              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-2.5">Execution Sequence</div>
                <ol className="space-y-2 text-xs text-neutral-400">
                  {scenario.steps.map((st, i) => (
                    <li key={st.id} className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-black/40 border border-white/[0.04] font-mono">
                      <span className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.08] text-neutral-300 flex items-center justify-center text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <span className="font-semibold text-neutral-200">{st.name}</span>
                      <span>·</span>
                      <code className="bg-white/[0.04] px-1.5 py-0.5 rounded text-neutral-300 border border-white/[0.06]">{st.original_selector}</code>
                      <span>·</span>
                      <span className="text-neutral-500">{st.risk_tier} risk</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {runError && <div className="rounded-xl border border-[#ff453a]/30 bg-[#ff453a]/10 px-4 py-3 text-sm text-neutral-200">{runError}</div>}

          {result && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-3.5 text-xs text-neutral-300 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="font-medium">Finished in <b className="text-white font-mono tabular-nums">{(result.duration_ms / 1000).toFixed(1)} s</b></span>
                  <span>·</span>
                  <span className="font-medium">{decided.filter((s) => s.score.action_acceptable).length}/{decided.length} match ground truth</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {['heal', 'flag', 'escalate'].map((a) => {
                    const n = decided.filter((s) => s.engine.recommended_action === a).length;
                    return n ? <span key={a} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-[11px] font-mono"><span className="h-2 w-2 rounded-full" style={{ background: ACTION[a].color }} />{n} × {ACTION[a].label}</span> : null;
                  })}
                  {decided.some((s) => s.score.masked_regression) && <span className="font-semibold text-[#ff453a] bg-[#ff453a]/10 px-2 py-0.5 rounded-full border border-[#ff453a]/30">real bug let through</span>}
                </div>
              </div>

              {result.steps.length > 1 && (
                <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1 overflow-x-auto">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 mr-2 shrink-0">Select Step:</span>
                  {result.steps.map((st, i) => {
                    const act = st.engine ? ACTION[st.engine.recommended_action] : null;
                    return (
                      <button
                        key={st.step_id}
                        type="button"
                        onClick={() => setActiveStepTab(i)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer shrink-0 ${
                          activeStepTab === i
                            ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                            : 'text-neutral-400 hover:text-white bg-transparent hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white/[0.08] flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </span>
                        <span>{st.name}</span>
                        {act && (
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: act.color }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {result.steps[activeStepTab] && (
                <StepDecisionCard
                  key={result.steps[activeStepTab].step_id}
                  step={result.steps[activeStepTab]}
                  index={activeStepTab}
                  priors={engine?.priors}
                />
              )}
            </div>
          )}

          <EngineNumbers engine={engine} />
        </section>
      </div>
    </div>
  );
}
