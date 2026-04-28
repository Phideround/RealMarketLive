"use client";

import { SystemLogPanel } from "./SystemLogPanel";

export function BottomPanel() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,14,19,0.96),rgba(7,10,15,0.94))] shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-terminal-muted">Execution Console</div>
          <div className="mt-1 text-sm font-bold text-terminal-accent">System Logs</div>
        </div>
        <div className="rounded-full border border-terminal-positive/20 bg-terminal-positive/5 px-3 py-1 text-[11px] font-mono text-terminal-muted">
          Shortcut: L
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <SystemLogPanel />
      </div>
    </div>
  );
}
