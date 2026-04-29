"use client";

import { useEffect, useMemo, useState } from "react";
import { useConnectionStore } from "@/store/connection";
import { useMarketStore } from "@/store/market";
import { formatNumber, formatTime } from "@/lib/api";

export function Header() {
  const { wsConnected, latency, apiHealth } = useConnectionStore();
  const { symbols, priceData } = useMarketStore();
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  const marketTape = useMemo(() => {
    return symbols
      .map((symbolInfo) => {
        const symbol = symbolInfo.symbolCode;
        const price = priceData[symbol];
        if (!price) return null;

        const rawChange =
          price.DailyChangePercent ??
          ((price.ClosePrice - price.OpenPrice) / (price.OpenPrice || 1)) * 100;

        return {
          symbol,
          close: price.ClosePrice,
          change24h: rawChange,
        };
      })
      .filter((row): row is { symbol: string; close: number; change24h: number } => row !== null);
  }, [symbols, priceData]);

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
    degraded: "text-terminal-positive",
    error: "text-terminal-negative",
  }[apiHealth];

  const healthIcon = {
    ok: "●",
    degraded: "◐",
    error: "○",
  }[apiHealth];

  return (
    <header className="bg-black border-b border-terminal-positive/30 px-3 py-3 font-mono md:px-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Title */}
        <div className="flex items-center gap-4 lg:gap-8">
          <button
            onClick={() => window.location.reload()}
            className="text-2xl font-bold text-terminal-positive hover:text-terminal-positive/90 transition-colors cursor-pointer"
            title="Refresh application"
          >
            ▲ RealMarketLive
          </button>
          <div className="text-xs text-terminal-muted space-y-0.5">
            <div>Market Intelligence Terminal v0.1.1</div>
          </div>
        </div>

        {/* Right: Status Indicators */}
        <div className="flex flex-wrap items-center gap-3 text-xs lg:gap-8">
          {/* WebSocket Status */}
          <div className="flex items-center gap-2">
            <span className={wsStatusColor}>{wsStatusText}</span>
            <span className="text-terminal-muted">|</span>
          </div>

          {/* Latency */}
          <div className="flex items-center gap-2">
            <span className="text-terminal-muted">Latency:</span>
            <span className={latency > 100 ? "text-terminal-negative" : "text-terminal-positive"}>
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
            <span className="text-terminal-muted">|</span>
          </div>

          {/* Telegram */}
          <div className="flex items-center gap-2">
            <a
              href="https://t.me/RealMarketAPISaasBot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-6 w-6 items-center justify-center border border-terminal-positive/40 text-terminal-positive hover:bg-terminal-positive/10"
              title="Open Telegram bot"
              aria-label="Open Telegram bot"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                <path d="M21.5 3.6a1 1 0 0 0-1-.14L2.9 10.2a1 1 0 0 0 .08 1.88l4.35 1.45 1.67 5.05a1 1 0 0 0 1.74.3l2.56-3.15 4.5 3.28a1 1 0 0 0 1.58-.62l2.15-13.8a1 1 0 0 0-.42-1.01zM9.4 12.84l8.9-5.65-7.52 7.9-.45 1.8-.93-2.82z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="mt-2 border-t border-terminal-positive/20 pt-2 overflow-hidden">
        <div className="ticker-track text-[11px] text-terminal-muted">
          {[...marketTape, ...marketTape].map((item, index) => (
            <span key={`${item.symbol}-${index}`} className="mr-8 whitespace-nowrap">
              <span className={item.change24h >= 0 ? "text-terminal-positive font-bold" : "text-terminal-negative font-bold"}>{item.symbol}</span>
              <span className={`mx-2 ${item.change24h >= 0 ? "text-terminal-positive" : "text-terminal-negative"}`}>{formatNumber(item.close, 2)}</span>
              <span className={item.change24h >= 0 ? "text-terminal-positive" : "text-terminal-negative"}>
                {item.change24h >= 0 ? "+" : ""}
                {formatNumber(item.change24h, 2)}%
              </span>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
