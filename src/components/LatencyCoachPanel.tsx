"use client";

import { useMemo } from "react";
import { useConnectionStore } from "@/store/connection";

export function LatencyCoachPanel() {
  const { latency, wsConnected, tickFrequency } = useConnectionStore();

  const quality = useMemo(() => {
    if (!wsConnected) {
      return {
        label: "Offline",
        color: "text-terminal-negative",
        hint: "WebSocket disconnected. Reconnect to restore live stream.",
      };
    }

    if (latency <= 45) {
      return {
        label: "Excellent",
        color: "text-terminal-positive",
        hint: "Execution timing is stable for fast monitoring.",
      };
    }

    if (latency <= 90) {
      return {
        label: "Good",
        color: "text-terminal-positive",
        hint: "Feed is healthy. Minor transport drift only.",
      };
    }

    if (latency <= 150) {
      return {
        label: "Fair",
        color: "text-terminal-accent",
        hint: "Usable stream. Prioritize H1+ confirmation.",
      };
    }

    return {
      label: "Delayed",
      color: "text-terminal-negative",
      hint: "Use caution. Wait for candle close confirmation.",
    };
  }, [latency, wsConnected]);

  return (
    <div className="h-full border border-terminal-positive/25 bg-black p-3 font-mono">
      <div className="text-[11px] uppercase tracking-[0.2em] text-terminal-muted">Connection Coach</div>
      <div className="mt-2 flex items-end gap-3">
        <div>
          <div className="text-[10px] text-terminal-muted">Display Latency</div>
          <div className="text-xl font-bold text-terminal-positive">{latency}ms</div>
        </div>
        <div>
          <div className="text-[10px] text-terminal-muted">Quality</div>
          <div className={`text-sm font-bold ${quality.color}`}>{quality.label}</div>
        </div>
        <div>
          <div className="text-[10px] text-terminal-muted">Tick Rate</div>
          <div className="text-sm font-bold text-terminal-positive">{tickFrequency}/s</div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-terminal-muted">{quality.hint}</div>
    </div>
  );
}
