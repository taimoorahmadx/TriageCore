import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Play, XCircle } from 'lucide-react';
import { qaApi } from './api';
import { DecisionMap, PolicyBars } from './charts';
import { CAUSE, POLICY, POLICY_ORDER, pct } from './theme';

function Stat({ label, value, sub }) {
  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-all duration-200">
      <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 font-medium">{label}</div>
      <div className="mt-2.5 text-3xl font-semibold tracking-tight text-white font-mono tabular-nums">{value}</div>
      {sub && <div className="mt-2 text-xs text-neutral-400 leading-normal">{sub}</div>}
    </div>
  );
}

function Panel({ title, hint, children }) {
  return (
    <div className="glass-card space-y-4 rounded-2xl p-6 transition-all duration-200">
      <div className="border-b border-white/[0.06] pb-3">
        <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
        {hint && <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

const Mark = ({ ok }) => (ok
  ? <CheckCircle2 className="inline h-3.5 w-3.5 text-[#30d158] shrink-0" aria-label="acceptable" />
  : <XCircle className="inline h-3.5 w-3.5 text-[#ff453a] shrink-0" aria-label="not acceptable" />);

export function EvaluationScreen() {
  const [report, setReport] = useState(null);
  const [engine, setEngine] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    qaApi.latestEvaluation().then(setReport).catch(() => {});
    qaApi.engine().then(setEngine).catch(() => {});
  }, []);

  const run = async () => {
    setRunning(true); setError(null);
    try { setReport(await qaApi.evaluate()); } catch (e) { setError(e.message); } finally { setRunning(false); }
  };

  const s = report?.summary;
  const tc = s?.triagecore;
  const thresholds = engine && Object.fromEntries(Object.entries(engine.thresholds));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">Evaluation · measured, not typed in</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">How often does each approach make the right call?</h1>
          <p className="max-w-3xl text-sm text-neutral-400 leading-relaxed">
            Every scenario runs in a real browser once. Three decision approaches then judge the <i>same</i> evidence, and each
            decision is checked against the scenario's ground truth (<code>tests/scenarios/qa_scenarios.yaml</code>).
          </p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-all shadow-sm active:scale-[0.98] disabled:opacity-40 cursor-pointer"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
          {running ? 'Running all scenarios (about 1–2 min)…' : 'Run full evaluation'}
        </button>
      </div>

      {error && <div className="rounded-xl border border-[#ff453a]/30 bg-[#ff453a]/10 px-4 py-3 text-sm text-neutral-200">{error}</div>}
      {!report && !running && <div className="glass-card rounded-2xl p-6 text-sm text-neutral-400">No evaluation yet. Run one to generate real results.</div>}

      {report && (
        <>
          <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3.5 py-2.5 text-xs text-neutral-400 font-mono flex items-center justify-between flex-wrap gap-2">
            <span>
              Run at {report.generated_at.replace('T', ' ')} · relocation by {report.relocator} · {tc.steps} broken steps across {new Set(report.rows.map((r) => r.scenario)).size} scenarios · small sample, preliminary
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="TriageCore: right call" value={`${tc.acceptable_actions}/${tc.steps}`} sub={`${pct(tc.accuracy)} of steps; cause diagnosed correctly in ${pct(tc.cause_accuracy)}`} />
            <Stat label="Real bugs let through" value={`${tc.masked_regressions}/${tc.regressions_total}`} sub={`blind healing let through ${s.blind_heal.masked_regressions}/${s.blind_heal.regressions_total}`} />
            <Stat label="Needless escalations" value={tc.needless_escalations} sub="harmless changes sent to a human anyway" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Real bugs let through without a human" hint="Lower is better. This is the failure TriageCore exists to prevent.">
              <PolicyBars summary={s} metric={(x) => x.masked_regressions} total={(x) => x.regressions_total} />
            </Panel>
            <Panel title="Steps where the action was acceptable" hint="Higher is better.">
              <PolicyBars summary={s} metric={(x) => x.acceptable_actions} total={(x) => x.steps} />
            </Panel>
          </div>

          <Panel title="Where each step landed" hint="Horizontal position: how sure the engine was that the change was harmless. The vertical line is the certainty needed to auto-heal at that risk level.">
            <DecisionMap rows={report.rows} thresholds={thresholds} />
          </Panel>

          <Panel title="Every decision" hint="Same evidence, three approaches. ✓ = acceptable according to ground truth.">
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="text-[11px] uppercase tracking-wider text-neutral-400 bg-white/[0.02]">
                  <tr className="border-b border-white/[0.08]">
                    <th className="py-3 px-3.5 font-medium">Scenario · step</th>
                    <th className="py-3 px-3 font-medium">Risk</th>
                    <th className="py-3 px-3 font-medium">True cause</th>
                    <th className="py-3 px-3 text-right font-medium">P(rename)</th>
                    {POLICY_ORDER.map((p) => <th key={p} className="py-3 px-3 font-medium">{POLICY[p].label}</th>)}
                  </tr>
                </thead>
                <tbody className="text-neutral-300 divide-y divide-white/[0.04]">
                  {report.rows.map((r) => (
                    <tr key={`${r.scenario}-${r.step}`} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-3.5 font-mono text-neutral-200">{r.scenario} · {r.step}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[11px] rounded px-1.5 py-0.5 bg-white/[0.04] text-neutral-300 border border-white/[0.06]">
                          {r.risk_tier}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">{CAUSE[r.truth_cause].label}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-200">{pct(r.p_stale)}</td>
                      {POLICY_ORDER.map((p) => (
                        <td key={p} className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                            <Mark ok={r[`${p}_acceptable`]} />
                            <span className="text-neutral-200">{r[`${p}_action`]}</span>
                            {r[`${p}_masked`] ? <span className="ml-1 font-semibold text-[#ff453a] bg-[#ff453a]/10 px-1.5 py-0.5 rounded border border-[#ff453a]/20">bug through</span> : null}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <p className="text-xs text-neutral-500">
            Honest limits: {tc.steps} hand-built scenarios, with ground truth labelled by the team; the simple penalty rule's numbers were written
            knowing these scenarios. Results files: <code>results/qa_eval_latest.json</code> and a CSV per run.
          </p>
        </>
      )}
    </div>
  );
}
