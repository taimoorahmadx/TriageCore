import React, { useState } from 'react';
import { ConfidenceDial } from './ConfidenceDial';
import { DiffView } from './DiffView';
import { AgentBadge } from './AgentBadge';
import { StatusPill } from './StatusPill';
import { ArrowLeft, Play, AlertCircle, CheckCircle2, Terminal, RefreshCw, Cpu, Layers } from 'lucide-react';

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

      // Update state with genuine model-computed result
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
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-7">
      
      {/* Back Button & Agent Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reliability Feed</span>
        </button>

        <div className="flex items-center gap-2">
          <AgentBadge type="QA" />
          <StatusPill status={isHeal ? "Auto-Healed" : "Escalated — Needs Review"} />
        </div>
      </div>

      {/* Title & Live Action Button */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">Guest can add item to cart and checkout</h1>
            {qaState.isLive && (
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-mono font-semibold">
                LIVE DETECTED ({qaState.durationMs}ms)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-mono">
            tests/e2e/checkout.spec.ts:38 · Execution Engine: Playwright (Chromium)
          </p>
        </div>

        {/* ONE EXPLICIT LIVE DETECTION BUTTON */}
        <button
          id="run-live-detection-btn"
          onClick={handleRunLiveDetection}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs shadow-lg shadow-purple-900/30 transition-all cursor-pointer whitespace-nowrap"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-purple-200" />
              <span>Executing Playwright & LLM (~6s)...</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>Run Live Detection</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Left Execution & Diff, Right Confidence Dial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 spans): Execution trace and Selector Diff */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Execution Trace */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              <span>Playwright Execution Trace</span>
            </h2>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center gap-3 p-2 bg-slate-950/70 rounded-lg text-slate-300 border border-slate-800/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-500">1.</span>
                <span>page.goto('/shop/products/wireless-headphones')</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-slate-950/70 rounded-lg text-slate-300 border border-slate-800/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-500">2.</span>
                <span>page.waitForSelector('.product-details-container')</span>
              </div>
              {/* Highlighted Failing Step */}
              <div className="flex items-center gap-3 p-2.5 bg-rose-950/30 rounded-lg text-rose-300 border border-rose-800/60">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="text-rose-500">3.</span>
                <span className="font-semibold">page.click('#add-to-cart-btn')</span>
                <span className="ml-auto text-[11px] bg-rose-900/50 text-rose-300 px-2 py-0.5 rounded border border-rose-700/50">
                  ✕ Element not found (Timeout 2000ms)
                </span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-purple-950/30 rounded-lg text-purple-300 border border-purple-800/60">
                <Cpu className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="text-purple-500">4.</span>
                <span>Agent: Semantic relocation & post-click triage invoked</span>
              </div>
            </div>
          </div>

          {/* Before / After Selector Diff Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Healed Selector Candidate
              </h2>
              <span className="text-xs text-purple-400 font-mono">Role: button · Text: "Add to Cart"</span>
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
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-between space-y-6">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Shared Confidence Dial</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">ConfidenceEngine Decision Threshold</p>
          </div>

          {/* Circular SVG Gauge */}
          <ConfidenceDial
            score={qaState.confidenceScore}
            isLoading={loading}
            size={160}
            label="Confidence"
          />

          {/* Evidence Drawer Button */}
          <button
            onClick={() => onOpenDrawer('QA', qaState.reasoningTrace)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-medium border border-slate-700/60 transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>View evidence breakdown →</span>
          </button>

          <div className="text-[11px] text-slate-500 text-center leading-relaxed">
            Safe auto-heal threshold is calibrated to <span className="font-semibold text-slate-300">85%</span>. Decisions below threshold require human gating.
          </div>
        </div>

      </div>

      {/* Decision Banner reflecting dial band */}
      <div className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
        isHeal
          ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
          : 'bg-amber-950/40 border-amber-800/80 text-amber-300'
      }`}>
        <div className="flex items-center gap-3">
          {isHeal ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div>
            <div className="text-sm font-bold text-white">
              {isHeal 
                ? "Confidence above threshold — auto-healed and verified." 
                : "Confidence below auto-heal threshold — escalated for human review."}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {qaState.isLive 
                ? `Live Groq Diagnosis [${qaState.pocVerdict || qaState.classification}]: ${qaState.reasoningTrace}`
                : "Selector physically healed, but silent JavaScript ReferenceError detected on button trigger."}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('pr-review', { type: 'QA', score: qaState.confidenceScore })}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
        >
          Review Proposed Fix →
        </button>
      </div>

    </div>
  );
}
