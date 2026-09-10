import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { ReliabilityDashboard } from './components/ReliabilityDashboard';
import { QADetailScreen } from './components/QADetailScreen';
import { CIDetailScreen } from './components/CIDetailScreen';
import { PRReviewScreen } from './components/PRReviewScreen';
import { BenchmarkScreen } from './components/BenchmarkScreen';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import { TriageCoreLogo } from './components/TriageCoreLogo';
import { PipelineSimulator } from './components/PipelineSimulator';

export function App() {
  const [currentScreen, setCurrentScreen] = useState('simulator');
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerAgent, setDrawerAgent] = useState('QA');
  const [drawerTrace, setDrawerTrace] = useState('');

  // PR context
  const [prContext, setPrContext] = useState({ type: 'QA', score: 68 });

  // QA screen state (updated live on button press)
  const [qaState, setQaState] = useState({
    confidenceScore: 68,
    classification: 'likely_regression',
    pocVerdict: 'MASKED_REGRESSION_ESCALATED',
    recommendedAction: 'escalate',
    reasoningTrace: 'Selector healed, but post-click observation detected console ReferenceError during payment submission.',
    durationMs: 0,
    isLive: false,
  });

  // Feed items
  const [feedItems, setFeedItems] = useState([
    {
      id: 'qa-1',
      agent: 'QA',
      title: 'Selector healed: Add to Cart button',
      subtitle: 'tests/e2e/checkout.spec.ts:38 · Healed via Semantic DOM matching',
      confidenceScore: 68,
      status: 'Escalated — Needs Review',
      timestamp: '2m ago',
      route: 'qa-detail',
      isLive: false
    },
    {
      id: 'ci-1',
      agent: 'CI',
      title: 'Build #482 classified: Dependency break',
      subtitle: 'Workflow main-ci.yml · Suspect commit: a3f21c9 (@stripe/stripe-js)',
      confidenceScore: 91,
      status: 'Auto-Fix Proposed',
      timestamp: '14m ago',
      route: 'ci-detail',
      isLive: false
    },
    {
      id: 'qa-2',
      agent: 'QA',
      title: 'Selector healed: Complete Purchase button',
      subtitle: 'tests/e2e/payment.spec.ts:104 · Button ID healed & action verified',
      confidenceScore: 95,
      status: 'Auto-Healed',
      timestamp: '1h ago',
      route: 'qa-detail',
      isLive: false
    },
    {
      id: 'ci-2',
      agent: 'CI',
      title: 'Build #479 classified: Flaky test',
      subtitle: 'Workflow e2e-nightly.yml · Intermittent network timeout in worker 3',
      confidenceScore: 87,
      status: 'Auto-Fix Proposed',
      timestamp: '3h ago',
      route: 'ci-detail',
      isLive: false
    }
  ]);

  // Handle live QA state update and sync feed
  const handleUpdateQaState = (newState) => {
    setQaState(newState);
    setFeedItems(prev => prev.map(item => {
      if (item.id === 'qa-1') {
        return {
          ...item,
          confidenceScore: newState.confidenceScore,
          status: newState.recommendedAction === 'heal' ? 'Auto-Healed' : 'Escalated — Needs Review',
          subtitle: `Live Detection: ${newState.pocVerdict || newState.classification} (${newState.durationMs}ms)`,
          isLive: true
        };
      }
      return item;
    }));
  };

  const handleNavigate = (screen, extraContext = null) => {
    if (extraContext) {
      setPrContext(extraContext);
    }
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDrawer = (agentType, trace) => {
    setDrawerAgent(agentType);
    setDrawerTrace(trace);
    setDrawerOpen(true);
  };

  const handleSelectFeedRow = (item) => {
    if (item.route === 'qa-detail') {
      setCurrentScreen('qa-detail');
    } else if (item.route === 'ci-detail') {
      setCurrentScreen('ci-detail');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResolvePR = (type, newStatus) => {
    setFeedItems(prev => prev.map(item => {
      if ((type === 'qa' && item.id === 'qa-1') || (type === 'ci' && item.id === 'ci-1')) {
        return { ...item, status: newStatus };
      }
      return item;
    }));
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans bg-dot-grid selection:bg-neutral-800 selection:text-white">
      <Navbar currentScreen={currentScreen} onNavigate={handleNavigate} />

      <main className="flex-1">
        {currentScreen === 'simulator' && (
          <PipelineSimulator
            onNavigate={handleNavigate}
            onOpenDrawer={handleOpenDrawer}
            qaState={qaState}
            setQaState={handleUpdateQaState}
          />
        )}

        {currentScreen === 'dashboard' && (
          <ReliabilityDashboard 
            feedItems={feedItems} 
            onSelectRow={handleSelectFeedRow}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'qa-detail' && (
          <QADetailScreen
            onNavigate={handleNavigate}
            onOpenDrawer={handleOpenDrawer}
            qaState={qaState}
            setQaState={handleUpdateQaState}
          />
        )}

        {currentScreen === 'ci-detail' && (
          <CIDetailScreen
            onNavigate={handleNavigate}
            onOpenDrawer={handleOpenDrawer}
          />
        )}

        {currentScreen === 'pr-review' && (
          <PRReviewScreen
            onNavigate={handleNavigate}
            prContext={prContext}
            onResolvePR={handleResolvePR}
          />
        )}

        {currentScreen === 'benchmark' && (
          <BenchmarkScreen onNavigate={handleNavigate} />
        )}
      </main>

      {/* Minimalist Editorial Footer */}
      <footer className="border-t border-white/[0.08] bg-black/90 py-8 px-6 mt-16">
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

      {/* Shared Evidence Drawer */}
      <EvidenceDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        agentType={drawerAgent}
        reasoningTrace={drawerTrace}
      />
    </div>
  );
}

export default App;
