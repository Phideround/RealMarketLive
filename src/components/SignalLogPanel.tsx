"use client";

import { useEffect, useMemo, useRef } from "react";
import { formatTime } from "@/lib/api";
import { useMarketStore } from "@/store/market";
import { useSignalsStore } from "@/store/signals";

const directionTone = {
  BUY: "text-terminal-positive border-terminal-positive/35 bg-terminal-positive/8",
  SELL: "text-red-400 border-red-500/35 bg-red-950/20",
  NEUTRAL: "text-terminal-accent border-terminal-accent/35 bg-terminal-accent/10",
};

export function SignalLogPanel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { currentSymbol } = useMarketStore();
  const { signalHistory, clearHistory } = useSignalsStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [signalHistory]);

  const orderedLogs = useMemo(() => signalHistory, [signalHistory]);

  return (
    <div className="flex h-full flex-col bg-black/50">
      <div className="sticky top-0 flex items-center justify-between border-b border-terminal-positive/30 bg-black/80 px-4 py-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted">
          Strategy Output Stream
        </div>
        <button
          onClick={() => clearHistory()}
          className="rounded border border-terminal-positive/30 px-2 py-1 text-xs text-terminal-muted transition-all hover:border-terminal-positive/50 hover:text-terminal-positive"
        >
          Clear
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-xs"
        style={{ background: "rgba(0, 0, 0, 0.45)" }}
      >
        {orderedLogs.length === 0 ? (
          <div className="p-3 text-center text-terminal-muted">
            No signal logs yet. Integrated signal decisions will appear here.
          </div>
        ) : (
          orderedLogs.map((signal, index) => {
            const isFocused = signal.symbol === currentSymbol;
            const tone = directionTone[signal.direction];

            return (
              <div
                key={`${signal.symbol}-${signal.timeframe}-${signal.timestamp}-${index}`}
                className={`border-b border-terminal-positive/10 px-3 py-2 transition-colors ${isFocused ? "bg-terminal-positive/6" : "bg-black/30 hover:bg-terminal-positive/5"}`}
              >
                <div className="flex items-start gap-2">
                  <span className="min-w-fit text-terminal-muted">[{formatTime(signal.timestamp)}]</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center border px-1.5 py-0.5 text-[10px] font-bold ${tone}`}>
                        {signal.direction}
                      </span>
                      <span className="text-terminal-positive">{signal.symbol}</span>
                      <span className="text-terminal-muted">{signal.timeframe}</span>
                      <span className="text-terminal-muted">{signal.confidence}% confidence</span>
                      {isFocused ? (
                        <span className="text-[10px] uppercase tracking-[0.14em] text-terminal-accent">Focus</span>
                      ) : null}
                    </div>
                    <div className="mt-1 break-words text-terminal-muted/90">{signal.reasoning ?? "No reasoning provided"}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-terminal-muted/80">
                      {signal.orderFlow?.currentImbalance ? <span>Flow: {signal.orderFlow.currentImbalance}</span> : null}
                      {signal.anomaly?.hasAnomalies ? <span>Anomalies: {signal.anomaly.anomalies.length}</span> : null}
                      {signal.manipulationRisk?.riskLevel ? <span>Manipulation: {signal.manipulationRisk.riskLevel}</span> : null}
                      {signal.nextInsight?.bias ? <span>Bias: {signal.nextInsight.bias}</span> : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-terminal-positive/30 bg-black/80 px-4 py-2 text-xs text-terminal-muted">
        Signal Logs: {orderedLogs.length} | Focus Market: {currentSymbol}
      </div>
    </div>
  );
}