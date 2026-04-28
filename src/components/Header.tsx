"use client";

import { useEffect, useState } from "react";
import { useConnectionStore } from "@/store/connection";
import { formatTime } from "@/lib/api";

export function Header() {
  const { wsConnected, latency, apiHealth } = useConnectionStore();
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  useEffect(() => {
    // Set initial time after hydration
    setCurrentTime(new Date().toISOString());
    const interval = setInterval(() => {
      setCurrentTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const wsStatusColor = wsConnected ? "text-terminal-positive" : "text-terminal-negative";
  const wsStatusText = wsConnected ? "◆ LIVE" : "◇ DISCONNECTED";

  const healthColor = {
    ok: "text-terminal-positive",
    degraded: "text-terminal-accent",
    error: "text-terminal-negative",
  }[apiHealth];

  const healthIcon = {
    ok: "●",
    degraded: "◐",
    error: "○",
  }[apiHealth];

  return (
    <header className="bg-black border-b border-terminal-positive/30 px-4 py-3 font-mono">
      <div className="flex items-center justify-between">
        {/* Left: Title */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => window.location.reload()}
            className="text-2xl font-bold text-terminal-positive glowing hover:text-terminal-accent transition-colors cursor-pointer"
            title="Refresh application"
          >
            ▲ RealMarketLive
          </button>
          <div className="text-xs text-terminal-muted space-y-0.5">
            <div>Market Intelligence Terminal v0.1.0</div>
          </div>
        </div>

        {/* Right: Status Indicators */}
        <div className="flex items-center gap-8 text-xs">
          {/* WebSocket Status */}
          <div className="flex items-center gap-2">
            <span className={wsStatusColor}>{wsStatusText}</span>
            <span className="text-terminal-muted">|</span>
          </div>

          {/* Latency */}
          <div className="flex items-center gap-2">
            <span className="text-terminal-muted">Latency:</span>
            <span className={latency > 100 ? "text-terminal-accent" : "text-terminal-positive"}>
              {latency}ms
            </span>
            <span className="text-terminal-muted">|</span>
          </div>

          {/* API Health */}
          <div className="flex items-center gap-2">
            <span className={healthColor}>{healthIcon}</span>
            <span className="text-terminal-muted">API</span>
            <span className="text-terminal-muted">|</span>
          </div>

          {/* Server Time */}
          <div className="flex items-center gap-2">
            <span className="text-terminal-muted">UTC:</span>
            <span className="text-terminal-positive">{currentTime ? formatTime(currentTime) : "--:--:--"}</span>
          </div>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="mt-2 text-xs text-terminal-accent border-t border-terminal-positive/20 pt-2">
        ⚠ This platform provides market data and signals for informational purposes only.
        It does not support trading. Always conduct your own research.
      </div>
    </header>
  );
}
