import React from 'react';
import { FileCode } from 'lucide-react';

export function DiffView({ filename, oldCode, newCode, title = "Proposed Change" }) {
  const oldLines = oldCode ? oldCode.trim().split('\n') : [];
  const newLines = newCode ? newCode.trim().split('\n') : [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-300">
          <FileCode className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-slate-200">{filename}</span>
        </div>
        <span className="text-[11px] text-slate-500">{title}</span>
      </div>

      {/* Code diff lines */}
      <div className="p-2 space-y-0.5 overflow-x-auto bg-[#0A0E17]">
        {oldLines.map((line, idx) => (
          <div key={`old-${idx}`} className="flex items-center gap-3 px-2 py-0.5 bg-rose-950/30 text-rose-300 rounded border-l-2 border-rose-500">
            <span className="text-slate-600 select-none w-5 text-right font-sans">{idx + 1}</span>
            <span className="text-rose-400 select-none">-</span>
            <span className="flex-1 whitespace-pre">{line}</span>
          </div>
        ))}
        {newLines.map((line, idx) => (
          <div key={`new-${idx}`} className="flex items-center gap-3 px-2 py-0.5 bg-emerald-950/30 text-emerald-300 rounded border-l-2 border-emerald-500">
            <span className="text-slate-600 select-none w-5 text-right font-sans">{oldLines.length + idx + 1}</span>
            <span className="text-emerald-400 select-none">+</span>
            <span className="flex-1 whitespace-pre">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
