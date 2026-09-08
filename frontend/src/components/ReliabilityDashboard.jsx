import React, { useState } from 'react';
import { AgentBadge } from './AgentBadge';
import { StatusPill } from './StatusPill';
import { TrendingDown, TrendingUp, ChevronRight, Activity, Layers, ShieldAlert } from 'lucide-react';

export function ReliabilityDashboard({ feedItems, onSelectRow }) {
  const [activeTab, setActiveTab] = useState('all');

  const filteredItems = feedItems.filter(item => {
    if (activeTab === 'qa') return item.agent === 'QA';
    if (activeTab === 'ci') return item.agent === 'CI';
    if (activeTab === 'needs-review') return item.status.includes('Review') || item.status.includes('Escalated');
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      
      {/* Editorial Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-500">
            System Telemetry &middot; Pipeline Intelligence
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
          Reliability. Root cause. <span className="font-serif italic font-normal text-amber-200/90">One engine.</span>
        </h1>
        <p className="text-sm text-neutral-400 max-w-2xl">
          Unified confidence scoring across Playwright UI test suites and GitHub Actions CI pipelines to distinguish safe autonomous self-healing from masked regressions.
        </p>
      </div>

      {/* Top Stat Row - Sockt Inspired Technical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 01: Pass/Fail History */}
        <div className="bg-neutral-950/70 border border-white/[0.08] hover:border-white/[0.16] rounded-xl p-5 relative overflow-hidden transition-all group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
              Pass/Fail Stability
            </span>
            <span className="font-mono text-[11px] text-neutral-600">01</span>
          </div>
          
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-semibold tracking-tight text-white font-sans">99.2%</span>
            <span className="text-xs font-mono text-emerald-400 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +0.8%
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 font-mono mt-1">Across 482 CI workflows</p>

          {/* Minimalist Sparkline */}
          <div className="flex items-end gap-1.5 h-6 mt-5 pt-1">
            {[40, 55, 60, 45, 80, 75, 90, 85, 95, 99].map((h, i) => (
              <div 
                key={i} 
                className="flex-1 bg-neutral-800 group-hover:bg-neutral-700 rounded-xs transition-all"
                style={{ height: `${h}%` }} 
              />
            ))}
          </div>
        </div>

        {/* Card 02: Flakiness Trend */}
        <div className="bg-neutral-950/70 border border-white/[0.08] hover:border-white/[0.16] rounded-xl p-5 relative overflow-hidden transition-all group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
              Flakiness Rate
            </span>
            <span className="font-mono text-[11px] text-neutral-600">02</span>
          </div>
          
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-semibold tracking-tight text-white font-sans">1.4%</span>
            <span className="text-xs font-mono text-emerald-400 flex items-center">
              <TrendingDown className="w-3 h-3 mr-0.5" /> -0.6%
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 font-mono mt-1">Stale selectors suppressed</p>

          {/* Minimalist Sparkline */}
          <div className="flex items-end gap-1.5 h-6 mt-5 pt-1">
            {[65, 50, 45, 40, 35, 30, 25, 20, 18, 14].map((h, i) => (
              <div 
                key={i} 
                className="flex-1 bg-neutral-800 group-hover:bg-neutral-700 rounded-xs transition-all"
                style={{ height: `${h}%` }} 
              />
            ))}
          </div>
        </div>

        {/* Card 03: Decision Accuracy */}
        <div className="bg-neutral-950/70 border border-white/[0.08] hover:border-white/[0.16] rounded-xl p-5 relative overflow-hidden transition-all group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
              Decision Accuracy
            </span>
            <span className="font-mono text-[11px] text-neutral-600">03</span>
          </div>
          
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-semibold tracking-tight text-white font-sans">89%</span>
            <span className="text-[11px] font-mono text-neutral-400">human PR approval</span>
          </div>
          <p className="text-[11px] text-neutral-500 font-mono mt-1">Target FPR &lt; 5%</p>

          {/* Progress bar */}
          <div className="mt-5 space-y-1.5">
            <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden border border-white/[0.06]">
              <div className="bg-white h-full rounded-full transition-all" style={{ width: '89%' }} />
            </div>
            <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
              <span>34 Auto-Merged</span>
              <span>4 Escalated</span>
            </div>
          </div>
        </div>

      </div>

      {/* Unified Decision Feed Section */}
      <div className="space-y-4">
        
        {/* Header & Clean Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">
                Live Decision Timeline
              </h2>
              <span className="text-[10px] font-mono bg-white/[0.04] text-neutral-400 px-2 py-0.5 rounded border border-white/[0.08]">
                CONFIDENCE ENGINE OUTPUT
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Select any event to view DOM diffs, browser console logs, and reasoning traces.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-white/[0.02] p-1 rounded-lg border border-white/[0.08] text-xs">
            {['all', 'qa', 'ci', 'needs-review'].map((tab) => {
              const labels = {
                all: 'All Signals',
                qa: 'QA Agent',
                ci: 'CI Agent',
                'needs-review': 'Escalated'
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 rounded font-mono text-[11px] transition-all ${
                    activeTab === tab
                      ? 'bg-white text-black font-semibold shadow-xs'
                      : 'text-neutral-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feed List Items */}
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectRow(item)}
              className="bg-neutral-950/60 hover:bg-neutral-900/60 border border-white/[0.07] hover:border-white/[0.14] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer group"
            >
              {/* Left info */}
              <div className="flex items-start sm:items-center gap-3.5">
                <AgentBadge type={item.agent} size="sm" />
                
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">
                      {item.title}
                    </span>
                    {item.isLive && (
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded">
                        LIVE DEMO
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-500 font-mono mt-0.5 block">{item.subtitle}</span>
                </div>
              </div>

              {/* Right status & dial */}
              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/[0.05]">
                
                {/* Confidence indicator */}
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-xs font-semibold text-neutral-300">{item.confidenceScore}%</span>
                  <span className="text-[10px] text-neutral-500 uppercase">conf</span>
                </div>

                {/* Status Pill */}
                <StatusPill status={item.status} />

                <span className="text-xs text-neutral-500 font-mono w-14 text-right">{item.timestamp}</span>

                <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
