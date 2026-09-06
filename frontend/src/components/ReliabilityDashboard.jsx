import React, { useState } from 'react';
import { AgentBadge } from './AgentBadge';
import { StatusPill } from './StatusPill';
import { TrendingDown, TrendingUp, CheckCircle, ChevronRight, Activity, Filter } from 'lucide-react';

export function ReliabilityDashboard({ feedItems, onSelectRow }) {
  const [activeTab, setActiveTab] = useState('all');

  const filteredItems = feedItems.filter(item => {
    if (activeTab === 'qa') return item.agent === 'QA';
    if (activeTab === 'ci') return item.agent === 'CI';
    if (activeTab === 'needs-review') return item.status.includes('Review') || item.status.includes('Escalated');
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Reliability Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Shared confidence engine telemetries across Playwright QA test suites and GitHub Actions CI pipelines.
        </p>
      </div>

      {/* Top Stat Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Stat 1: Pass/Fail History */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pass/Fail Stability</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">99.2%</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +0.8%
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/80 text-purple-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          {/* Sparkline mini representation */}
          <div className="flex items-end gap-1.5 h-8 mt-4 pt-1">
            {[40, 55, 60, 45, 80, 75, 90, 85, 95, 99].map((h, i) => (
              <div 
                key={i} 
                className="flex-1 bg-purple-600/40 hover:bg-purple-500 rounded-t transition-all"
                style={{ height: `${h}%` }} 
              />
            ))}
          </div>
        </div>

        {/* Stat 2: Flakiness Trend */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Flakiness Trend</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">1.4%</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center">
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> -0.6%
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/80 text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          {/* Sparkline mini representation */}
          <div className="flex items-end gap-1.5 h-8 mt-4 pt-1">
            {[65, 50, 45, 40, 35, 30, 25, 20, 18, 14].map((h, i) => (
              <div 
                key={i} 
                className="flex-1 bg-amber-500/40 hover:bg-amber-400 rounded-t transition-all"
                style={{ height: `${h}%` }} 
              />
            ))}
          </div>
        </div>

        {/* Stat 3: Fix Acceptance Rate */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fix Acceptance Rate</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">89%</span>
                <span className="text-xs text-slate-400">human PR approval</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/80 text-cyan-400">
              <span className="text-xs font-bold font-mono">CCP</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-6">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full" style={{ width: '89%' }} />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 font-mono">
              <span>34 Approved</span>
              <span>4 Flagged Manual</span>
            </div>
          </div>
        </div>

      </div>

      {/* Unified Decision Feed */}
      <div className="space-y-4">
        
        {/* Header & Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Unified Decision Feed</span>
              <span className="text-xs font-mono bg-purple-950/60 text-purple-300 px-2 py-0.5 rounded border border-purple-800/50">
                Single Engine Output
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live timeline combining QA self-healing actions and CI pipeline triage.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'all' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'qa' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              QA Agent
            </button>
            <button
              onClick={() => setActiveTab('ci')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'ci' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CI Agent
            </button>
            <button
              onClick={() => setActiveTab('needs-review')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'needs-review' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Needs Review
            </button>
          </div>
        </div>

        {/* Feed List Items */}
        <div className="space-y-2.5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectRow(item)}
              className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-4 flex items-center justify-between transition-all cursor-pointer group"
            >
              {/* Left info */}
              <div className="flex items-center gap-4">
                <AgentBadge type={item.agent} />
                
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                      {item.title}
                    </span>
                    {item.isLive && (
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.2 rounded font-mono font-medium">
                        LIVE DEMO
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 mt-0.5 block">{item.subtitle}</span>
                </div>
              </div>

              {/* Right status & dial */}
              <div className="flex items-center gap-5">
                
                {/* Confidence indicator */}
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-slate-200">{item.confidenceScore}%</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Score</div>
                  </div>
                  <div 
                    className={`w-3 h-3 rounded-full ${
                      item.confidenceScore >= 85 
                        ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' 
                        : item.confidenceScore >= 60 
                        ? 'bg-amber-500 shadow-sm shadow-amber-500/50' 
                        : 'bg-rose-500 shadow-sm shadow-rose-500/50'
                    }`}
                  />
                </div>

                {/* Status Pill */}
                <StatusPill status={item.status} />

                <span className="text-xs text-slate-500 font-mono w-16 text-right">{item.timestamp}</span>

                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
