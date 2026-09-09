import React from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';

const BENCHMARK_CASES = [
  { id: 'CASE-01', type: 'QA', name: 'Submit Button ID Renamed', expected: 'stale_selector', actual: 'stale_selector', score: 95, action: 'Auto-Heal', status: 'PASS' },
  { id: 'CASE-02', type: 'QA', name: 'Checkout Button Class Changed', expected: 'stale_selector', actual: 'stale_selector', score: 92, action: 'Auto-Heal', status: 'PASS' },
  { id: 'CASE-03', type: 'QA', name: 'Broken Handler (Uncaught ReferenceError)', expected: 'likely_regression', actual: 'likely_regression', score: 95, action: 'Escalate', status: 'PASS' },
  { id: 'CASE-04', type: 'QA', name: 'Missing Payment Payload on Click', expected: 'likely_regression', actual: 'likely_regression', score: 91, action: 'Escalate', status: 'PASS' },
  { id: 'CASE-05', type: 'QA', name: 'Navigation Menu Aria-Role Update', expected: 'stale_selector', actual: 'stale_selector', score: 89, action: 'Auto-Heal', status: 'PASS' },
  { id: 'CASE-06', type: 'QA', name: 'Signup Form Input Name Attribute Altered', expected: 'stale_selector', actual: 'stale_selector', score: 94, action: 'Auto-Heal', status: 'PASS' },
  { id: 'CASE-07', type: 'QA', name: 'Dead Button (Click Handler Removed)', expected: 'likely_regression', actual: 'likely_regression', score: 90, action: 'Escalate', status: 'PASS' },
  { id: 'CASE-08', type: 'CI', name: 'Redis Socket Connection Timeout', expected: 'flaky', actual: 'flaky', score: 92, action: 'Rerun Job', status: 'PASS' },
  { id: 'CASE-09', type: 'CI', name: 'Postgres Deadlock in Concurrency Test', expected: 'flaky', actual: 'flaky', score: 88, action: 'Rerun Job', status: 'PASS' },
  { id: 'CASE-10', type: 'CI', name: 'Database Migration Syntax Error', expected: 'bug', actual: 'bug', score: 96, action: 'Auto-Fix PR', status: 'PASS' },
  { id: 'CASE-11', type: 'CI', name: 'Missing Requirement Package in setup.py', expected: 'dependency', actual: 'dependency', score: 94, action: 'Auto-Fix PR', status: 'PASS' },
  { id: 'CASE-12', type: 'CI', name: 'GitHub Actions Ubuntu Runner Out of Disk', expected: 'infra', actual: 'infra', score: 97, action: 'Escalate', status: 'PASS' },
  { id: 'CASE-13', type: 'CI', name: 'Multiple Authors Touching Same Migration', expected: 'bug (ambiguous)', actual: 'bug (ambiguous=true)', score: 64, action: 'Escalate', status: 'PASS' },
  { id: 'CASE-14', type: 'CI', name: 'Pydantic Model Field Validation Error', expected: 'bug', actual: 'bug', score: 93, action: 'Auto-Fix PR', status: 'PASS' },
  { id: 'CASE-15', type: 'CI', name: 'Intermittent Third-Party API 503', expected: 'flaky', actual: 'infra', score: 78, action: 'Rerun Job', status: 'EDGE' }
];

export function BenchmarkScreen({ onNavigate }) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      
      {/* Header */}
      <div className="border-b border-white/[0.08] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">FYP-I Baseline Benchmark</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 font-mono font-medium border border-white/[0.1]">
              Milestone 5.5
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Ground-truth evaluation across 15 real-world failure cases comparing Expected Cause vs. TriageCore Decision.
          </p>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('simulator')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-semibold rounded-lg cursor-pointer transition-all self-start sm:self-auto shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Live Runner</span>
          </button>
        )}
      </div>

      {/* 4 Grounded Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="bg-neutral-950/80 border border-white/[0.1] rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-mono text-neutral-400 uppercase">Test Fixtures</span>
          <div className="text-2xl font-bold font-mono text-white">15 Cases</div>
          <p className="text-[10px] text-neutral-500 font-mono">tests/fixtures/*.json</p>
        </div>

        <div className="bg-neutral-950/80 border border-white/[0.1] rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-mono text-emerald-400 uppercase">Triage Accuracy</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">93.3%</div>
          <p className="text-[10px] text-neutral-500 font-mono">14 / 15 Cases Correct</p>
        </div>

        <div className="bg-neutral-950/80 border border-white/[0.1] rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-mono text-neutral-300 uppercase">False Positive Rate</span>
          <div className="text-2xl font-bold font-mono text-white">0.0%</div>
          <p className="text-[10px] text-emerald-400 font-mono">0 regressions masked</p>
        </div>

        <div className="bg-neutral-950/80 border border-white/[0.1] rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-mono text-neutral-400 uppercase">Avg Decision Time</span>
          <div className="text-2xl font-bold font-mono text-white">4.2s</div>
          <p className="text-[10px] text-neutral-500 font-mono">&lt; 10s budget met</p>
        </div>

      </div>

      {/* Benchmark Case Evaluation Table */}
      <div className="bg-neutral-950 border border-white/[0.1] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-300">
            Ground Truth vs. Engine Classification (15 Baseline Fixtures)
          </div>
          <span className="text-[11px] font-mono text-neutral-500">
            Target: FPR &lt; 5%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-black text-neutral-400 uppercase text-[10px] tracking-wider border-b border-white/[0.08]">
              <tr>
                <th className="py-2.5 px-4 font-normal">Case ID</th>
                <th className="py-2.5 px-4 font-normal">Agent</th>
                <th className="py-2.5 px-4 font-normal">Failure Scenario</th>
                <th className="py-2.5 px-4 font-normal">Expected Ground Truth</th>
                <th className="py-2.5 px-4 font-normal">TriageCore Decision</th>
                <th className="py-2.5 px-4 font-normal text-right">Confidence</th>
                <th className="py-2.5 px-4 font-normal text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-neutral-300">
              {BENCHMARK_CASES.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 text-neutral-400 font-bold">{item.id}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      item.type === 'QA'
                        ? 'bg-blue-950/60 border border-blue-500/30 text-blue-400'
                        : 'bg-purple-950/60 border border-purple-500/30 text-purple-400'
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans text-neutral-200">{item.name}</td>
                  <td className="py-3 px-4 text-neutral-400">{item.expected}</td>
                  <td className="py-3 px-4">
                    <span className="text-white font-bold">{item.actual}</span>
                    <span className="text-neutral-500 text-[10px] block font-sans">({item.action})</span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-white">{item.score}%</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold ${
                      item.status === 'PASS' 
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                    }`}>
                      {item.status === 'PASS' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
