import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { TriageCoreLogo } from './components/TriageCoreLogo';
import { QAEngineScreen } from './qa/QAEngineScreen';
import { EvaluationScreen } from './qa/EvaluationScreen';
import { LegacyPoc } from './legacy/LegacyPoc';

export function App() {
  const [currentScreen, setCurrentScreen] = useState('qa-engine');

  const handleNavigate = (screen) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans bg-dot-grid selection:bg-[#0a84ff]/30 selection:text-white">
      <Navbar currentScreen={currentScreen} onNavigate={handleNavigate} />

      <main className="flex-1">
        {currentScreen === 'qa-engine' && <QAEngineScreen />}
        {currentScreen === 'evaluation' && <EvaluationScreen />}
        {currentScreen === 'simulator' && <LegacyPoc />}
      </main>

      {/* Minimalist Editorial Footer */}
      <footer className="border-t border-white/[0.06] bg-black/80 backdrop-blur-md py-8 px-6 mt-16">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 font-mono">
          <div className="flex items-center gap-2.5">
            <TriageCoreLogo size={20} />
            <span className="text-neutral-300 font-semibold text-xs tracking-tight">TriageCore</span>
            <span>·</span>
            <span>Shared Confidence Engine for Autonomous QA & CI</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>FastAPI :8000</span>
            <span>·</span>
            <span>Playwright Chromium</span>
            <span>·</span>
            <span>Groq LPU</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
