"use client";

import { useEffect, useRef } from "react";
import { useConnectionStore } from "@/store/connection";
import { formatTime } from "@/lib/api";

export function SystemLogPanel() {
  const { logs, clearLogs } = useConnectionStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const levelColors = {
    info: "text-terminal-muted",
    warning: "text-terminal-accent",
    error: "text-terminal-negative",
    success: "text-terminal-positive",
  };

  const levelIcons = {
    info: "ℹ",
    warning: "⚠",
    error: "✗",
    success: "✓",
  };

  return (
    <div className="flex flex-col h-full bg-black/50">
      {/* Actions */}
      <div className="sticky top-0 bg-black/80 border-b border-terminal-positive/30 px-4 py-2 flex items-center justify-end">
        <button
          onClick={() => clearLogs()}
          className="text-xs px-2 py-1 border border-terminal-positive/30 rounded hover:border-terminal-positive/50 text-terminal-muted hover:text-terminal-positive transition-all"
        >
          Clear
        </button>
      </div>

      {/* Logs */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-xs space-y-0"
        style={{ background: "rgba(0, 0, 0, 0.45)" }}
      >
        {logs.length === 0 ? (
          <div className="p-3 text-terminal-muted text-center">
            No logs yet. System messages will appear here.
          </div>
        ) : (
          logs.map((log) => {
            const colorClass = levelColors[log.level];
            const icon = levelIcons[log.level];

            return (
              <div
                key={log.id}
                className={`px-3 py-1 border-b border-terminal-positive/10 hover:bg-terminal-positive/5 transition-colors ${
                  log.level === "error"
                    ? "bg-red-950/10"
                    : log.level === "warning"
                      ? "bg-yellow-950/10"
                      : log.level === "success"
                        ? "bg-green-950/10"
                        : "bg-black/30"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-terminal-muted min-w-fit">
                    [{formatTime(log.timestamp)}]
                  </span>
                  <span className={`min-w-fit ${colorClass}`}>{icon}</span>
                  <span className={`${colorClass} flex-1`}>{log.message}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-terminal-positive/30 px-4 py-2 text-xs text-terminal-muted bg-black/80">
        Total Logs: {logs.length} | Auto-scroll: ON
      </div>
    </div>
  );
}
