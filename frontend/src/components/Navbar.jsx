import React from 'react';
import { BarChart2 } from 'lucide-react';
import { TriageCoreLogo } from './TriageCoreLogo';

export function Navbar({ currentScreen, onNavigate }) {
  return (
    <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-5">
          <div 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            {/* Custom Isometric Core Logo */}
            <TriageCoreLogo size={28} />
            
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white group-hover:text-neutral-200 transition-colors">
                TriageCore
              </span>
              <span className="text-[10px] text-neutral-400 font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                v0.1.0
              </span>
            </div>
          </div>

          <div className="h-3.5 w-px bg-white/[0.1]" />

          {/* Project indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-neutral-500 font-mono text-[11px]">REPO</span>
            <span className="font-mono text-neutral-300 text-xs bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.07]">
              ShopFlow / main
            </span>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentScreen === 'dashboard'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Reliability Feed
          </button>
          
          <button
            onClick={() => onNavigate('benchmark')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentScreen === 'benchmark'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Benchmark</span>
          </button>
        </nav>

        {/* Engine status indicator */}
        <div className="flex items-center gap-2 bg-white/[0.03] px-2.5 py-1 rounded-full border border-white/[0.08]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-mono text-neutral-400 tracking-tight">API :8000</span>
        </div>

      </div>
    </header>
  );
}
