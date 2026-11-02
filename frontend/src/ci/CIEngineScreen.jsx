import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Play, Search, ShieldAlert } from 'lucide-react';
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
const QUICK_START_IDS = new Set([
  'dependency_failure',
  'hosted_runner_timeout',
  'actions-setup-python-40267959000',
  'lca-beetbox-beets-38',
]);
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
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
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
  const filteredCases = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = cases.filter((item) => {
      const sourceMatches = sourceFilter === 'all'
        || (sourceFilter === 'historical' && item.source_type === 'historical_github_actions')
        || (sourceFilter === 'fixtures' && item.source_type === 'fixture');
      const textMatches = !needle || [item.id, item.repo, item.run_id].some((value) =>
        String(value || '').toLowerCase().includes(needle));
      return sourceMatches && textMatches;
    });
    return filtered.sort((a, b) => Number(Boolean(b.source_url)) - Number(Boolean(a.source_url)));
  }, [cases, query, sourceFilter]);
  const quickStartCases = cases.filter((item) => QUICK_START_IDS.has(item.id));
  const selectCase = (id) => { setSelected(id); setResult(null); setError(null); };
  const selectQuickStartCase = (id) => { setSourceFilter('all'); setQuery(''); selectCase(id); };
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
        <div className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">CI agent · saved cases</div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Why did this CI run fail?</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-neutral-400">
          Analyze a saved public log or fixture. The pipeline masks secrets, extracts structured facts, traces changed files to commits,
          then asks the shared ConfidenceEngine whether to rerun, propose an auto-fix, or escalate. Historical analysis is read-only,
          does not connect to GitHub, and may call the configured fact extractor. Historical runs use the configured default CI policy tier.
        </p>
      </header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-3">
          <div className="flex items-center justify-between px-1 font-mono text-[11px] uppercase tracking-wider text-neutral-500">
            <span>CI cases</span><span>{filteredCases.length} / {cases.length}</span>
          </div>
          {loadingCases && <p className="px-1 text-xs text-neutral-400">Loading cases…</p>}
          {!loadingCases && cases.length === 0 && !error && <p className="px-1 text-xs text-neutral-400">No cases found.</p>}
          {quickStartCases.length > 0 && <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Quick start</p>
            <div className="flex flex-wrap gap-2">
              {quickStartCases.map((item) => <button key={item.id} type="button" onClick={() => selectQuickStartCase(item.id)} className="max-w-full truncate rounded-lg border border-white/[0.08] px-2.5 py-2 text-left text-xs text-neutral-200 hover:bg-white/[0.06]">{item.source_type === 'historical_github_actions' ? `${item.repo} · run ${item.run_id}` : `Fixture · ${item.id === 'dependency_failure' ? 'Dependency failure' : 'Hosted runner timeout'}`}</button>)}
            </div>
          </div>}
          <label className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-neutral-400">
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">Search CI cases</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search repo, run, or case ID" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-500" />
          </label>
          <div role="group" aria-label="Filter cases by source" className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
            {[["all", "All"], ["historical", "Historical"], ["fixtures", "Fixtures"]].map(([value, label]) => <button key={value} type="button" aria-pressed={sourceFilter === value} onClick={() => setSourceFilter(value)} className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${sourceFilter === value ? 'bg-white/[0.1] text-white' : 'text-neutral-400 hover:text-white'}`}>{label}</button>)}
          </div>
          <div className="max-h-[42vh] space-y-1.5 overflow-y-auto pr-1 lg:max-h-[calc(100vh-19rem)]">
            {filteredCases.map((item) => (
              <button key={item.id} type="button" aria-pressed={selected === item.id} onClick={() => selectCase(item.id)} className={`relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-colors ${selected === item.id ? 'border-white/20 bg-white/[0.07]' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                {selected === item.id && <span className="absolute inset-y-0 left-0 w-1 bg-[#0a84ff]" />}
                <span className="block truncate pl-1 text-xs font-semibold text-white">{item.id}</span>
                <span className="mt-1 block truncate pl-1 font-mono text-[10px] text-neutral-400">{item.repo || 'Fixture'} · run {item.run_id}</span>
                {item.source_type === 'fixture'
                  ? <span className="mt-1.5 block pl-1 text-[10px] text-neutral-500">Fixture expected cause: {item.label || 'No reviewed label'}</span>
                  : <span className="mt-1.5 block pl-1 text-[10px] text-neutral-500">Historical GitHub Actions run · label hidden until analysis</span>}
              </button>
            ))}
            {!loadingCases && filteredCases.length === 0 && <p className="rounded-lg border border-white/[0.06] p-4 text-xs text-neutral-400">No cases match this search.</p>}
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          {selectedCase && (
            <div className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">{selectedCase.repo} · run {selectedCase.run_id}</div>
                <h2 className="mt-1 break-all text-lg font-semibold text-white">{selectedCase.id}</h2>
                {selectedCase.source_type === 'historical_github_actions' && <div className="mt-2 text-xs text-neutral-400">Historical GitHub Actions run · saved public log{selectedCase.source_url && <> · <a className="text-[#0a84ff] underline" href={selectedCase.source_url} target="_blank" rel="noreferrer">View source run</a></>}</div>}
              </div>
              <button type="button" onClick={analyze} disabled={running} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm disabled:opacity-40">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                {running ? 'Analyzing…' : 'Analyze CI case'}
              </button>
            </div>
          )}

          {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-[#ff453a]/30 bg-[#ff453a]/10 px-4 py-3 text-sm text-neutral-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff453a]" />{error}</div>}
          {!result && !running && selectedCase && !error && <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-sm text-neutral-400">Select <b className="text-neutral-200">Analyze CI case</b> to run the extraction and decision pipeline for this saved case.</div>}
          {running && <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-sm text-neutral-400">Fact extraction can take a few seconds. The decision will escalate safely if evidence extraction fails.</div>}

          {result && (
            <div className="space-y-4">
              <div className={`glass-card rounded-2xl border p-5 ${result.recommended_action === 'escalate' ? 'border-[#ff453a]/30' : 'border-white/[0.08]'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-neutral-500">
                      {result.status !== 'ok' ? <ShieldAlert className="h-4 w-4 text-[#ff453a]" /> : <CheckCircle2 className="h-4 w-4 text-[#30d158]" />}
                      {result.status === 'extraction_failed' ? 'Fact extraction failed · safe escalation' : result.status === 'error' ? 'Pipeline error · safe escalation' : `Engine decision · ${result.status}`}
                    </div>
                    <h2 className="mt-2 text-xl font-semibold text-white">{result.classification ? CI_CAUSES[result.classification]?.label || result.classification : 'Could not classify'}</h2>
                    <p className="mt-1 text-sm text-neutral-400">Most likely cause: <b className="text-neutral-200">{result.classification || 'unavailable'}</b>{result.confidence_score != null && <> · confidence {result.confidence_score}%</>}</p>
                    {result.classification && <p className={`mt-2 text-xs ${result.diagnosis_reliable ? 'text-[#30d158]' : 'text-[#ff9f0a]'}`}>{result.diagnosis_reliable ? 'Diagnosis is reliable for the observed evidence.' : `Tentative diagnosis · ${result.details?.diagnosis_reliability_reason || 'evidence does not support a reliable cause yet.'}`}</p>}
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${ACTION[result.recommended_action]?.tone || ''}`}>
                    <span className="h-2 w-2 rounded-full" style={{ background: ACTION[result.recommended_action]?.color }} />
                    {ACTION[result.recommended_action]?.label || result.recommended_action}
                  </span>
                </div>
                {result.reasoning_trace && <details className="mt-4 border-t border-white/[0.06] pt-3"><summary className="cursor-pointer text-xs font-semibold text-neutral-300">Engine reasoning</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-neutral-400">{result.reasoning_trace}</p></details>}
              </div>

              {result.status === 'extraction_failed' && <div role="alert" className="rounded-xl border border-[#ff453a]/30 bg-[#ff453a]/10 p-4 text-sm text-neutral-200">Fact extraction failed. No extracted facts are available; the engine escalated safely.</div>}
              {result.status === 'ok' && result.recommended_action === 'escalate' && <Panel title="Why it escalated">
                <p className="text-sm text-neutral-300">The engine chose escalation because it was the lowest-loss available decision{result.details?.expected_loss?.escalate != null ? ` (expected loss ${result.details.expected_loss.escalate.toFixed(2)}).` : '.'}</p>
                {!result.diagnosis_reliable && <p className="text-xs text-[#ff9f0a]">The diagnosis is tentative: {result.details?.diagnosis_reliability_reason || 'the observed evidence does not distinguish the causes reliably.'}</p>}
                {Object.keys(result.details?.blocked || {}).length > 0 && <div><p className="text-xs font-semibold text-neutral-400">Unavailable actions</p><ul className="mt-1 space-y-1 text-xs text-neutral-300">{Object.entries(result.details.blocked).map(([action, reason]) => <li key={action}><b>{action}</b>: {reason}</li>)}</ul></div>}
              </Panel>}
              {result.status === 'error' && <div role="alert" className="rounded-xl border border-[#ff453a]/30 bg-[#ff453a]/10 p-4 text-sm text-neutral-200">The CI pipeline failed and escalated safely. {result.error}</div>}
              {result.status === 'ok' && <Panel title="Secret-masked log excerpt">
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-neutral-300">{result.log_excerpt || 'No log excerpt available.'}</pre>
              </Panel>}

              {result.status === 'ok' && <div className="grid gap-4 xl:grid-cols-2">
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
              </div>}

              {result.status === 'ok' && result.details?.posterior && (
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
                  <span>{selectedCase?.source_type === 'fixture' ? 'Fixture expected cause' : 'Reviewed cause'}: <b className="font-mono text-white">{result.label || selectedCase?.label || 'No reviewed label'}</b></span>
                {result.score && <span className={result.score.action_acceptable ? 'text-[#30d158]' : 'text-[#ff9f0a]'}>
                  {result.score.action_acceptable ? '✓ Recommendation matches reviewed cause' : 'Recommendation differs from reviewed cause'}
                </span>}
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
