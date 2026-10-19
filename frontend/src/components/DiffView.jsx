import React from 'react';
import { FileCode } from 'lucide-react';

export function DiffView({ filename, oldCode, newCode, title = "Proposed Change" }) {
  const oldLines = oldCode ? oldCode.trim().split('\n') : [];
  const newLines = newCode ? newCode.trim().split('\n') : [];

  return (
    <div className="bg-black/80 border border-white/[0.08] rounded-2xl overflow-hidden font-mono text-xs shadow-sm">
      {/* Header */}
      <div className="bg-white/[0.03] px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2 text-neutral-300">
          <FileCode className="w-3.5 h-3.5 text-neutral-400" />
          <span className="font-semibold text-neutral-200">{filename}</span>
        </div>
        <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{title}</span>
      </div>

      {/* Code diff lines */}
      <div className="p-3 space-y-1 overflow-x-auto bg-black">
        {oldLines.map((line, idx) => (
          <div key={`old-${idx}`} className="flex items-center gap-3 px-2.5 py-1 bg-[#ff453a]/10 text-neutral-200 rounded-md border-l-2 border-[#ff453a]">
            <span className="text-neutral-500 select-none w-5 text-right font-mono text-[11px] tabular-nums">{idx + 1}</span>
            <span className="text-[#ff453a] select-none font-bold">-</span>
            <span className="flex-1 whitespace-pre text-[12px]">{line}</span>
          </div>
        ))}
        {newLines.map((line, idx) => (
          <div key={`new-${idx}`} className="flex items-center gap-3 px-2.5 py-1 bg-[#30d158]/10 text-neutral-200 rounded-md border-l-2 border-[#30d158]">
            <span className="text-neutral-500 select-none w-5 text-right font-mono text-[11px] tabular-nums">{oldLines.length + idx + 1}</span>
            <span className="text-[#30d158] select-none font-bold">+</span>
            <span className="flex-1 whitespace-pre text-[12px]">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
