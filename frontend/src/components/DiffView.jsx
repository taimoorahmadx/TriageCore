import React from 'react';
import { FileCode } from 'lucide-react';

export function DiffView({ filename, oldCode, newCode, title = "Proposed Change" }) {
  const oldLines = oldCode ? oldCode.trim().split('\n') : [];
  const newLines = newCode ? newCode.trim().split('\n') : [];

  return (
    <div className="bg-black border border-white/[0.08] rounded-xl overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="bg-neutral-950 px-4 py-2 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2 text-neutral-300">
          <FileCode className="w-3.5 h-3.5 text-neutral-400" />
          <span className="font-semibold text-neutral-200">{filename}</span>
        </div>
        <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{title}</span>
      </div>

      {/* Code diff lines */}
      <div className="p-2 space-y-0.5 overflow-x-auto bg-black">
        {oldLines.map((line, idx) => (
          <div key={`old-${idx}`} className="flex items-center gap-3 px-2 py-0.5 bg-rose-500/[0.08] text-rose-200 rounded border-l-2 border-rose-500/70">
            <span className="text-neutral-600 select-none w-5 text-right font-mono text-[11px]">{idx + 1}</span>
            <span className="text-rose-400 select-none font-bold">-</span>
            <span className="flex-1 whitespace-pre text-[12px]">{line}</span>
          </div>
        ))}
        {newLines.map((line, idx) => (
          <div key={`new-${idx}`} className="flex items-center gap-3 px-2 py-0.5 bg-emerald-500/[0.08] text-emerald-200 rounded border-l-2 border-emerald-500/70">
            <span className="text-neutral-600 select-none w-5 text-right font-mono text-[11px]">{oldLines.length + idx + 1}</span>
            <span className="text-emerald-400 select-none font-bold">+</span>
            <span className="flex-1 whitespace-pre text-[12px]">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
