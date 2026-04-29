"use client";

import { useMemo } from "react";
import { useMarketStore } from "@/store/market";
import { formatNumber } from "@/lib/api";

export function TopMoversPanel() {
  const { symbols, priceData, setCurrentSymbol } = useMarketStore();

  const movers = useMemo(() => {
    return symbols
      .map((s) => {
        const symbol = s.symbolCode;
        const price = priceData[symbol];
        if (!price) return null;

        const change24h =
          price.DailyChangePercent ??
          ((price.ClosePrice - price.OpenPrice) / (price.OpenPrice || 1)) * 100;

        return {
          symbol,
          close: price.ClosePrice,
          change24h,
          abs: Math.abs(change24h),
        };
      })
      .filter((item): item is { symbol: string; close: number; change24h: number; abs: number } => item !== null)
      .sort((a, b) => b.abs - a.abs)
      .slice(0, 5);
  }, [symbols, priceData]);

  return (
    <div className="h-full border border-terminal-positive/25 bg-black p-3 font-mono">
      <div className="text-[11px] uppercase tracking-[0.2em] text-terminal-muted">Top Movers 24H</div>
      <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {movers.map((mover) => {
          const up = mover.change24h >= 0;
          return (
            <button
              key={mover.symbol}
              onClick={() => setCurrentSymbol(mover.symbol)}
              className="flex items-center justify-between border border-terminal-positive/20 px-2 py-1 text-left hover:border-terminal-positive/50"
              title="Set as focus market"
            >
              <span className={`font-bold ${up ? "text-terminal-positive" : "text-terminal-negative"}`}>
                {up ? "▲" : "▼"} {mover.symbol}
              </span>
              <span className="text-terminal-muted">
                {formatNumber(mover.close, 2)} |{" "}
                <span className={up ? "text-terminal-positive" : "text-terminal-negative"}>
                  {up ? "+" : ""}
                  {formatNumber(mover.change24h, 2)}%
                </span>
              </span>
            </button>
          );
        })}
        {movers.length === 0 && <div className="text-[11px] text-terminal-muted">Waiting for market prices...</div>}
      </div>
    </div>
  );
}
