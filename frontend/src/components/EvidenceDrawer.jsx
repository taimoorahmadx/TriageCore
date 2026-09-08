import React from 'react';
import { X, Layers, Activity, Cpu } from 'lucide-react';
import { AgentBadge } from './AgentBadge';

export function EvidenceDrawer({ isOpen, onClose, agentType = 'QA', reasoningTrace = '', factors = [] }) {
  if (!isOpen) return null;

  const isQA = agentType === 'QA' || agentType === 'qa';

  const defaultQAFactors = [
    { name: 'Semantic Selector Similarity', weight: '35%', score: 92, color: 'bg-emerald-400' },
    { name: 'DOM Structural Matching', weight: '25%', score: 88, color: 'bg-emerald-400' },
    { name: 'Console Error & Exception Correlation', weight: '25%', score: 20, color: 'bg-rose-400' },
    { name: 'Historical Selector Stability', weight: '15%', score: 40, color: 'bg-amber-400' }
  ];

  const defaultCIFactors = [
    { name: 'Log Pattern Match', weight: '35%', score: 95, color: 'bg-emerald-400' },
    { name: 'Dependency Changelog Correlation', weight: '30%', score: 87, color: 'bg-emerald-400' },
    { name: 'Commit Proximity to Pipeline Failure', weight: '25%', score: 90, color: 'bg-emerald-400' },
    { name: 'Branch Context & Isolation', weight: '10%', score: 80, color: 'bg-emerald-400' }
  ];

  const displayFactors = factors.length > 0 ? factors : (isQA ? defaultQAFactors : defaultCIFactors);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#08080a] border-l border-white/[0.08] shadow-2xl flex flex-col justify-between">
          
          {/* Header */}
          <div className="p-6 border-b border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-neutral-300" />
                <h2 className="text-base font-semibold text-white tracking-tight">Evidence Telemetry</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-500">
              <AgentBadge type={agentType} size="sm" />
              <span>ConfidenceEngine Weights</span>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            
            {/* Model Reasoning Trace */}
            <div className="bg-black border border-white/[0.08] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                <Cpu className="w-3.5 h-3.5 text-neutral-300" />
                <span className="uppercase tracking-wider">LLM DIAGNOSTIC TRACE</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed font-mono bg-neutral-950 p-3 rounded-lg border border-white/[0.05]">
                {reasoningTrace || (isQA 
                  ? "Post-click evaluation detected console ReferenceError during payment submission. Healed selector masked a broken JavaScript click handler."
                  : "Failure trace maps directly to commit a3f21c9 touching package.json. Dependency bump to stripe-js v4.2.0 introduced API deprecation.")}
              </p>
            </div>

            {/* Weighted Signals breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
                  Weighted Evidence Signals
                </h3>
                <span className="text-[11px] text-neutral-500 font-mono">weights.yaml</span>
              </div>

              <div className="space-y-2.5">
                {displayFactors.map((factor, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-lg space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-300 font-medium">{factor.name}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-neutral-500 text-[10px]">W: {factor.weight}</span>
                        <span className="font-semibold text-white">{factor.score}%</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-neutral-900 h-1 rounded-full overflow-hidden">
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
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 flex gap-3 items-start">
              <Activity className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
              <div className="text-xs text-neutral-400 leading-relaxed">
                <span className="font-semibold text-neutral-200">Shared taxonomy:</span> Telemetry is weighted identically across QA and CI decisions. All evaluations are persisted to Postgres for auditable traceability.
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/[0.08] bg-black">
            <button
              onClick={onClose}
              className="w-full py-2 bg-white text-black hover:bg-neutral-200 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              Close Drawer
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
