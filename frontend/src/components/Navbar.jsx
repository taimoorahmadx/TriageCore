import React from 'react';
import { BarChart2, History, Play } from 'lucide-react';
import { TriageCoreLogo } from './TriageCoreLogo';

const TABS = [
  { id: 'qa-engine', label: 'QA Engine (live)', icon: Play },
  { id: 'evaluation', label: 'Evaluation', icon: BarChart2 },
  // The proposal-stage demo: its scores and the CI tab are scripted, kept for reference only.
  { id: 'simulator', label: 'Proposal PoC (scripted)', icon: History },
];

export function Navbar({ currentScreen, onNavigate }) {
  return (
    <header className="sticky top-0 z-40 apple-glass-nav border-b border-white/[0.08] transition-all">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div onClick={() => onNavigate('qa-engine')} className="flex items-center gap-2.5 cursor-pointer group select-none">
          <TriageCoreLogo size={28} />
          <span className="font-semibold text-sm tracking-tight text-white group-hover:text-neutral-200 transition-colors">
            TriageCore
          </span>
        </div>

        <nav className="flex items-center p-1 rounded-xl bg-white/[0.05] border border-white/[0.06] gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentScreen === id
                  ? 'bg-white text-black font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.25)]'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
