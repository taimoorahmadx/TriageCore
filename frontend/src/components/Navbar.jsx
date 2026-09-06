import React from 'react';
import { ShieldCheck, Cpu, BarChart2, Radio } from 'lucide-react';

export function Navbar({ currentScreen, onNavigate }) {
  return (
    <header className="sticky top-0 z-40 bg-[#0A0E17]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-6">
          <div 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-md shadow-purple-900/30 group-hover:scale-105 transition-transform">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white group-hover:text-purple-300 transition-colors">TriageCore</span>
              <span className="text-[10px] text-purple-400 font-mono ml-2 px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/50">ENGINE v0.1</span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Project indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-500">Repository:</span>
            <span className="font-mono text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">ShopFlow / main</span>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentScreen === 'dashboard'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Reliability Feed
          </button>
          
          <button
            onClick={() => onNavigate('benchmark')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentScreen === 'benchmark'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Benchmark & Eval</span>
          </button>
        </nav>

        {/* Engine status indicator */}
        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-mono text-slate-300">Live API: :8000</span>
        </div>

      </div>
    </header>
  );
}
