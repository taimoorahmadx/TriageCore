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
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      
      {/* Back Button & PR Badge */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <button
          onClick={() => onNavigate(isQA ? 'qa-detail' : 'ci-detail')}
          className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>&larr; Back to Agent Investigation</span>
        </button>

        <div className="flex items-center gap-2.5">
          <AgentBadge type={isQA ? "QA" : "CI"} size="sm" />
          <span className="text-xs font-mono text-neutral-300 bg-white/[0.04] px-2.5 py-0.5 rounded border border-white/[0.08]">
            {isQA ? 'PR #83 · Auto-Healed Selector' : 'PR #84 · Dependency Rollback'}
          </span>
        </div>
      </div>

      {/* PR Title & Metadata */}
      <div className="bg-neutral-950/70 border border-white/[0.08] rounded-xl p-6 space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-white/[0.04] text-neutral-300 border border-white/[0.08] mt-0.5">
            <GitPullRequest className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">PROPOSED AUTOMATED PULL REQUEST</span>
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mt-0.5">
              {isQA 
                ? "fix(qa): update stale checkout button selector to [data-testid='cart-add']" 
                : "fix(deps): pin @stripe/stripe-js to 4.1.0 to resolve breaking API regression"}
            </h1>
            <p className="text-xs text-neutral-400 mt-1 font-mono">
              Opened by <span className="text-neutral-200">TriageCore AI Agent</span> &middot; target: <span className="text-neutral-200">main</span> &larr; branch: <span className="text-neutral-200">{isQA ? 'auto-heal/cart-btn-selector' : 'auto-fix/stripe-js-pin'}</span>
            </p>
          </div>
        </div>

        {/* Safety Rule Callout */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-3 flex items-center gap-3 text-xs text-neutral-300">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-white">Human-Gating Constraint:</strong> Autonomous merging is strictly prohibited. A human engineer must inspect the code diff and authorize this pull request.
          </span>
        </div>
      </div>

      {/* Main Grid: Diff on left, Score & Decision Box on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 spans): Code Diff */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
              Proposed Code Changes
            </h2>
            <span className="text-[11px] font-mono text-neutral-500">1 File Modified</span>
          </div>

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

          {/* Audit comment box */}
          <div className="bg-neutral-950/70 border border-white/[0.08] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-neutral-400">
              <MessageSquare className="w-3.5 h-3.5 text-neutral-300" />
              <span>Reviewer Audit Note</span>
            </div>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Leave an audit comment before merging (e.g., 'Verified against staging checkout flow')..."
              className="w-full bg-black border border-white/[0.08] rounded-lg p-3 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-white/[0.2] font-mono"
            />
          </div>
        </div>

        {/* Right Column: Mini Dial & Actions */}
        <div className="bg-neutral-950/70 border border-white/[0.08] rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">ENGINE METRIC</span>
            <h2 className="text-sm font-semibold text-white tracking-tight">Agent Confidence</h2>
            <p className="text-[11px] text-neutral-400 font-mono">Triage Score</p>
          </div>

          <ConfidenceDial
            score={prContext.score || (isQA ? 68 : 91)}
            size={140}
            label="PR Score"
          />

          <div className="space-y-2.5">
            <button
              onClick={handleApprove}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-lg text-xs font-semibold tracking-tight transition-all shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Authorize &amp; Merge PR</span>
            </button>

            <button
              onClick={handleReject}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/[0.04] hover:bg-rose-500/[0.1] hover:text-rose-300 border border-white/[0.08] hover:border-rose-500/30 text-neutral-300 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Reject (Flag for Manual Fix)</span>
            </button>
          </div>

          <p className="text-[10px] text-neutral-500 text-center font-mono leading-relaxed border-t border-white/[0.06] pt-3">
            Actions synchronously update the Reliability Feed status in Postgres.
          </p>
        </div>

      </div>

    </div>
  );
}
