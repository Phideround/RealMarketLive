"use client";

import { SystemLogPanel } from "./SystemLogPanel";

export function BottomPanel() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-none border border-terminal-positive/25 bg-black">
      <div className="flex items-center justify-between border-b border-terminal-positive/25 px-4 py-3 bg-black">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-terminal-muted">Execution Console</div>
          <div className="mt-1 text-sm font-bold text-terminal-positive">System Logs</div>
        </div>
        <div className="border border-terminal-positive/25 bg-terminal-positive/10 px-3 py-1 text-[11px] font-mono text-terminal-muted">
          Shortcut: L
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <SystemLogPanel />
      </div>
    </div>
  );
}
