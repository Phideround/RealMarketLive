"use client";

import { useUIStore } from "@/store/ui";
import { SignalLogPanel } from "./SignalLogPanel";
import { SystemLogPanel } from "./SystemLogPanel";

export function BottomPanel() {
  const { activeBottomTab, setActiveBottomTab, loggerExpanded, toggleLoggerExpanded } = useUIStore();

  return (
    <div className="panel-energized flex h-full flex-col overflow-hidden rounded-none border border-terminal-positive/25 bg-black">
      <div className="flex items-center justify-between border-b border-terminal-positive/25 px-4 py-3 bg-black">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-terminal-muted">Execution Console</div>
          <div className="mt-1 text-sm font-bold text-terminal-positive">
            {activeBottomTab === "system-logs" ? "System Logs" : "Signals Logs"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-terminal-positive/25 bg-terminal-positive/5 p-1 text-[11px] font-mono">
            <button
              onClick={() => setActiveBottomTab("system-logs")}
              className={`px-2 py-1 transition-all ${
                activeBottomTab === "system-logs"
                  ? "bg-terminal-positive/15 text-terminal-positive"
                  : "text-terminal-muted hover:text-terminal-positive"
              }`}
            >
              System Logs
            </button>
            <button
              onClick={() => setActiveBottomTab("signal-logs")}
              className={`px-2 py-1 transition-all ${
                activeBottomTab === "signal-logs"
                  ? "bg-terminal-positive/15 text-terminal-positive"
                  : "text-terminal-muted hover:text-terminal-positive"
              }`}
            >
              Signals Logs
            </button>
          </div>
          <button
            onClick={() => toggleLoggerExpanded()}
            className="inline-flex h-9 w-9 items-center justify-center border border-terminal-positive/30 bg-terminal-positive/10 text-terminal-positive transition-all hover:border-terminal-positive hover:bg-terminal-positive/15"
            title={loggerExpanded ? "Reduce logger height" : "Show logger higher"}
            aria-label={loggerExpanded ? "Reduce logger height" : "Show logger higher"}
          >
            {loggerExpanded ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M7 14l5-5 5 5" />
                <path d="M7 20l5-5 5 5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M7 10l5 5 5-5" />
                <path d="M7 4l5 5 5-5" />
              </svg>
            )}
          </button>
          <div className="border border-terminal-positive/25 bg-terminal-positive/10 px-3 py-1 text-[11px] font-mono text-terminal-muted">
            Shortcut: L
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeBottomTab === "system-logs" ? <SystemLogPanel /> : <SignalLogPanel />}
      </div>
    </div>
  );
}
