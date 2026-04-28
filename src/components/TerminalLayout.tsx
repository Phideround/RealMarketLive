"use client";

import { useEffect, useMemo } from "react";
import { useMarketStore } from "@/store/market";
import { useUIStore } from "@/store/ui";
import { useInitializeMarket } from "@/hooks/useInitializeMarket";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Header } from "./Header";
import { LiveChart } from "./LiveChart";
import { BottomPanel } from "./BottomPanel";
import { SignalPanel } from "./SignalPanel";
import { HeatmapPanel } from "./HeatmapPanel";
import { NewsFeedPanel } from "./NewsFeedPanel";
import { SentimentGaugePanel } from "./SentimentGaugePanel";

const PANEL_FRAME = "overflow-hidden rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,26,0.94),rgba(8,11,18,0.94))] shadow-[0_20px_55px_rgba(0,0,0,0.34)] backdrop-blur-sm";

export function TerminalLayout() {
  // Initialize market data (REST: health check + symbol list)
  useInitializeMarket();

  const { setCurrentSymbol, setCurrentTimeframe, symbols, currentSymbol, currentTimeframe } = useMarketStore();
  const { setActiveBottomTab } = useUIStore();

  // Live WebSocket feeds – reconnect automatically when symbol or timeframe changes
  const priceConfig = useMemo(
    () => ({ symbol: currentSymbol, timeframe: currentTimeframe, type: "price" as const }),
    [currentSymbol, currentTimeframe]
  );
  const candlesConfig = useMemo(
    () => ({ symbol: currentSymbol, timeframe: currentTimeframe, type: "candles" as const }),
    [currentSymbol, currentTimeframe]
  );
  useWebSocket(priceConfig);
  useWebSocket(candlesConfig);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Timeframe shortcuts (1-6)
      const timeframes = ["M1", "M5", "M15", "H1", "H4", "D1"];
      const key = e.key;

      if (key >= "1" && key <= "6") {
        const index = parseInt(key) - 1;
        if (index < timeframes.length) {
          useMarketStore.getState().setCurrentTimeframe(timeframes[index]);
        }
      }

      // Focus shortcuts
      if (key.toLowerCase() === "x") {
        e.preventDefault();
        setCurrentSymbol("XAUUSD");
      }
      if (key.toLowerCase() === "b") {
        e.preventDefault();
        setCurrentSymbol("BTCUSD");
      }

      // Symbol switch (S)
      if (key.toLowerCase() === "s" && symbols.length > 0) {
        e.preventDefault();
        const currentSymbol = useMarketStore.getState().currentSymbol;
        const currentIndex = symbols.findIndex((s) => s.symbolCode === currentSymbol);
        const nextIndex = (currentIndex + 1) % symbols.length;
        setCurrentSymbol(symbols[nextIndex].symbolCode);
      }

      // Tab shortcuts
      if (key.toLowerCase() === "l") {
        e.preventDefault();
        setActiveBottomTab("logs");
      }
      if (key.toLowerCase() === "t") {
        e.preventDefault();
        setActiveBottomTab("stats");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [symbols, setCurrentSymbol, setActiveBottomTab]);

  // Heat intensity decay animation
  useEffect(() => {
    const interval = setInterval(() => {
      useUIStore.getState().decayHeatIntensity();
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col w-screen h-screen bg-terminal-bg overflow-hidden">
      {/* Header */}
      <Header />

      {/* Main Content Grid */}
      <div className="flex-1 overflow-hidden px-3 pb-3">
        <div className="grid h-full grid-cols-[23rem_minmax(0,1.4fr)_29rem] gap-3">
          <div className={PANEL_FRAME}>
            <SignalPanel />
          </div>

          <div className={`${PANEL_FRAME} flex min-w-0 flex-col`}>
            <div className="flex items-center justify-between border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))] px-4 py-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-terminal-muted">Focus Market</div>
                <div className="mt-1 text-sm text-terminal-muted">
                  <span className="font-bold text-terminal-accent">{currentSymbol}</span> on <span className="font-semibold text-terminal-positive">{currentTimeframe}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setCurrentSymbol("XAUUSD")}
                  className={`rounded-full border px-3 py-1.5 transition-all ${currentSymbol === "XAUUSD" ? "border-terminal-accent text-terminal-accent bg-terminal-accent/10 shadow-[0_0_20px_rgba(0,229,255,0.08)]" : "border-white/10 text-terminal-muted hover:border-terminal-positive/30 hover:text-terminal-positive"}`}
                >
                  XAUUSD
                </button>
                <button
                  onClick={() => setCurrentSymbol("BTCUSD")}
                  className={`rounded-full border px-3 py-1.5 transition-all ${currentSymbol === "BTCUSD" ? "border-terminal-accent text-terminal-accent bg-terminal-accent/10 shadow-[0_0_20px_rgba(0,229,255,0.08)]" : "border-white/10 text-terminal-muted hover:border-terminal-positive/30 hover:text-terminal-positive"}`}
                >
                  BTCUSD
                </button>
                <button
                  onClick={() => {
                    setCurrentSymbol("XAUUSD");
                    setCurrentTimeframe("H1");
                  }}
                  className="rounded-full border border-terminal-accent/40 bg-terminal-accent/5 px-3 py-1.5 text-terminal-accent transition-all hover:bg-terminal-accent/10"
                  title="Reset to default view"
                >
                  Reset View
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 p-2">
              <div className="h-full overflow-hidden rounded-[1rem] border border-white/8 bg-black/35">
                <LiveChart />
              </div>
            </div>
          </div>

          <div className="grid min-w-0 grid-rows-[1.1fr_1fr_0.92fr] gap-3 overflow-hidden">
            <div className={PANEL_FRAME}>
              <HeatmapPanel />
            </div>
            <div className={PANEL_FRAME}>
              <NewsFeedPanel />
            </div>
            <div className={PANEL_FRAME}>
              <SentimentGaugePanel />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Command/Diagnostics Panel */}
      <div className="h-[17.5rem] overflow-hidden px-3 pb-3">
        <BottomPanel />
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div
        className="fixed bottom-4 right-4 hidden pointer-events-none lg:block"
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          textShadow: "0 0 8px rgba(0, 255, 0, 0.08)",
        }}
      >
        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(13,18,26,0.92),rgba(7,10,15,0.92))] px-3 py-2 text-xs text-terminal-muted shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-sm">
          <div className="mb-1 uppercase tracking-[0.2em] text-[10px] text-terminal-muted/80">Shortcuts</div>
          <div>1-6: Timeframe</div>
          <div>S: Next Symbol</div>
          <div>X: Gold | B: Bitcoin</div>
          <div>L: Logs</div>
        </div>
      </div>
    </div>
  );
}
