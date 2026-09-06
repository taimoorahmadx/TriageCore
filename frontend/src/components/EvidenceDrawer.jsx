import React from 'react';
import { X, Layers, Activity, Cpu } from 'lucide-react';
import { AgentBadge } from './AgentBadge';

export function EvidenceDrawer({ isOpen, onClose, agentType = 'QA', reasoningTrace = '', factors = [] }) {
  if (!isOpen) return null;

  const isQA = agentType === 'QA' || agentType === 'qa';

  const defaultQAFactors = [
    { name: 'Semantic Selector Similarity', weight: '35%', score: 92, color: 'bg-emerald-500' },
    { name: 'DOM Structural Matching', weight: '25%', score: 88, color: 'bg-emerald-500' },
    { name: 'Console Error & Exception Correlation', weight: '25%', score: 20, color: 'bg-rose-500' },
    { name: 'Historical Selector Stability', weight: '15%', score: 40, color: 'bg-amber-500' }
  ];

  const defaultCIFactors = [
    { name: 'Log Pattern Match', weight: '35%', score: 95, color: 'bg-emerald-500' },
    { name: 'Dependency Changelog Correlation', weight: '30%', score: 87, color: 'bg-emerald-500' },
    { name: 'Commit Proximity to Pipeline Failure', weight: '25%', score: 90, color: 'bg-emerald-500' },
    { name: 'Branch Context & Isolation', weight: '10%', score: 80, color: 'bg-emerald-500' }
  ];

  const displayFactors = factors.length > 0 ? factors : (isQA ? defaultQAFactors : defaultCIFactors);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0F172A] border-l border-slate-800 shadow-2xl flex flex-col justify-between">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold text-white">Evidence Breakdown</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <AgentBadge type={agentType} size="sm" />
              <span className="text-xs text-slate-400">ConfidenceEngine Scoring Weights</span>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            
            {/* Model Reasoning Trace */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>LLM DIAGNOSTIC TRACE</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed font-mono bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                {reasoningTrace || (isQA 
                  ? "Post-click evaluation detected console ReferenceError during payment submission. Healed selector masked a broken JavaScript click handler."
                  : "Failure trace maps directly to commit a3f21c9 touching package.json. Dependency bump to stripe-js v4.2.0 introduced API deprecation.")}
              </p>
            </div>

            {/* Weighted Signals breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Weighted Evidence Signals</h3>
                <span className="text-xs text-slate-500 font-mono">weights.yaml</span>
              </div>

              <div className="space-y-3.5">
                {displayFactors.map((factor, idx) => (
                  <div key={idx} className="bg-slate-900/60 border border-slate-800/60 p-3 rounded-lg space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">{factor.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono text-[11px]">Weight: {factor.weight}</span>
                        <span className="font-bold text-white font-mono">{factor.score}%</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${factor.color}`}
                        style={{ width: `${factor.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Auditability guarantee */}
            <div className="bg-purple-950/20 border border-purple-900/40 rounded-xl p-4 flex gap-3 items-start">
              <Activity className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="text-xs text-purple-300/90 leading-relaxed">
                <span className="font-bold text-purple-200">Shared taxonomy:</span> Evidence is weighted identically across QA and CI decisions. Decisions are transparent, fully auditable, and human-gated before pipeline intervention.
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center">
            <button
              onClick={onClose}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              Close Drawer
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
