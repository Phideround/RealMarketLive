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
import { LatencyCoachPanel } from "./LatencyCoachPanel";
import { TopMoversPanel } from "./TopMoversPanel";

const PANEL_FRAME = "overflow-hidden rounded-none border border-terminal-positive/25 bg-black";

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
      <div className="flex-1 overflow-y-auto px-3 pb-3 lg:overflow-hidden">
        <div className="flex min-h-full flex-col gap-3 lg:grid lg:h-full lg:grid-cols-[23rem_minmax(0,1.4fr)_29rem]">
          <div className={`${PANEL_FRAME} hidden lg:block`}>
            <SignalPanel />
          </div>

          <div className={`${PANEL_FRAME} flex min-w-0 flex-col min-h-[24rem] lg:min-h-0`}>
            <div className="flex items-center justify-between border-b border-terminal-positive/25 bg-black px-4 py-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-terminal-muted">Focus Market</div>
                <div className="mt-1 text-sm text-terminal-muted">
                  <span className="font-bold text-terminal-positive">{currentSymbol}</span> on <span className="font-semibold text-terminal-positive">{currentTimeframe}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setCurrentSymbol("XAUUSD")}
                  className={`hidden sm:inline-block border px-3 py-1.5 transition-all ${currentSymbol === "XAUUSD" ? "border-terminal-positive text-terminal-positive bg-terminal-positive/10" : "border-terminal-positive/25 text-terminal-muted hover:border-terminal-positive/40 hover:text-terminal-positive"}`}
                >
                  XAUUSD
                </button>
                <button
                  onClick={() => setCurrentSymbol("BTCUSD")}
                  className={`hidden sm:inline-block border px-3 py-1.5 transition-all ${currentSymbol === "BTCUSD" ? "border-terminal-positive text-terminal-positive bg-terminal-positive/10" : "border-terminal-positive/25 text-terminal-muted hover:border-terminal-positive/40 hover:text-terminal-positive"}`}
                >
                  BTCUSD
                </button>
                <button
                  onClick={() => {
                    setCurrentSymbol("XAUUSD");
                    setCurrentTimeframe("H1");
                  }}
                  className="border border-terminal-positive/35 bg-terminal-positive/10 px-2 py-1 sm:px-3 sm:py-1.5 text-terminal-positive transition-all hover:bg-terminal-positive/15"
                  title="Reset to default view"
                >
                  Reset View
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 p-2">
              <div className="h-full overflow-hidden rounded-none border border-terminal-positive/20 bg-black">
                <LiveChart />
              </div>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-1 lg:grid-rows-[1.1fr_1fr_0.92fr] lg:overflow-hidden">
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
      <div className="px-3 pb-3">
        <div className="grid h-44 grid-cols-1 gap-3 lg:h-28 lg:grid-cols-2">
          <LatencyCoachPanel />
          <TopMoversPanel />
        </div>
      </div>

      <div className="h-56 overflow-hidden px-3 pb-3 lg:h-[17.5rem]">
        <BottomPanel />
      </div>

      <footer className="px-3 pb-2 text-[10px] text-terminal-muted text-center">
        Powered by{" "}
        <a
          href="https://realmarketapi.com?utm_source=realmarketlive"
          target="_blank"
          rel="noreferrer"
          className="text-terminal-positive hover:text-terminal-positive/90"
        >
          RealMarketAPI
        </a>
      </footer>

      {/* Keyboard Shortcuts Hint */}
      <div
        className="fixed bottom-4 right-4 hidden pointer-events-none lg:block"
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          textShadow: "0 0 6px rgba(0, 255, 65, 0.14)",
        }}
      >
        <div className="border border-terminal-positive/25 bg-black px-3 py-2 text-xs text-terminal-muted">
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
