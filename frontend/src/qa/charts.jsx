import React, { useState } from 'react';
import { CAUSE, CAUSE_ORDER, GROUP, POLICY, POLICY_ORDER, STATE_LABEL, TOWARD_BUG, TOWARD_RENAME, pct } from './theme';

// ---- shared hover tooltip --------------------------------------------------
function useTooltip() {
  // The chart's container element, captured with a callback ref (state, not useRef).
  const [el, setEl] = useState(null);
  const [tip, setTip] = useState(null);
  const show = (e, content) => {
    if (!el) return;
    const box = el.getBoundingClientRect();
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, width: box.width, content });
  };
  const hide = () => setTip(null);
  const layer = tip && (
    <div
      className="pointer-events-none absolute z-20 max-w-[260px] rounded-md border border-white/10 bg-[#141418] px-2.5 py-1.5 text-[11px] leading-snug text-neutral-200 shadow-xl"
      style={{ left: Math.max(0, Math.min(tip.x + 12, tip.width - 200)), top: tip.y + 12 }}
    >
      {tip.content}
    </div>
  );
  return { container: setEl, show, hide, layer };
}

const Swatch = ({ color }) => <span className="inline-block h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: color }} />;

// ---- Diagnosis: probability of each cause ---------------------------------
export function CauseBars({ posterior }) {
  const { container, show, hide, layer } = useTooltip();
  return (
    <div ref={container} className="relative space-y-2">
      {CAUSE_ORDER.map((c) => {
        const p = posterior[c] ?? 0;
        return (
          <div
            key={c}
            className="grid grid-cols-[112px_1fr_48px] items-center gap-3 py-0.5"
            onMouseMove={(e) => show(e, <><b>{CAUSE[c].label}</b>: {pct(p)} probability after seeing the clues</>)}
            onMouseLeave={hide}
          >
            <span className="flex items-center gap-2 text-xs text-neutral-300"><Swatch color={CAUSE[c].color} />{CAUSE[c].label}</span>
            <div className="h-3 rounded-r-[4px] bg-white/[0.04]">
              <div className="h-3 rounded-r-[4px]" style={{ width: `${Math.max(p * 100, 0.6)}%`, background: CAUSE[c].color }} />
            </div>
            <span className="text-right font-mono text-xs tabular-nums text-neutral-200">{pct(p)}</span>
          </div>
        );
      })}
      {layer}
    </div>
  );
}

