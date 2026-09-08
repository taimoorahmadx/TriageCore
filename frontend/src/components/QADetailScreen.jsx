import React, { useState } from 'react';
import { ConfidenceDial } from './ConfidenceDial';
import { DiffView } from './DiffView';
import { AgentBadge } from './AgentBadge';
import { StatusPill } from './StatusPill';
import { ArrowLeft, AlertCircle, CheckCircle2, Terminal, RefreshCw, Cpu, Layers, ExternalLink } from 'lucide-react';

export function QADetailScreen({ onNavigate, onOpenDrawer, qaState, setQaState }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleRunLiveDetection = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('http://localhost:8000/api/poc/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scenario: 'trap' }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to reach local POC API.`);
      }

      const result = await response.json();

      setQaState({
        confidenceScore: result.confidence_score,
        classification: result.classification,
        recommendedAction: result.recommended_action,
        reasoningTrace: result.reasoning_trace,
        durationMs: result.duration_ms,
        pocVerdict: result.poc_verdict,
        isLive: true,
      });

    } catch (err) {
      console.error("Live detection execution error:", err);
      setErrorMsg("Could not connect to FastAPI server at localhost:8000. Ensure 'python3 -m uvicorn poc_api.main:app' is running.");
    } finally {
      setLoading(false);
    }
  };

  const isHeal = qaState.recommendedAction === 'heal';

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      
      {/* Back Button & Agent Metadata */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <button
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>&larr; Back to Reliability Feed</span>
        </button>

        <div className="flex items-center gap-2.5">
          <AgentBadge type="QA" size="sm" />
          <StatusPill status={isHeal ? "Auto-Healed" : "Escalated — Needs Review"} />
        </div>
      </div>

      {/* Hero Header & Live Execution Button */}
      <div className="bg-neutral-950/70 border border-white/[0.08] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">INCIDENT #QA-104</span>
            {qaState.isLive && (
              <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded">
                LIVE DETECTED &middot; {qaState.durationMs}ms
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Guest can add item to cart <span className="font-serif italic font-normal text-amber-200/90">& checkout</span>
          </h1>
          <p className="text-xs text-neutral-400 font-mono">
            tests/e2e/checkout.spec.ts:38 &middot; Engine: Playwright (Chromium)
          </p>
        </div>

        {/* High-Contrast Action Button */}
        <button
          id="run-live-detection-btn"
          onClick={handleRunLiveDetection}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 bg-white text-black hover:bg-neutral-200 disabled:opacity-60 rounded-lg font-semibold text-xs tracking-tight shadow-sm transition-all cursor-pointer whitespace-nowrap self-start md:self-auto"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-700" />
              <span>Running Playwright & LLM (~5s)...</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Run Live Detection</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/[0.08] border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-center gap-2.5 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Left Execution & Diff, Right Confidence Dial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 spans): Execution trace and Selector Diff */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Execution Trace */}
          <div className="bg-neutral-950/70 border border-white/[0.08] rounded-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-neutral-300" />
                <span>Playwright Execution Trace</span>
              </h2>
              <span className="text-[10px] font-mono text-neutral-500">4 STEPS RECORDED</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-lg text-neutral-300 border border-white/[0.05]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-neutral-500 text-[11px]">01</span>
                <span>page.goto('/shop/products/wireless-headphones')</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-lg text-neutral-300 border border-white/[0.05]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-neutral-500 text-[11px]">02</span>
                <span>page.waitForSelector('.product-details-container')</span>
              </div>
              {/* Highlighted Failing Step */}
              <div className="flex items-center gap-3 p-2.5 bg-rose-500/[0.08] rounded-lg text-rose-200 border border-rose-500/20">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="text-rose-400/80 text-[11px]">03</span>
                <span className="font-semibold">page.click('#add-to-cart-btn')</span>
                <span className="ml-auto text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                  TimeoutError: 2000ms
                </span>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-white/[0.03] rounded-lg text-neutral-200 border border-white/[0.08]">
                <Cpu className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                <span className="text-neutral-500 text-[11px]">04</span>
                <span>Agent: Semantic relocation & post-click triage invoked</span>
              </div>
            </div>
          </div>

          {/* Before / After Selector Diff Card */}
          <div className="bg-neutral-950/70 border border-white/[0.08] rounded-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
                Healed Selector Candidate
              </h2>
              <span className="text-[11px] text-neutral-400 font-mono">Role: button &middot; Name: "Add to Cart"</span>
            </div>

            <DiffView
              filename="tests/e2e/checkout.spec.ts"
              title="DOM Selector Diff"
              oldCode={`// Stale element selector\nawait page.click('#add-to-cart-btn');`}
              newCode={`// Healed via Semantic DOM matching\nawait page.click('[data-testid="cart-add"]');`}
            />
          </div>

        </div>

        {/* Right Column: Shared Confidence Dial & Evidence Trigger */}
        <div className="bg-neutral-950/70 border border-white/[0.08] rounded-xl p-6 flex flex-col items-center justify-between space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">ENGINE METRIC</span>
            <h2 className="text-sm font-semibold text-white tracking-tight">Confidence Score</h2>
            <p className="text-[11px] text-neutral-400 font-mono">Empirical Decision Gate</p>
          </div>

          {/* Modern Dial Gauge */}
          <ConfidenceDial
            score={qaState.confidenceScore}
            isLoading={loading}
            size={160}
            label="Confidence"
          />

          {/* Evidence Drawer Trigger Button */}
          <button
            onClick={() => onOpenDrawer('QA', qaState.reasoningTrace)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200 hover:text-white rounded-lg text-xs font-mono font-medium border border-white/[0.1] transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            <span>View Evidence Telemetry &rarr;</span>
          </button>

          <div className="text-[11px] text-neutral-500 font-mono text-center leading-relaxed border-t border-white/[0.06] pt-3 w-full">
            Autonomous threshold: <span className="text-neutral-300 font-semibold">85%</span>. Scores below threshold escalate to human.
          </div>
        </div>

      </div>

      {/* Decision Banner reflecting dial band */}
      <div className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
        isHeal
          ? 'bg-emerald-500/[0.06] border-emerald-500/20 text-emerald-300'
          : 'bg-rose-500/[0.06] border-rose-500/25 text-rose-200'
      }`}>
        <div className="flex items-start sm:items-center gap-3">
          {isHeal ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
          )}
          <div>
            <div className="text-sm font-semibold text-white tracking-tight">
              {isHeal 
                ? "Confidence above threshold — safe heal verified." 
                : "Confidence below auto-heal threshold — escalated for human review."}
            </div>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              {qaState.isLive 
                ? `Live Groq Diagnosis [${qaState.pocVerdict || qaState.classification}]: ${qaState.reasoningTrace}`
                : "Selector physically healed, but post-click observation detected console ReferenceError during payment submission."}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('pr-review', { type: 'QA', score: qaState.confidenceScore })}
          className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-white rounded-lg text-xs font-mono font-medium whitespace-nowrap cursor-pointer transition-all self-start sm:self-auto"
        >
          Review Escalation &rarr;
        </button>
      </div>

    </div>
  );
}
