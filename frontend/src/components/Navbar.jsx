import React from 'react';
import { BarChart2, Play } from 'lucide-react';
import { TriageCoreLogo } from './TriageCoreLogo';

export function Navbar({ currentScreen, onNavigate }) {
  return (
    <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-5">
          <div 
            onClick={() => onNavigate('simulator')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            {/* Custom Isometric Core Logo */}
            <TriageCoreLogo size={28} />
            
            <span className="font-semibold text-sm tracking-tight text-white group-hover:text-neutral-200 transition-colors">
              TriageCore
            </span>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigate('simulator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentScreen === 'simulator'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Live Test & Triage</span>
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentScreen === 'dashboard'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Triage History
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
            <span>Benchmark (15 Cases)</span>
          </button>
        </nav>



      </div>
    </header>
  );
}
