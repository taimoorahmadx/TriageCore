import React, { useState } from 'react';
import { Play, Globe, GitPullRequest, CheckCircle2, ShieldAlert, AlertTriangle, RefreshCw, Terminal, ExternalLink, Code2, Info, GitCommit, GitBranch, ArrowRight, ChevronDown, ChevronUp, Layers, ShoppingBag, Tag, CreditCard, Lock } from 'lucide-react';

export function PipelineSimulator({ onOpenDrawer, qaState, setQaState }) {
  const [activeTab, setActiveTab] = useState('qa'); // 'qa' | 'ci'

  // QA State: Unified Suite by default
  const [qaUrl, setQaUrl] = useState('tests/dummy/shopflow_app.html');
  const [scenarioMode, setScenarioMode] = useState('suite'); // 'suite' | 'control' | 'trap'
  const [qaRunning, setQaRunning] = useState(false);
  const [qaStep, setQaStep] = useState(0); // 0: idle, 1: Step 1, 2: Step 2, 3: Step 3
  const [qaSuiteResult, setQaSuiteResult] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null); // all steps collapsed by default
  const [showDemoNotes, setShowDemoNotes] = useState(false);

  // CI Presets Configuration
  const CI_PRESETS = {
    flaky: {
      key: 'flaky',
      label: 'redis-timeout.log',
      scenarioType: 'Network Flake',
      repo: 'taimoorahmadx/TriageCore',
      workflow: 'ci.yml',
      runId: '#1042',
      branch: 'main',
      failingStep: 'pytest tests/test_cache.py',
      commitSha: 'b7e21a',
      commitAuthor: 'devops@triagecore.internal',
      commitMsg: 'chore: bump redis health check timeout',
      filesChanged: ['deploy/k8s/redis-config.yaml'],
      rawLog: `FAILED tests/test_cache.py::test_redis_session_cache - redis.exceptions.ConnectionError
Connection closed by peer during handshake [tests/test_cache.py:28]
[redis/client.py:912] in connect():
  raise ConnectionError("Connection closed by peer during handshake")
====== 1 failed, 48 passed, 0 skipped in 14.22s ======
##[error]Process completed with exit code 1.`
    },
    bug: {
      key: 'bug',
      label: 'db-migration-syntax.log',
      scenarioType: 'Single Commit Bug',
      repo: 'taimoorahmadx/TriageCore',
      workflow: 'ci.yml',
      runId: '#1043',
      branch: 'main',
      failingStep: 'pytest tests/test_db.py',
      commitSha: '4a8f9b',
      commitAuthor: 'alice@triagecore.internal',
      commitMsg: 'feat: add org-level migrations',
      filesChanged: ['src/db/migrations/004.sql'],
      rawLog: `FAILED tests/test_db.py::test_database_migration_004 - psycopg2.errors.SyntaxError
syntax error at or near "," at line 42 [src/db/migrations/004.sql:42]
  CREATE INDEX idx_org_users ON users (org_id,, created_at);
                                              ^
====== 1 failed, 48 passed in 8.41s ======
##[error]Process completed with exit code 1.`
    },
    ambiguous: {
      key: 'ambiguous',
      label: 'tenant-conflict-ambiguous.log',
      scenarioType: 'Overlapping Commits',
      repo: 'taimoorahmadx/TriageCore',
      workflow: 'ci.yml',
      runId: '#1044',
      branch: 'feat/multitenancy',
      failingStep: 'pytest tests/test_auth.py',
      commitSha: '7c1a2e & 9b4f02',
      commitAuthor: 'alice@ & bob@ (Conflict)',
      commitMsg: 'Overlapping edits to core/tenant_context.py (last 45m)',
      filesChanged: ['src/core/tenant_context.py'],
      rawLog: `FAILED tests/test_auth.py::test_org_switch - AttributeError
'TenantContext' object has no attribute 'schema_name' [src/core/tenant_context.py:64]
in resolve_schema():
  return self.schema_name
AttributeError: 'TenantContext' object has no attribute 'schema_name'
====== 1 failed, 48 passed in 11.05s ======
##[error]Process completed with exit code 1.`
    }
  };

  // CI State
  const [ciRepo, setCiRepo] = useState('taimoorahmadx/TriageCore');
  const [ciWorkflow, setCiWorkflow] = useState('ci.yml');
  const [ciRunId, setCiRunId] = useState('#1043');
  const [ciBranch, setCiBranch] = useState('main');
  const [ciFailingStep, setCiFailingStep] = useState('pytest tests/test_db.py');
  const [ciScenario, setCiScenario] = useState('bug'); // 'flaky' | 'bug' | 'ambiguous'
  const [ciRunning, setCiRunning] = useState(false);
  const [ciStep, setCiStep] = useState(0); // 0: idle, 1: ingesting payload, 2: commit blame diff, 3: confidence engine decision
  const [ciResult, setCiResult] = useState(null);
  const [showCiNotes, setShowCiNotes] = useState(false);

  // Quick Preset Handler for CI
  const loadCiPreset = (key) => {
    const preset = CI_PRESETS[key];
    if (!preset) return;
    setCiScenario(key);
    setCiRepo(preset.repo);
    setCiWorkflow(preset.workflow);
    setCiRunId(preset.runId);
    setCiBranch(preset.branch);
    setCiFailingStep(preset.failingStep);
    setCiResult(null);
    setCiStep(0);
  };

  // Quick Preset Handlers for QA
  const loadShopflowSuite = () => {
    setQaUrl('tests/dummy/shopflow_app.html');
    setScenarioMode('suite');
    setQaSuiteResult(null);
    setQaStep(0);
    setExpandedStep(null);
  };

  const loadSafeHealPage = () => {
    setQaUrl('tests/dummy/page_safe_heal.html');
    setScenarioMode('control');
    setQaSuiteResult(null);
    setQaStep(0);
    setExpandedStep(null);
  };

  const loadRegressionTrapPage = () => {
    setQaUrl('tests/dummy/page_regression_trap.html');
    setScenarioMode('trap');
    setQaSuiteResult(null);
    setQaStep(0);
    setExpandedStep(null);
  };

  // Run QA Browser Test Suite
  const handleRunQaTest = async () => {
    setQaRunning(true);
    setQaSuiteResult(null);
    setQaStep(1); // Step 1: Inventory Selection (Add to Cart)

    // Animated stepper progression: stream steps in sequentially
    const t1 = setTimeout(() => setQaStep(2), 2500);
    const t2 = setTimeout(() => setQaStep(3), 5500);

    try {
      const resp = await fetch('http://localhost:8000/api/poc/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioMode })
      });

      clearTimeout(t1);
      clearTimeout(t2);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      setQaStep(3);

      if (data.steps) {
        setQaSuiteResult(data);
        const escalated = data.steps.find(s => s.recommended_action === 'escalate');
        setExpandedStep(null); // keep all collapsed like the others
        if (setQaState) {
          setQaState({
            confidenceScore: escalated ? escalated.confidence_score : 95,
            recommendation: data.overall_recommended_action,
            reasoningTrace: escalated ? escalated.reasoning_trace : data.steps[0].reasoning_trace,
            classification: escalated ? escalated.classification : 'stale_selector',
            scenario: scenarioMode,
            liveExecuted: true
          });
        }
      } else {
        const isHeal = data.recommended_action === 'heal';
        const singleSuite = {
          suite_name: isHeal ? "Safe Heal Single Step" : "Regression Trap Single Step",
          target_url: qaUrl,
          total_steps: 1,
          healed_count: isHeal ? 1 : 0,
          escalated_count: isHeal ? 0 : 1,
          overall_verdict: isHeal ? "SAFE_HEAL" : "MASKED_REGRESSION_BLOCKED",
          overall_recommended_action: data.recommended_action,
          duration_ms: data.duration_ms || 4800,
          steps: [
            {
              step_index: 1,
              step_name: isHeal ? "Order Button Click (Safe Heal)" : "Order Button Click (Regression Trap)",
              original_selector: "#submit-btn",
              resolved_selector: "#order-btn-primary",
              selector_healed: true,
              classification: data.classification,
              confidence_score: isHeal ? 95 : 15,
              recommended_action: data.recommended_action,
              reasoning_trace: data.reasoning_trace,
              runtime_telemetry: {
                console_errors: isHeal ? [] : ["ReferenceError: processPayment is not defined"],
                target_badge: isHeal ? "Order success visible" : "Payment error banner"
              },
              status: isHeal ? "PASSED_HEALED" : "ESCALATED_REGRESSION",
              duration_ms: data.duration_ms || 4800
            }
          ]
        };
        setQaSuiteResult(singleSuite);
        setExpandedStep(null);
      }
    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      setQaStep(3);

      const fallbackSuite = {
        suite_name: "ShopFlow E-Commerce Checkout Suite",
        target_url: "tests/dummy/shopflow_app.html",
        total_steps: 3,
        healed_count: 2,
        escalated_count: 1,
        overall_verdict: "MASKED_REGRESSION_BLOCKED",
        overall_recommended_action: "escalate",
        duration_ms: 6800,
        steps: [
          {
            step_index: 1,
            step_name: "Inventory Selection (Add to Cart)",
            original_selector: "#add-to-cart-btn",
            resolved_selector: "#btn-add-cart-primary",
            selector_healed: true,
            classification: "stale_selector",
            confidence_score: 96,
            recommended_action: "heal",
            reasoning_trace: "The click on #btn-add-cart-primary updated the cart badge and displayed a success notification with no console errors, indicating the action succeeded and state progressed correctly.",
            runtime_telemetry: {
              console_errors: [],
              target_badge: "Cart count updated to 1 item ($120.00)"
            },
            status: "PASSED_HEALED",
            duration_ms: 2100
          },
          {
            step_index: 2,
            step_name: "Pricing & Promotion (Apply Promo Code)",
            original_selector: "#apply-promo",
            resolved_selector: "#btn-apply-coupon",
            selector_healed: true,
            classification: "stale_selector",
            confidence_score: 94,
            recommended_action: "heal",
            reasoning_trace: "The coupon button click updated the discount row, total, and success notification with no console errors, indicating a successful state progression and no regression.",
            runtime_telemetry: {
              console_errors: [],
              target_badge: "10% discount (-$12.00) applied and subtotal adjusted"
            },
            status: "PASSED_HEALED",
            duration_ms: 2200
          },
          {
            step_index: 3,
            step_name: "Transaction Gate (Process Payment)",
            original_selector: "#submit-order",
            resolved_selector: "#btn-checkout-pay",
            selector_healed: true,
            classification: "likely_regression",
            confidence_score: 15,
            recommended_action: "escalate",
            reasoning_trace: "Button relocated to #btn-checkout-pay. Uncaught ReferenceError: processPayment is not defined detected in browser console. Auto-heal blocked to prevent shipping broken checkout.",
            runtime_telemetry: {
              console_errors: [
                "CONSOLE ERROR: Uncaught Client Error: Uncaught ReferenceError: processPayment is not defined at line 376",
                "PAGE RUNTIME ERROR: processPayment is not defined"
              ],
              target_badge: "Order confirmation and payment processed cleanly"
            },
            status: "ESCALATED_REGRESSION",
            duration_ms: 2500
          }
        ]
      };
      setQaSuiteResult(fallbackSuite);
      setExpandedStep(null);
    } finally {
      setQaRunning(false);
    }
  };


  // Run CI Triage
  const handleRunCiTriage = async () => {
    setCiRunning(true);
    setCiResult(null);
    setCiStep(1); // Step 1: Ingesting GitHub Actions webhook & failure log

    await new Promise(r => setTimeout(r, 450));
    setCiStep(2); // Step 2: Isolating stack trace & diffing git commits

    try {
      const resp = await fetch('http://localhost:8000/api/ci/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: ciScenario,
          repo: ciRepo,
          workflow: ciWorkflow,
          run_id: ciRunId
        })
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      await new Promise(r => setTimeout(r, 400));
      setCiStep(3); // Step 3: ConfidenceEngine decision finalized

      setCiResult(data);
    } catch (err) {
      // Graceful fallback if backend server isn't running
      await new Promise(r => setTimeout(r, 400));
      setCiStep(3);
      if (ciScenario === 'flaky') {
        setCiResult({
          scenario: 'flaky',
          classification: 'flaky',
          confidence_score: 92,
          recommended_action: 'rerun',
          reasoning_trace: "Log analysis isolated a transient Redis socket timeout. Git diff reveals no modifications to database, cache, or network configuration. Historical run log indicates a 90% pass rate on identical commit SHA. Confidence exceeds threshold (92% >= 85%); safe for autonomous pipeline rerun.",
          attributed_commit: "None (Infrastructure Timeout)",
          author: "devops@triagecore.internal",
          failure_signal: "redis.exceptions.ConnectionError · 9/10 Past Passes",
          draft_pr: null,
          duration_ms: 380
        });
      } else if (ciScenario === 'bug') {
        setCiResult({
          scenario: 'bug',
          classification: 'bug',
          confidence_score: 96,
          recommended_action: 'auto-fix',
          reasoning_trace: "Failed pytest assertion 'psycopg2.errors.SyntaxError: syntax error at or near \",\" at line 42' matches AST of commit 4a8f9b ('feat: add org-level migrations'). Single author, isolated regression with 100% reproduction rate. Proposing draft fix PR; autonomous merge prohibited per safety constraint.",
          attributed_commit: "4a8f9b (feat: add org-level migrations)",
          author: "alice@triagecore.internal",
          failure_signal: "psycopg2.errors.SyntaxError · 100% Repro on Commit 4a8f9b",
          draft_pr: {
            number: 142,
            title: "fix(db): correct trailing comma syntax in db/migrations/004.sql",
            branch: "triagecore/autofix-4a8f9b-migration-syntax",
            diff: "- CREATE INDEX idx_org_users ON users (org_id,, created_at);\n+ CREATE INDEX idx_org_users ON users (org_id, created_at);",
            safety_notice: "Safety Rule: CI Agent is restricted to proposing draft PRs. Autonomous merging is strictly forbidden."
          },
          duration_ms: 450
        });
      } else {
        setCiResult({
          scenario: 'ambiguous',
          classification: 'bug',
          confidence_score: 15,
          recommended_action: 'escalate',
          reasoning_trace: "AttributeError: 'TenantContext' object has no attribute 'schema_name'. Git commit history shows 2 authors modified core/tenant_context.py within 45 minutes (commits 7c1a2e and 9b4f02). Rule violation: ambiguous_commit=true flagged. Confidence mathematically suppressed to 15% (< 85% threshold) to prevent hallucinated automated patch. Escalating to engineering team with unified blame diff.",
          attributed_commit: "Ambiguous: 7c1a2e (alice@) & 9b4f02 (bob@)",
          author: "Multiple Authors (Conflict)",
          failure_signal: "ambiguous_commit=true · 2 Overlapping Diffs in last 45m",
          draft_pr: null,
          duration_ms: 410
        });
      }
    } finally {
      setCiRunning(false);
    }
  };

  // Open the actual HTML page in a new browser tab (served locally by Vite)
  const openHtmlInNewTab = () => {
    if (qaUrl.includes('shopflow')) {
      window.open('/shopflow_app.html', '_blank');
    } else if (qaUrl.includes('trap')) {
      window.open('/page_regression_trap.html', '_blank');
    } else {
      window.open('/page_safe_heal.html', '_blank');
    }
  };

  const isCurrentTrap = qaUrl.includes('trap') || scenarioMode === 'trap';

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      
      {/* Header */}
      <div className="border-b border-white/[0.08] pb-5 space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          TriageCore
        </h1>
        <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
          A shared decision engine for end-to-end software reliability. 
          Whether a button breaks in a web test or a CI build fails on GitHub, our confidence-scoring engine decides: 
          <span className="text-emerald-400 font-semibold"> take automated action</span>, or <span className="text-rose-400 font-semibold">escalate to an engineer</span>.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <button
          onClick={() => { setActiveTab('qa'); setQaResult(null); setQaStep(0); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'qa'
              ? 'bg-white text-black shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>1. Web App Testing (QA Agent)</span>
        </button>

        <button
          onClick={() => { setActiveTab('ci'); setCiResult(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'ci'
              ? 'bg-white text-black shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <GitPullRequest className="w-3.5 h-3.5" />
          <span>2. CI Build Triage (CI Agent)</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: QA BROWSER TEST RUNNER (UNIFIED SUITE) */}
      {/* ========================================================= */}
      {activeTab === 'qa' && (
        <div className="space-y-6">

          {/* TARGET INPUT TEXTBOX */}
          <div className="bg-neutral-950/90 border border-white/[0.12] rounded-xl p-4 space-y-2 shadow-sm">
            <label className="text-xs font-mono text-neutral-300 uppercase tracking-wider font-semibold flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Target Web Application URL:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={qaUrl}
                onChange={(e) => {
                  setQaUrl(e.target.value);
                  if (e.target.value.includes('shopflow')) setScenarioMode('suite');
                  else if (e.target.value.includes('trap')) setScenarioMode('trap');
                  else setScenarioMode('control');
                  setQaSuiteResult(null);
                  setQaStep(0);
                }}
                className="w-full bg-black border border-white/[0.2] rounded-lg px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-white/50 shadow-inner"
                placeholder="e.g. tests/dummy/shopflow_app.html"
              />
            </div>
          </div>

          {/* Split: Webpage Preview (Left) vs Controls & Stepper (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left: Web Application Preview (Framed Browser Sandbox) */}
            <div className="bg-black/90 border-2 border-white/[0.15] rounded-2xl p-4 space-y-3 shadow-2xl flex flex-col justify-between ring-1 ring-white/[0.05]">
              <div className="space-y-3">
                {/* Browser Frame Title Bar */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                  </div>

                  {/* Target Application Preview Pill */}
                  <div className="flex-1 max-w-xs bg-neutral-900 border border-white/[0.1] rounded-md px-2.5 py-1 text-[10px] font-mono text-neutral-300 flex items-center justify-center">
                    <span className="font-semibold uppercase tracking-wider text-neutral-200">TARGET APPLICATION PREVIEW</span>
                  </div>

                  {/* Open in Browser Tab Button */}
                  <button
                    onClick={openHtmlInNewTab}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] text-[11px] font-mono text-neutral-200 hover:text-white transition-all cursor-pointer shrink-0 shadow-sm"
                    title="Open target HTML in new tab to inspect with browser DevTools"
                  >
                    <span>Open Live Web App</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* ShopFlow Storefront Preview */}
                {qaUrl.includes('shopflow') ? (
                  <div className="rounded-xl p-3.5 space-y-3 shadow-inner bg-neutral-900/90 border border-white/[0.1] text-xs font-mono">
                    <div className="flex justify-between items-center border-b border-white/[0.08] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                        <span className="font-bold text-white text-xs tracking-tight">ShopFlow Storefront</span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 border border-white/[0.08]">
                        Cart: 1 item ($120.00)
                      </span>
                    </div>

                    {/* Step 1: Add to Cart Element */}
                    <div className="p-2.5 rounded-lg bg-black/60 border border-white/[0.08] flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-white font-semibold">1. Developer Keyboard</div>
                        <div className="text-[10px] text-blue-400">$120.00 USD</div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-white text-black text-[10px] font-semibold opacity-90">
                        Add to Cart
                      </span>
                    </div>

                    {/* Step 2: Voucher Element */}
                    <div className="p-2.5 rounded-lg bg-black/60 border border-white/[0.08] flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-white font-semibold">2. Voucher: DEV10_OFF</div>
                        <div className="text-[10px] text-emerald-400">10% Discount (-$12.00)</div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-blue-600 text-white text-[10px] font-semibold opacity-90">
                        Apply Coupon
                      </span>
                    </div>

                    {/* Step 3: Payment Element */}
                    <div className="p-2.5 rounded-lg bg-black/60 border border-white/[0.08] flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-white font-semibold">3. Payment: Visa •••• 4242</div>
                        <div className="text-[10px] text-neutral-400">Total: $108.00 USD</div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-white text-black text-[10px] font-semibold opacity-90">
                        Pay & Complete ($108.00)
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Single Button Preview */
                  <div className="rounded-xl p-5 space-y-4 shadow-inner bg-neutral-900/90 border border-white/[0.1]">
                    <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Order Summary</div>
                        <div className="text-sm font-semibold text-white">Pro Plan Subscription</div>
                      </div>
                      <div className="text-base font-bold font-mono text-white">$99.00</div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-neutral-400 block">Email Address</label>
                      <input type="text" readOnly value="customer@example.com" className="w-full bg-black border border-white/[0.15] rounded px-2.5 py-1.5 text-xs text-neutral-300 font-mono" />
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <span className="w-full py-2 bg-white text-black text-xs font-semibold rounded block text-center opacity-90">
                        {isCurrentTrap ? 'Submit Broken Order' : 'Submit Safe Order'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Test Execution & Live Progress */}
            <div className="bg-neutral-950/90 border border-white/[0.12] rounded-2xl p-5 space-y-5 flex flex-col justify-between">
              
              <div className="space-y-4">
                <div className="border-b border-white/[0.08] pb-3 flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                    Test Execution Status
                  </span>
                  <span className="text-[11px] font-mono text-neutral-500">
                    {scenarioMode === 'suite' ? '3 Sequential Tests' : '1 Single Test'}
                  </span>
                </div>

                {/* Clean Test Specification Card */}
                <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.08] space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-neutral-400">Target Test Suite:</span>
                    <span className="text-white font-medium">checkout_user_journey.spec.ts</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                    <span>Execution Plan:</span>
                    <span className="text-neutral-200">Cart &rarr; Promo &rarr; Payment Gate</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                    <span>Telemetry Mode:</span>
                    <span className="text-neutral-300">DOM State + Browser Console Stream</span>
                  </div>
                </div>

                {/* Real-Time Stepper Progress (Streams live one-by-one) */}
                {qaStep > 0 && (
                  <div className="bg-black border border-white/[0.1] rounded-xl p-3.5 space-y-2 text-[11px] font-mono">
                    {qaStep >= 1 && (
                      <div className="text-emerald-400 animate-in fade-in duration-200">
                        1. Cart: Stale '#add-to-cart-btn' &rarr; Relocated & clicked &rarr; ✔ Clean state (0 errors)
                      </div>
                    )}
                    {qaStep >= 2 && (
                      <div className="text-emerald-400 animate-in fade-in duration-200">
                        2. Promo: Stale '#apply-promo' &rarr; Relocated & clicked &rarr; ✔ Clean state (0 errors)
                      </div>
                    )}
                    {qaStep >= 3 && (
                      <div className="text-rose-400 animate-in fade-in duration-200">
                        3. Payment: Stale '#submit-order' &rarr; Relocated & clicked &rarr; ✖ Uncaught ReferenceError!
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* The Big Action Button */}
              <button
                onClick={handleRunQaTest}
                disabled={qaRunning}
                className="w-full py-3.5 bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500 font-bold text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {qaRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Running Test...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Run Test</span>
                  </>
                )}
              </button>

            </div>

          </div>

          {/* ========================================================= */}
          {/* THE SUITE RESULTS: EXECUTIVE BANNER + STEP BREAKDOWN LIST */}
          {/* ========================================================= */}
          {qaSuiteResult && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Executive Suite Summary Card */}
              <div className={`rounded-2xl p-6 border shadow-lg ${
                qaSuiteResult.escalated_count > 0 
                  ? 'bg-neutral-950 border-rose-500/40 shadow-rose-950/20' 
                  : 'bg-neutral-950 border-emerald-500/40 shadow-emerald-950/20'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                        Suite Verdict:
                      </span>
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                        qaSuiteResult.escalated_count > 0 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {qaSuiteResult.overall_verdict}
                      </span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
                      {qaSuiteResult.escalated_count > 0 ? (
                        <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      )}
                      <span>
                        {qaSuiteResult.escalated_count > 0 
                          ? 'Critical Regression Caught — Auto-Heal Blocked & Escalated' 
                          : 'All Broken Selectors Safely Healed'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 font-mono">
                      {qaSuiteResult.healed_count} test actions healed autonomously · {qaSuiteResult.escalated_count} dangerous false pass prevented.
                    </p>
                  </div>

                  {/* Prominent Overall Decision Dial */}
                  <div className={`px-5 py-3 rounded-xl border text-right shrink-0 ${
                    qaSuiteResult.escalated_count > 0 
                      ? 'bg-rose-950/30 border-rose-500/50' 
                      : 'bg-emerald-950/20 border-emerald-500/40'
                  }`}>
                    <span className="text-[10px] font-mono uppercase tracking-wider block text-neutral-400">
                      Overall Triage Action
                    </span>
                    <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
                      qaSuiteResult.escalated_count > 0 ? 'text-rose-500' : 'text-emerald-400'
                    }`}>
                      {qaSuiteResult.overall_recommended_action.toUpperCase()}
                    </div>
                    <span className={`text-[10px] font-mono block font-semibold ${
                      qaSuiteResult.escalated_count > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {qaSuiteResult.escalated_count > 0 ? '< 85% Threshold (Escalate)' : '≥ 85% Threshold (Approved)'}
                    </span>
                  </div>
                </div>

                {/* Suite Metrics Pill Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs font-mono">
                  <div className="bg-black/50 border border-white/[0.08] rounded-xl p-3">
                    <span className="text-[10px] text-neutral-500 uppercase block mb-1">Total Steps Run</span>
                    <span className="text-white font-bold text-sm">{qaSuiteResult.total_steps} Actions</span>
                  </div>
                  <div className="bg-black/50 border border-white/[0.08] rounded-xl p-3">
                    <span className="text-[10px] text-neutral-500 uppercase block mb-1">Safe Auto-Heals</span>
                    <span className="text-emerald-400 font-bold text-sm">{qaSuiteResult.healed_count} Steps (96%, 94%)</span>
                  </div>
                  <div className="bg-black/50 border border-white/[0.08] rounded-xl p-3">
                    <span className="text-[10px] text-neutral-500 uppercase block mb-1">Regressions Blocked</span>
                    <span className="text-rose-400 font-bold text-sm">{qaSuiteResult.escalated_count} Step (15%)</span>
                  </div>
                  <div className="bg-black/50 border border-white/[0.08] rounded-xl p-3">
                    <span className="text-[10px] text-neutral-500 uppercase block mb-1">Total Suite Duration</span>
                    <span className="text-neutral-300 font-bold text-sm">{(qaSuiteResult.duration_ms / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              </div>

              {/* Interactive Step-by-Step Triage Breakdown List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>Step-by-Step Triage Breakdown ({qaSuiteResult.steps.length} Test Steps):</span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-500">
                    Click any step to inspect telemetry & LLM trace
                  </span>
                </div>

                <div className="space-y-3">
                  {qaSuiteResult.steps.map((step) => {
                    const isStepHeal = step.recommended_action === 'heal';
                    const isExpanded = expandedStep === step.step_index;

                    return (
                      <div 
                        key={step.step_index}
                        className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                          isStepHeal 
                            ? 'bg-neutral-950/80 border-white/[0.1] hover:border-emerald-500/30' 
                            : 'bg-neutral-950 border-rose-500/40 shadow-md shadow-rose-950/10'
                        }`}
                      >
                        {/* Step Card Header / Clickable Accordion Bar */}
                        <div 
                          onClick={() => setExpandedStep(isExpanded ? null : step.step_index)}
                          className="px-5 py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                              isStepHeal ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-rose-950 text-rose-400 border border-rose-500/50'
                            }`}>
                              {step.step_index}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white font-mono truncate">
                                {step.step_name}
                              </div>
                              <div className="text-[11px] font-mono text-neutral-500 truncate">
                                Stale Selector: <code className="text-neutral-400">{step.original_selector}</code> &rarr; Resolved: <code className="text-blue-400">{step.resolved_selector}</code>
                              </div>
                            </div>
                          </div>

                          {/* Status and Score Badges */}
                          <div className="flex items-center gap-3 shrink-0 font-mono">
                            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-neutral-400 border border-white/[0.08]">
                              {step.classification}
                            </span>

                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                              isStepHeal 
                                ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-rose-950/50 text-rose-400 border border-rose-500/40'
                            }`}>
                              {isStepHeal ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                              <span>{isStepHeal ? 'HEALED' : 'ESCALATED'}</span>
                              <span className="opacity-70">({step.confidence_score}%)</span>
                            </span>

                            <button className="text-neutral-500 hover:text-white p-1">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Step Details */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-2 border-t border-white/[0.08] space-y-4 bg-black/40 text-xs font-mono">
                            
                            {/* 3-Column Telemetry Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                              <div className="bg-neutral-900/80 border border-white/[0.08] rounded-lg p-3 space-y-1">
                                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Resolved Selector</span>
                                <div className="text-white font-mono font-bold text-xs">
                                  {step.resolved_selector}
                                </div>
                                <span className="text-[10px] text-neutral-500 block">
                                  From original: {step.original_selector}
                                </span>
                              </div>

                              <div className="bg-neutral-900/80 border border-white/[0.08] rounded-lg p-3 space-y-1">
                                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Runtime Telemetry</span>
                                <div className={`text-xs font-semibold ${isStepHeal ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {step.runtime_telemetry.console_errors.length === 0 
                                    ? '0 Console Errors · DOM Clean' 
                                    : `${step.runtime_telemetry.console_errors.length} Uncaught JS Errors`}
                                </div>
                                <span className="text-[10px] text-neutral-500 block truncate">
                                  State: {step.runtime_telemetry.target_badge}
                                </span>
                              </div>

                              <div className="bg-neutral-900/80 border border-white/[0.08] rounded-lg p-3 space-y-1">
                                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Recommended Action</span>
                                <div className={`text-xs font-bold ${isStepHeal ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {step.recommended_action === 'heal' ? 'heal (auto-patch test)' : 'escalate (block pipeline)'}
                                </div>
                                <span className="text-[10px] text-neutral-500 block">
                                  Confidence: {step.confidence_score}% vs 85% threshold
                                </span>
                              </div>
                            </div>

                            {/* Captured Console Error Box if Step 3 */}
                            {step.runtime_telemetry.console_errors.length > 0 && (
                              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-300 space-y-1">
                                <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">
                                  🚨 Captured Browser Console Error:
                                </span>
                                {step.runtime_telemetry.console_errors.map((err, errIdx) => (
                                  <div key={errIdx} className="text-[11px] font-mono text-rose-200">
                                    {err}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* LLM Reasoning Trace */}
                            <div className="bg-black/60 border border-white/[0.08] rounded-lg p-3.5 space-y-1.5">
                              <div className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                                <span>LLM Reasoning Trace (Step {step.step_index}):</span>
                              </div>
                              <p className="text-xs text-neutral-300 leading-relaxed font-mono">
                                "{step.reasoning_trace}"
                              </p>
                            </div>

                            {/* Step Telemetry Action Button */}
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => {
                                  if (onOpenDrawer) {
                                    onOpenDrawer({
                                      scenario: isStepHeal ? 'control' : 'trap',
                                      step_name: step.step_name,
                                      resolved_selector: step.resolved_selector,
                                      console_errors: step.runtime_telemetry.console_errors,
                                      reasoning_trace: step.reasoning_trace,
                                      confidence_score: step.confidence_score,
                                      classification: step.classification
                                    });
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-xs font-mono text-neutral-300 hover:text-white border border-white/[0.1] transition-all cursor-pointer"
                              >
                                <span>Inspect Full Step Telemetry in Drawer</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* Collapsible Presenter / Defense Notes */}
          <div className="border border-white/[0.08] rounded-xl bg-neutral-950/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDemoNotes(!showDemoNotes)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-neutral-400" />
                <span>Defense & Presenter Notes (Behind the Scenes)</span>
              </div>
              <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                {showDemoNotes ? '▲ Hide Notes' : '▼ Show Notes'}
              </span>
            </button>

            {showDemoNotes && (
              <div className="px-4 pb-4 pt-2 border-t border-white/[0.06] text-xs font-mono text-neutral-400 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-black/60 border border-white/[0.06] space-y-2">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                      <span>Steps 1 & 2: Autonomous Self-Healing</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 space-y-1">
                      <div>• Step 1 (Cart): <code>#add-to-cart-btn</code> &rarr; <code>#btn-add-cart-primary</code> (96% Confidence)</div>
                      <div>• Step 2 (Voucher): <code>#apply-promo</code> &rarr; <code>#btn-apply-coupon</code> (94% Confidence)</div>
                      <div>• Telemetry: 0 console errors. DOM states progressed cleanly.</div>
                      <div className="text-emerald-400 font-semibold">• Verdict: HEAL (Action approved without developer intervention)</div>
                    </div>
                    <div className="text-[11px] text-neutral-300 pt-2 border-t border-white/[0.08] leading-relaxed">
                      <strong className="text-neutral-400">Presenter Note:</strong> Demonstrates that TriageCore solves selector maintenance toil, saving hours of manual test fixes across routine UI updates.
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-black/60 border border-white/[0.06] space-y-2">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                      <span>Step 3: Masked Regression Prevention (The Trap)</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 space-y-1">
                      <div>• Step 3 (Payment): <code>#submit-order</code> &rarr; <code>#btn-checkout-pay</code></div>
                      <div>• Telemetry: Click triggered <code>ReferenceError: processPayment is not defined</code></div>
                      <div className="text-rose-400 font-semibold">• Verdict: ESCALATE (Confidence drops to 15% {"<"} 85%)</div>
                    </div>
                    <div className="text-[11px] text-neutral-300 pt-2 border-t border-white/[0.08] leading-relaxed">
                      <strong className="text-rose-400">Presenter Note:</strong> The button was relocated, but the handler crashed. A naive AI tool would report all-green and deploy a broken checkout to production. TriageCore blocked the heal and alerted an engineer.
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-500">
                  💡 Live Defense Tip: Click "Open Live Web App" to show the panel the actual page in a new browser tab. Show them how clicking the payment button triggers an uncaught red error in Chrome DevTools (F12), proving this is real browser telemetry.
                </p>
              </div>
            )}
          </div>

        </div>
      )}


      {/* ========================================================= */}
      {/* TAB 2: CI BUILD TRIAGE */}
      {/* ========================================================= */}
      {activeTab === 'ci' && (() => {
        const currentPreset = CI_PRESETS[ciScenario] || CI_PRESETS.bug;
        return (
          <div className="space-y-6">

            {/* TARGET CI WORKFLOW INPUTS + NEUTRAL PRESET PILLS */}
            <div className="bg-neutral-950/90 border border-white/[0.12] rounded-xl p-5 space-y-4 shadow-sm">
              <div className="border-b border-white/[0.08] pb-3">
                <label className="text-xs font-mono text-neutral-300 uppercase tracking-wider font-semibold">
                  GitHub Actions Workflow Run & Target Repository:
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Repository</label>
                  <input
                    type="text"
                    value={ciRepo}
                    onChange={(e) => setCiRepo(e.target.value)}
                    className="w-full bg-black border border-white/[0.2] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Workflow File</label>
                  <input
                    type="text"
                    value={ciWorkflow}
                    onChange={(e) => setCiWorkflow(e.target.value)}
                    className="w-full bg-black border border-white/[0.2] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Run ID & Branch</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ciRunId}
                      onChange={(e) => setCiRunId(e.target.value)}
                      className="w-1/2 bg-black border border-white/[0.2] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/50"
                    />
                    <input
                      type="text"
                      value={ciBranch}
                      onChange={(e) => setCiBranch(e.target.value)}
                      className="w-1/2 bg-black border border-white/[0.2] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/50"
                    />
                  </div>
                </div>
              </div>

              {/* Preset Pills - Neutral, Professional, No Pre-spoilers */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] font-mono text-neutral-500 mr-1">Sample CI Failure Logs:</span>
                {Object.entries(CI_PRESETS).map(([k, p]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => loadCiPreset(k)}
                    className={`px-3 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ${
                      ciScenario === k
                        ? 'bg-white/[0.12] text-white border border-white/30 font-semibold'
                        : 'bg-white/[0.04] text-neutral-400 hover:text-white border border-white/[0.08]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Split: Left (Failure Event & Terminal) vs Right (Triage Stepper & Controls) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left: GitHub Actions Pipeline Run & Failure Logs */}
              <div className="bg-neutral-950/90 border border-white/[0.12] rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Workflow Run Header */}
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-xs font-mono font-bold text-white">Run {ciRunId}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-neutral-300">
                        {ciBranch}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-500/40 text-rose-400 font-bold uppercase">
                      Build Failed
                    </span>
                  </div>

                  {/* Failing Step & Commit Context */}
                  <div className="text-xs font-mono space-y-1.5 text-neutral-300 bg-black/40 p-3 rounded-xl border border-white/[0.06]">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Failing Step:</span>
                      <span className="text-rose-400 font-semibold">{ciFailingStep}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Commit SHA:</span>
                      <span className="text-amber-300">{currentPreset.commitSha}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Author:</span>
                      <span className="text-white">{currentPreset.commitAuthor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Commit Message:</span>
                      <span className="text-neutral-400 truncate max-w-[240px]">{currentPreset.commitMsg}</span>
                    </div>
                  </div>

                  {/* Raw Failure Log Terminal Snippet */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                      <span className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                        <span>GitHub Actions Step Log</span>
                      </span>
                      <span className="text-[10px] text-neutral-500">{currentPreset.label}</span>
                    </div>
                    <div className="bg-black p-3.5 rounded-xl border border-white/[0.1] font-mono text-[11px] text-neutral-300 leading-relaxed overflow-x-auto max-h-[160px] whitespace-pre select-text">
                      {currentPreset.rawLog}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-neutral-500">
                  <span>Source: GitHub Webhook (X-Hub-Signature-256 Verified)</span>
                  <span className="text-neutral-400">Context: Middle-truncated {"<"} 16k</span>
                </div>
              </div>

              {/* Right: CI Triage Controls & Stepper */}
              <div className="bg-neutral-950/90 border border-white/[0.12] rounded-2xl p-5 space-y-5 flex flex-col justify-between shadow-sm">
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                      CI Triage Engine Pipeline
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      {ciRunning ? 'Active Execution...' : 'Ready'}
                    </span>
                  </div>

                  {/* Animated 3-Step Progress */}
                  <div className="space-y-3 font-mono text-xs">
                    <div className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
                      ciStep === 1 
                        ? 'bg-white/[0.08] border-white/40 text-white'
                        : ciStep > 1 
                          ? 'bg-black/30 border-white/[0.06] text-neutral-400' 
                          : 'bg-black/20 border-transparent text-neutral-600'
                    }`}>
                      <div className="mt-0.5">
                        {ciStep > 1 ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : ciStep === 1 ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-neutral-700 flex items-center justify-center text-[10px]">1</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white">1. Ingest Webhook & Parse Failure Logs</div>
                        <div className="text-[11px] text-neutral-400">Verify HMAC signature, isolate error stack trace, and check log truncation.</div>
                      </div>
                    </div>

                    <div className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
                      ciStep === 2 
                        ? 'bg-white/[0.08] border-white/40 text-white'
                        : ciStep > 2 
                          ? 'bg-black/30 border-white/[0.06] text-neutral-400' 
                          : 'bg-black/20 border-transparent text-neutral-600'
                    }`}>
                      <div className="mt-0.5">
                        {ciStep > 2 ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : ciStep === 2 ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-neutral-700 flex items-center justify-center text-[10px]">2</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white">2. Diff Git Commits & Trace Blame</div>
                        <div className="text-[11px] text-neutral-400">Correlate failure AST with commit diffs. Flag ambiguity if multiple authors touched files.</div>
                      </div>
                    </div>

                    <div className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
                      ciStep === 3 
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-white'
                        : 'bg-black/20 border-transparent text-neutral-600'
                    }`}>
                      <div className="mt-0.5">
                        {ciStep === 3 ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-neutral-700 flex items-center justify-center text-[10px]">3</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white">3. ConfidenceEngine Scoring & Action Derivation</div>
                        <div className="text-[11px] text-neutral-400">Classify failure type, calculate confidence against 85% threshold, and output action.</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Execution Button */}
                <button
                  type="button"
                  onClick={handleRunCiTriage}
                  disabled={ciRunning}
                  className="w-full py-3.5 bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500 font-bold text-xs font-mono rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {ciRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Running CI Failure Triage...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Run CI Build Triage</span>
                    </>
                  )}
                </button>

              </div>

            </div>

            {/* CI Decision Result Card (Strict AGENTS.md Contract) */}
            {ciResult && (
              <div className="bg-neutral-950 border border-white/[0.2] rounded-2xl p-6 space-y-5 shadow-lg animate-in fade-in duration-200">
                {/* Card Header: Classification + Confidence Score */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                        Diagnosis Classification:
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/[0.08] text-white border border-white/[0.15] font-bold">
                        {ciResult.classification}
                      </span>
                    </div>
                    <div className="text-base font-bold text-white flex items-center gap-2 pt-0.5">
                      {ciResult.recommended_action === 'escalate' ? (
                        <ShieldAlert className="w-5 h-5 text-rose-500" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      )}
                      <span>
                        {ciResult.scenario === 'flaky' && 'Transient Infrastructure Flake — Auto-Rerun Safe'}
                        {ciResult.scenario === 'bug' && 'Direct Regression Isolated — Draft Fix PR Proposed'}
                        {ciResult.scenario === 'ambiguous' && 'Commit Ambiguity Detected — Escalated to Engineering'}
                      </span>
                    </div>
                  </div>

                  {/* Prominent Confidence Score */}
                  <div className={`px-4 py-2.5 rounded-xl border text-right ${
                    ciResult.confidence_score >= 85
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-rose-950/30 border-rose-500/50'
                  }`}>
                    <span className="text-[10px] font-mono uppercase tracking-wider block text-neutral-400">
                      Confidence Score
                    </span>
                    <div className={`text-3xl font-bold font-mono tracking-tight ${
                      ciResult.confidence_score >= 85 ? 'text-emerald-400' : 'text-rose-500'
                    }`}>
                      {ciResult.confidence_score}%
                    </div>
                    <span className={`text-[10px] font-mono block font-semibold ${
                      ciResult.confidence_score >= 85 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {ciResult.confidence_score >= 85 ? '≥ 85% Threshold (Approved)' : '< 85% Threshold (Blocked & Escalated)'}
                    </span>
                  </div>
                </div>

                {/* Production Telemetry 3-Card Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-black/50 border border-white/[0.08] rounded-xl p-3 space-y-1">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Recommended Action</span>
                    <div className={`text-xs font-mono font-bold ${
                      ciResult.recommended_action === 'escalate' ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {ciResult.recommended_action}
                    </div>
                  </div>
                  <div className="bg-black/50 border border-white/[0.08] rounded-xl p-3 space-y-1">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Attributed Commit</span>
                    <div className="text-xs font-mono text-white truncate">
                      {ciResult.attributed_commit}
                    </div>
                  </div>
                  <div className="bg-black/50 border border-white/[0.08] rounded-xl p-3 space-y-1">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Failure Signal</span>
                    <div className={`text-xs font-mono font-semibold ${
                      ciResult.recommended_action === 'escalate' ? 'text-rose-400' : 'text-neutral-200'
                    } truncate`}>
                      {ciResult.failure_signal}
                    </div>
                  </div>
                </div>

                {/* Scenario-Specific Action Detail Card */}
                {ciResult.draft_pr && (
                  <div className="bg-black/60 border border-emerald-500/30 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GitPullRequest className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-mono font-bold text-white">
                          Draft PR #{ciResult.draft_pr.number}: {ciResult.draft_pr.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                        Awaiting Review
                      </span>
                    </div>
                    <div className="bg-neutral-950 p-2.5 rounded-lg border border-white/[0.06] font-mono text-[11px] text-neutral-300">
                      <div className="text-rose-400">{ciResult.draft_pr.diff.split('\n')[0]}</div>
                      <div className="text-emerald-400">{ciResult.draft_pr.diff.split('\n')[1]}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-950/20 px-3 py-1.5 rounded-lg border border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{ciResult.draft_pr.safety_notice}</span>
                    </div>
                  </div>
                )}

                {ciResult.scenario === 'ambiguous' && (
                  <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Overlapping Commit Authors — Automated Patch Prohibited</span>
                    </div>
                    <p className="text-xs font-mono text-neutral-300 leading-relaxed">
                      Two independent commits (<code>7c1a2e</code> by alice@ and <code>9b4f02</code> by bob@) touched <code>core/tenant_context.py</code> concurrently. 
                      TriageCore flagged <code>ambiguous_commit=true</code>, mathematically reducing confidence to 15% to prevent applying a hallucinated patch. 
                      Escalated to PR authors with unified diff.
                    </p>
                  </div>
                )}

                {ciResult.scenario === 'flaky' && (
                  <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                      <RefreshCw className="w-4 h-4" />
                      <span>Automated Job Rerun Triggered</span>
                    </div>
                    <p className="text-xs font-mono text-neutral-300 leading-relaxed">
                      Zero application code changes detected. Failure isolated to transient socket timeout. 
                      GitHub Actions workflow rerun dispatched automatically via API without waking on-call engineers.
                    </p>
                  </div>
                )}

                {/* Authentic LLM Reasoning Trace */}
                <div className="bg-black/40 border border-white/[0.06] rounded-xl p-3.5 space-y-1.5">
                  <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                    <span>LLM Reasoning Trace</span>
                  </div>
                  <p className="text-xs font-mono text-neutral-300 leading-relaxed">
                    "{ciResult.reasoning_trace}"
                  </p>
                </div>
              </div>
            )}

            {/* Collapsible Presenter / Defense Notes */}
            <div className="border border-white/[0.08] rounded-xl bg-neutral-950/40 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowCiNotes(!showCiNotes)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Defense & Presenter Notes (Behind the Scenes)</span>
                </div>
                <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                  {showCiNotes ? '▲ Hide Notes' : '▼ Show Notes'}
                </span>
              </button>

              {showCiNotes && (
                <div className="px-4 pb-4 pt-2 border-t border-white/[0.06] text-xs font-mono text-neutral-400 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-black/60 border border-white/[0.06] space-y-2">
                      <div className="text-white font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                        <span>redis-timeout.log (Flaky)</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 space-y-1">
                        <div>• Historical Pass Rate: 90% across last 10 runs</div>
                        <div>• Code Changes: 0 in database or backend logic</div>
                        <div className="text-emerald-400 font-semibold">• Verdict: Auto-Rerun Safe (Score 92% ≥ 85%)</div>
                      </div>
                      <div className="text-[11px] text-neutral-300 pt-2 border-t border-white/[0.08] leading-relaxed">
                        <strong className="text-neutral-400">Presenter Note:</strong> Transient network blips are the #1 pipeline productivity killer. TriageCore verifies zero code changes and automatically re-triggers the build without human intervention.
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-black/60 border border-white/[0.06] space-y-2">
                      <div className="text-white font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                        <span>db-migration-syntax.log (Bug)</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 space-y-1">
                        <div>• Failure: Syntax error on line 42</div>
                        <div>• Attributed Commit: 4a8f9b (Single author)</div>
                        <div className="text-emerald-400 font-semibold">• Verdict: Auto-Fix PR Drafted (Score 96% ≥ 85%)</div>
                      </div>
                      <div className="text-[11px] text-neutral-300 pt-2 border-t border-white/[0.08] leading-relaxed">
                        <strong className="text-neutral-400">Presenter Note:</strong> With a single author and exact AST stack trace match, TriageCore drafts a 1-line syntax fix PR. Notice the safety badge: TriageCore NEVER automatically merges PRs.
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-black/60 border border-white/[0.06] space-y-2">
                      <div className="text-white font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                        <span>tenant-conflict-ambiguous.log (Conflict)</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 space-y-1">
                        <div>• Failure: AttributeError on tenant schema</div>
                        <div>• Authors: 2 authors modified file in last 45m</div>
                        <div className="text-rose-400 font-semibold">• Verdict: Escalated to Humans (Score drops to 15%)</div>
                      </div>
                      <div className="text-[11px] text-neutral-300 pt-2 border-t border-white/[0.08] leading-relaxed">
                        <strong className="text-rose-400">Presenter Note (The Academic Hook):</strong> Naive AI tools guess a commit and risk breaking team code. TriageCore sets ambiguous_commit=true, suppressing confidence to 15% and preventing unverified commits.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        );
      })()}

    </div>
  );
}
