"use client";

import { useEffect, useRef } from "react";
import { useMarketStore } from "@/store/market";
import { formatNumber } from "@/lib/api";

export function TickStream() {
  const { tickHistory } = useMarketStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tickHistory]);

  return (
    <div className="flex flex-col h-full border-l border-terminal-positive/30 bg-black/50">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 border-b border-terminal-positive/30 px-3 py-2 text-xs font-bold">
        <div className="text-terminal-accent">TICK STREAM [Live Feed]</div>
      </div>

      {/* Ticks */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-xs space-y-0"
        style={{
          background: "linear-gradient(to bottom, rgba(0, 255, 0, 0.02), rgba(0, 0, 0, 0.1))",
        }}
      >
        {tickHistory.length === 0 ? (
          <div className="p-3 text-terminal-muted text-center">
            Waiting for market data...
          </div>
        ) : (
          tickHistory.map((tick, index) => {
            const directionSymbol = tick.direction === "up" ? "↑" : "↓";
            const directionColor =
              tick.direction === "up" ? "text-terminal-positive" : "text-terminal-negative";
            const changePercentage = formatNumber(tick.change, 2);
            const price = formatNumber(tick.price, 2);

            // Format time
            let displayTime = "";
            try {
              const date = new Date(tick.timestamp);
              displayTime = date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              });
            } catch {
              displayTime = tick.timestamp;
            }

            return (
              <div
                key={index}
                className={`px-3 py-1 border-b border-terminal-positive/10 hover:bg-terminal-positive/5 transition-colors ${
                  index % 2 === 0 ? "bg-black/30" : "bg-black/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-terminal-muted">[{displayTime}]</span>{" "}
                    <span className="text-terminal-accent font-bold">{tick.symbol}</span>
                    <span className={`${directionColor} font-bold`}> {directionSymbol} </span>
                    <span className="text-terminal-positive font-mono">{price}</span>
                  </div>

                  <div
                    className={`ml-4 font-bold ${
                      tick.direction === "up"
                        ? "text-terminal-positive"
                        : "text-terminal-negative"
                    }`}
                  >
                    ({tick.direction === "up" ? "+" : "-"}
                    {changePercentage}%)
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-terminal-positive/30 px-3 py-2 text-xs text-terminal-muted bg-black/80">
        <div>Total Ticks: {tickHistory.length} | Auto-scroll: ON</div>
      </div>
    </div>
  );
}
