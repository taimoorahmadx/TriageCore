import React, { useState } from 'react';
import { ConfidenceDial } from './ConfidenceDial';
import { DiffView } from './DiffView';
import { AgentBadge } from './AgentBadge';
import { ArrowLeft, GitPullRequest, Check, X, ShieldAlert, MessageSquare } from 'lucide-react';

export function PRReviewScreen({ onNavigate, prContext = { type: 'QA', score: 68 }, onResolvePR }) {
  const [comment, setComment] = useState('');
  const isQA = prContext.type === 'QA';

  const handleApprove = () => {
    onResolvePR(isQA ? 'qa' : 'ci', 'Merged');
    onNavigate('dashboard');
  };

  const handleReject = () => {
    onResolvePR(isQA ? 'qa' : 'ci', 'Flagged for manual fix');
    onNavigate('dashboard');
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-7">
      
      {/* Back Button & PR Badge */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate(isQA ? 'qa-detail' : 'ci-detail')}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Agent Investigation</span>
        </button>

        <div className="flex items-center gap-2">
          <AgentBadge type={isQA ? "QA" : "CI"} />
          <span className="text-xs font-mono text-purple-400 bg-purple-950/60 px-2.5 py-0.5 rounded border border-purple-800/60">
            {isQA ? 'PR #83 · Auto-Healed Selector' : 'PR #84 · Dependency Rollback'}
          </span>
        </div>
      </div>

      {/* PR Title & Metadata */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800/50">
            <GitPullRequest className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isQA 
                ? "fix(qa): update stale checkout button selector to [data-testid='cart-add']" 
                : "fix(deps): pin @stripe/stripe-js to 4.1.0 to resolve breaking API regression"}
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Opened by <span className="text-purple-300">TriageCore AI Agent</span> · target: <span className="text-slate-200">main</span> ← branch: <span className="text-slate-200">{isQA ? 'auto-heal/cart-btn-selector' : 'auto-fix/stripe-js-pin'}</span>
            </p>
          </div>
        </div>

        {/* Safety Rule Callout */}
        <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3 flex items-center gap-3 text-xs text-amber-300/90">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Human-Gating Policy:</strong> Autonomous merging is strictly prohibited by TriageCore standing constraints. A human maintainer must review and authorize this pull request.
          </span>
        </div>
      </div>

      {/* Main Grid: Diff on left, Score & Decision Box on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 spans): Code Diff */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Proposed Code Changes</h2>

          {isQA ? (
            <DiffView
              filename="tests/e2e/checkout.spec.ts"
              title="Selector line replacement"
              oldCode={`// Old failing selector\nawait page.click('#add-to-cart-btn');`}
              newCode={`// Relocated via Semantic matching\nawait page.click('[data-testid="cart-add"]');`}
            />
          ) : (
            <DiffView
              filename="package.json"
              title="Dependency version rollback"
              oldCode={`    "@stripe/stripe-js": "^4.2.0",`}
              newCode={`    "@stripe/stripe-js": "4.1.0",`}
            />
          )}

          {/* Non-functional comment box */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span>Reviewer Feedback / Audit Note</span>
            </div>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Leave an audit comment before merging (e.g., 'Verified against staging checkout flow')..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-sans"
            />
          </div>
        </div>

        {/* Right Column: Mini Dial & Actions */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Agent Confidence</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Decision Score at Triage Time</p>
          </div>

          <ConfidenceDial
            score={prContext.score || (isQA ? 68 : 91)}
            size={140}
            label="PR Score"
          />

          <div className="space-y-3">
            <button
              onClick={handleApprove}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-900/30 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Approve & Merge PR</span>
            </button>

            <button
              onClick={handleReject}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 hover:border-rose-800 text-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Reject (Flag for Manual Fix)</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            Actions synchronously update the Reliability Feed status on the main dashboard.
          </p>
        </div>

      </div>

    </div>
  );
}