// ---- Evidence: how far each clue pushed toward "rename" vs "real bug" ------
export function EvidenceBars({ details, priors }) {
  const { container, show, hide, layer } = useTooltip();
  const rows = [];
  if (priors) {
    rows.push({ key: 'prior', label: 'Starting guess', state: 'before any clue', v: Math.log(priors.stale_selector / priors.likely_regression) });
  }
  for (const [g, lls] of Object.entries(details.contributions || {})) {
    rows.push({ key: g, label: GROUP[g]?.label || g, state: STATE_LABEL[details.group_states[g]] || details.group_states[g], v: lls.stale_selector - lls.likely_regression, help: GROUP[g]?.help });
  }
  const max = Math.max(2, ...rows.map((r) => Math.abs(r.v)));
  return (
    <div ref={container} className="relative">
      <div className="mb-2 grid grid-cols-[140px_1fr] gap-3 text-[10px] uppercase tracking-wider text-neutral-500">
        <span />
        <div className="flex justify-between whitespace-nowrap"><span>← real bug</span><span>harmless rename →</span></div>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const w = (Math.abs(r.v) / max) * 50;
          const right = r.v >= 0;
          const factor = Math.exp(Math.abs(r.v));
          return (
            <div
              key={r.key}
              className="grid grid-cols-[140px_1fr] items-center gap-3"
              onMouseMove={(e) => show(e, <>
                <b>{r.label}</b>: {r.state}<br />
                {factor < 1.05 ? 'Barely changes the odds.' : `Makes "${right ? 'harmless rename' : 'real bug'}" ${factor.toFixed(1)}× more likely than the other.`}
                {r.help && <><br /><span className="text-neutral-500">{r.help}</span></>}
              </>)}
              onMouseLeave={hide}
            >
              <div className="min-w-0">
                <div className="truncate text-xs text-neutral-300">{r.label}</div>
                <div className="text-[10px] text-neutral-500">{r.state}</div>
              </div>
              <div className="relative h-3">
                <div className="absolute left-1/2 top-[-3px] h-[18px] w-px bg-white/15" />
                <div
                  className={`absolute top-0 h-3 ${right ? 'rounded-r-[4px]' : 'rounded-l-[4px]'}`}
                  style={{ [right ? 'left' : 'right']: '50%', width: `${Math.max(w, 0.4)}%`, background: right ? TOWARD_RENAME : TOWARD_BUG }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {layer}
    </div>
  );
}

// ---- Decision: expected cost of each action (lower is better) --------------
export function LossBars({ details, chosen }) {
  const { container, show, hide, layer } = useTooltip();
  const entries = Object.entries(details.expected_loss || {});
  const max = Math.max(0.5, ...entries.map(([, v]) => v));
  const names = { heal: 'Auto-heal', flag: 'Flag as flaky', escalate: 'Escalate to human' };
  return (
    <div ref={container} className="relative space-y-2">
      {entries.map(([a, v]) => (
        <div
          key={a}
          className="grid grid-cols-[112px_1fr_56px] items-center gap-3"
          onMouseMove={(e) => show(e, <><b>{names[a]}</b>: expected cost {v.toFixed(2)}<br /><span className="text-neutral-500">probability of each cause × what this action costs if that cause is true</span></>)}
          onMouseLeave={hide}
        >
          <span className={`text-xs ${a === chosen ? 'font-semibold text-white' : 'text-neutral-400'}`}>{names[a]}{a === chosen ? ' ✓' : ''}</span>
          <div className="h-3 rounded-r-[4px] bg-white/[0.04]">
            <div className="h-3 rounded-r-[4px]" style={{ width: `${Math.max((v / max) * 100, 0.6)}%`, background: a === chosen ? '#e4e4e7' : '#52525b' }} />
          </div>
          <span className="text-right font-mono text-xs tabular-nums text-neutral-300">{v.toFixed(2)}</span>
        </div>
      ))}
      {Object.entries(details.blocked || {}).map(([a, why]) => (
        <div key={a} className="grid grid-cols-[112px_1fr] gap-3 text-xs">
          <span className="text-neutral-500 line-through">{names[a]}</span>
          <span className="text-neutral-500">not possible: {why}</span>
        </div>
      ))}
      {layer}
    </div>
  );
}

// ---- Evaluation: one count per policy -------------------------------------
export function PolicyBars({ summary, metric, total }) {
  const { container, show, hide, layer } = useTooltip();
  const max = Math.max(1, ...POLICY_ORDER.map((p) => total(summary[p])));
  return (
    <div ref={container} className="relative space-y-3">
      {POLICY_ORDER.map((p) => {
        const s = summary[p];
        const v = metric(s);
        return (
          <div key={p} className="grid grid-cols-[150px_1fr_52px] items-center gap-3"
            onMouseMove={(e) => show(e, <><b>{POLICY[p].label}</b>: {v} of {total(s)}</>)} onMouseLeave={hide}>
            <span className="flex items-center gap-2 text-xs text-neutral-300"><Swatch color={POLICY[p].color} />{POLICY[p].label}</span>
            <div className="h-4 rounded-r-[4px] bg-white/[0.04]">
              <div className="h-4 rounded-r-[4px]" style={{ width: `${Math.max((v / max) * 100, v ? 1 : 0.6)}%`, background: POLICY[p].color }} />
            </div>
            <span className="text-right font-mono text-xs tabular-nums text-neutral-200">{v}/{total(s)}</span>
          </div>
        );
      })}
      {layer}
    </div>
  );
}

// ---- Evaluation: every step on a "how sure was it a rename?" axis, per risk tier ----
export function DecisionMap({ rows, thresholds }) {
  const { container, show, hide, layer } = useTooltip();
  const tiers = ['low', 'medium', 'high'].filter((tier) => rows.some((r) => r.risk_tier === tier));
  const actionMark = { heal: '●', flag: '◆', escalate: '▲' };
  return (
    <div ref={container} className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-neutral-400">
        {CAUSE_ORDER.map((c) => <span key={c} className="flex items-center gap-1.5"><Swatch color={CAUSE[c].color} />True cause: {CAUSE[c].label}</span>)}
        <span className="text-neutral-500">| marker = TriageCore action: ● heal ◆ flag ▲ escalate</span>
      </div>
      <div className="space-y-5">
        {tiers.map((tier) => {
          const tau = thresholds?.[tier]?.heal;
          return (
            <div key={tier} className="grid grid-cols-[90px_1fr] items-center gap-3">
              <span className="text-xs capitalize text-neutral-300">{tier} risk</span>
              <div className="relative h-9 border-b border-white/15">
                {tau != null && (
                  <div className="absolute bottom-0 top-[-6px] w-px bg-white/40" style={{ left: `${tau * 100}%` }}>
                    <span className={`absolute -top-4 whitespace-nowrap font-mono text-[10px] text-neutral-400 ${tau > 0.7 ? 'right-1' : 'left-1'}`}>heal needs ≥{pct(tau)}</span>
                  </div>
                )}
                {rows.filter((r) => r.risk_tier === tier).map((r, i) => (
                  <span
                    key={`${r.scenario}-${r.step}`}
                    className="absolute flex h-5 w-5 -translate-x-1/2 items-center justify-center text-[13px] leading-none"
                    style={{ left: `${r.p_stale * 100}%`, bottom: 4 + (i % 2) * 12, color: CAUSE[r.truth_cause].color, textShadow: '0 0 0 2px #0d0d10, 0 0 3px #0d0d10' }}
                    onMouseMove={(e) => show(e, <><b>{r.scenario}</b> · {r.step}<br />P(rename) {pct(r.p_stale)} → {r.triagecore_action}<br />true cause: {CAUSE[r.truth_cause].label}</>)}
                    onMouseLeave={hide}
                  >{actionMark[r.triagecore_action]}</span>
                ))}
              </div>
            </div>
          );
        })}
        <div className="grid grid-cols-[90px_1fr] gap-3 text-[10px] text-neutral-500">
          <span />
          <div className="flex justify-between font-mono"><span>0%</span><span>P(harmless rename)</span><span>100%</span></div>
        </div>
      </div>
      {layer}
    </div>
  );
}
