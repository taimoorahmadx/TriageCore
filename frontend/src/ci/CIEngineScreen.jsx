import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Play, ShieldAlert } from 'lucide-react';
import { CauseBars, LossBars } from '../qa/charts';
import { ACTION, pct } from '../qa/theme';
import { ciApi } from './api';

const CI_CAUSES = {
  flaky: { label: 'Flaky infrastructure', color: '#30d158' },
  dependency: { label: 'Dependency failure', color: '#0a84ff' },
  bug: { label: 'Code regression', color: '#ff453a' },
  infra: { label: 'Runner / infrastructure', color: '#ff9f0a' },
};
const CI_CAUSE_ORDER = ['flaky', 'dependency', 'bug', 'infra'];
const FACT_LABELS = [
  ['failure_kind', 'Failure kind'],
  ['failing_files', 'Failing files'],
  ['error_excerpt', 'Error excerpt'],
];

function Panel({ title, children }) {
  return (
    <section className="space-y-3 rounded-xl border border-white/[0.06] bg-black/25 p-4">
      <h3 className="border-b border-white/[0.05] pb-2 text-xs font-semibold text-white">{title}</h3>
      {children}
    </section>
  );
}

function DisplayValue({ value }) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None identified';
  return value || 'Not identified';
}

export function CIEngineScreen() {
  const [cases, setCases] = useState([]);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [loadingCases, setLoadingCases] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    ciApi.cases()
      .then((items) => { setCases(items); setSelected(items[0]?.id ?? null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingCases(false));
  }, []);

  const selectedCase = cases.find((item) => item.id === selected);
  const analyze = async () => {
    if (!selected) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      setResult(await ciApi.run(selected));
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <div className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">CI agent · fixture cases</div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Why did this CI run fail?</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-neutral-400">
          Analyze a fixture log. The pipeline masks secrets, extracts structured facts, traces changed files to commits,
          then asks the shared ConfidenceEngine whether to rerun, propose an auto-fix, or escalate.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-2">
          <div className="mb-2 flex items-center justify-between px-1 font-mono text-[11px] uppercase tracking-wider text-neutral-500">
            <span>CI cases</span><span>{cases.length}</span>
          </div>
          {loadingCases && <p className="px-1 text-xs text-neutral-400">Loading cases…</p>}
          {!loadingCases && cases.length === 0 && !error && <p className="px-1 text-xs text-neutral-400">No fixture cases found.</p>}
          {cases.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setSelected(item.id); setResult(null); setError(null); }}
              className={`relative w-full overflow-hidden rounded-xl border p-4 text-left transition-colors ${selected === item.id ? 'border-white/20 bg-white/[0.07]' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'}`}
            >
              {selected === item.id && <span className="absolute inset-y-0 left-0 w-1 bg-[#0a84ff]" />}
              <span className="block break-all text-sm font-semibold text-white">{item.id}</span>
              <span className="mt-1 block font-mono text-[11px] text-neutral-400">{item.repo || 'fixture'} · run {item.run_id}</span>
              <span className="mt-2 inline-flex rounded border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-300">True label: {item.label || 'unknown'}</span>
            </button>
          ))}
        </aside>

        <section className="min-w-0 space-y-5">
          {selectedCase && (
            <div className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">{selectedCase.repo} · run {selectedCase.run_id}</div>
                <h2 className="mt-1 break-all text-lg font-semibold text-white">{selectedCase.id}</h2>
              </div>
              <button type="button" onClick={analyze} disabled={running} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm disabled:opacity-40">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                {running ? 'Analyzing…' : 'Analyze CI case'}
              </button>
            </div>
          )}

          {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-[#ff453a]/30 bg-[#ff453a]/10 px-4 py-3 text-sm text-neutral-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff453a]" />{error}</div>}
          {!result && !running && selectedCase && !error && <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-sm text-neutral-400">Select <b className="text-neutral-200">Analyze CI case</b> to run the real extraction and decision pipeline for this fixture.</div>}
          {running && <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-sm text-neutral-400">Fact extraction can take a few seconds. The decision will escalate safely if evidence extraction fails.</div>}

          {result && (
            <div className="space-y-4">
              <div className={`glass-card rounded-2xl border p-5 ${result.recommended_action === 'escalate' ? 'border-[#ff453a]/30' : 'border-white/[0.08]'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-neutral-500">
                      {result.status === 'error' ? <ShieldAlert className="h-4 w-4 text-[#ff453a]" /> : <CheckCircle2 className="h-4 w-4 text-[#30d158]" />}
                      Engine decision · {result.status}
                    </div>
                    <h2 className="mt-2 text-xl font-semibold text-white">{result.classification ? CI_CAUSES[result.classification]?.label || result.classification : 'Could not classify'}</h2>
                    <p className="mt-1 text-sm text-neutral-400">Diagnosis: <b className="text-neutral-200">{result.classification || 'unavailable'}</b>{result.confidence_score != null && <> · confidence {result.confidence_score}%</>}</p>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${ACTION[result.recommended_action]?.tone || ''}`}>
                    <span className="h-2 w-2 rounded-full" style={{ background: ACTION[result.recommended_action]?.color }} />
                    {ACTION[result.recommended_action]?.label || result.recommended_action}
                  </span>
                </div>
                {result.error && <p className="mt-3 rounded-lg bg-black/30 p-3 font-mono text-xs text-neutral-300">{result.error}</p>}
                {result.reasoning_trace && <details className="mt-4 border-t border-white/[0.06] pt-3"><summary className="cursor-pointer text-xs font-semibold text-neutral-300">Engine reasoning</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-neutral-400">{result.reasoning_trace}</p></details>}
              </div>

              <Panel title="Secret-masked log excerpt">
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-neutral-300">{result.log_excerpt || 'No log excerpt available.'}</pre>
              </Panel>

              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="Extracted facts">
                  <dl className="space-y-2 text-xs">
                    {FACT_LABELS.map(([key, label]) => (
                      <div key={key} className="border-b border-white/[0.04] pb-2">
                        <dt className="text-neutral-500">{label}</dt>
                        <dd className="mt-1 break-words font-mono text-neutral-200"><DisplayValue value={result.facts?.[key]} /></dd>
                      </div>
                    ))}
                  </dl>
                </Panel>
                <Panel title="Commit tracing">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    {result.trace?.status === 'attributed' ? <CheckCircle2 className="h-4 w-4 text-[#30d158]" /> : <AlertTriangle className="h-4 w-4 text-[#ff9f0a]" />}
                    {result.trace?.status === 'attributed' ? 'One commit attributed' : result.trace?.status === 'ambiguous' ? 'Ambiguous: multiple candidates' : 'No matching commit found'}
                  </div>
                  {result.trace?.attributed_commit && <p className="mt-2 break-all font-mono text-xs text-neutral-200">{result.trace.attributed_commit}</p>}
                  <p className="mt-3 text-[11px] text-neutral-500">Candidates</p>
                  {result.trace?.candidates?.length ? <ul className="mt-1 space-y-1">{result.trace.candidates.map((sha) => <li key={sha} className="break-all rounded bg-black/30 px-2 py-1 font-mono text-[11px] text-neutral-300">{sha}</li>)}</ul> : <p className="mt-1 text-xs text-neutral-400">None</p>}
                  <p className="mt-3 text-[11px] text-neutral-500">Failing files: <span className="font-mono text-neutral-300">{result.trace?.failing_files?.join(', ') || 'none identified'}</span></p>
                </Panel>
              </div>

              {result.details?.posterior && (
                <div className="grid gap-4 xl:grid-cols-2">
                  <Panel title="Posterior by cause">
                    <CauseBars posterior={result.details.posterior} order={CI_CAUSE_ORDER} causes={CI_CAUSES} />
                  </Panel>
                  <Panel title="Expected loss by action">
                    <LossBars details={result.details} chosen={result.recommended_action} />
                  </Panel>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-neutral-300">
                <span>True label: <b className="font-mono text-white">{result.label || selectedCase?.label || 'unknown'}</b></span>
                <span className={result.score?.action_acceptable ? 'text-[#30d158]' : 'text-[#ff9f0a]'}>
                  {result.score?.action_acceptable ? '✓ Action matches fixture label' : 'Action differs from fixture expectation'}
                </span>
                {result.duration_ms != null && <span className="font-mono text-neutral-500">{result.duration_ms.toFixed(0)} ms</span>}
              </div>
              {result.confidence_score != null && <p className="text-right text-[11px] text-neutral-500">Confidence score {pct(result.confidence_score / 100)}</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
