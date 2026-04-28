"use client";

import { useMarketStore } from "@/store/market";
import { useUIStore } from "@/store/ui";
import { calculateSpread, calculateVolatility, formatNumber } from "@/lib/api";
import { useMemo } from "react";

export function SymbolMatrix() {
  const { symbols, currentSymbol, setCurrentSymbol, priceData } = useMarketStore();
  const { heatIntensity } = useUIStore();

  const displayData = useMemo(() => {
    return symbols.map((symbolInfo) => {
      const symbol = symbolInfo.symbolCode;
      const price = priceData[symbol];
      if (!price) {
        return { symbol, bid: "—", ask: "—", spread: "—", change: "—", volatility: "—", display: null };
      }
      const spread = calculateSpread(price.Bid, price.Ask);
      const volatility = calculateVolatility(price.HighPrice, price.LowPrice, price.ClosePrice);
      const change = ((price.ClosePrice - price.OpenPrice) / price.OpenPrice) * 100;
      return {
        symbol,
        bid: formatNumber(price.Bid, 2),
        ask: formatNumber(price.Ask, 2),
        spread: formatNumber(spread, 3),
        change: formatNumber(change, 2),
        volatility: formatNumber(volatility, 2),
        display: { bid: price.Bid, ask: price.Ask, spread, change, volatility },
      };
    });
  }, [symbols, priceData]);

  return (
    <div className="flex flex-col h-full border-r border-terminal-positive/30 bg-black/50">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 border-b border-terminal-positive/30 px-3 py-2 text-xs font-bold">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-terminal-accent">SYMBOL MATRIX</div>
          <div className="text-terminal-muted text-right">24h Vol</div>
        </div>
      </div>

      {/* Symbol List */}
      <div className="flex-1 overflow-y-auto space-y-1 p-2">
        {displayData.map(({ symbol, bid, ask, spread, change, volatility, display }) => {
          const isSelected = symbol === currentSymbol;
          const changeNum = display ? display.change : 0;
          const changeColor = display
            ? changeNum > 0.01
              ? "text-terminal-positive"
              : changeNum < -0.01
              ? "text-terminal-negative"
              : "text-terminal-muted"
            : "text-terminal-muted";
          const heatGlow = heatIntensity[symbol] || 0;

          return (
            <button
              key={symbol}
              onClick={() => setCurrentSymbol(symbol)}
              className={`w-full text-left px-2 py-2 rounded text-xs font-mono transition-all ${
                isSelected
                  ? "bg-terminal-positive/20 border border-terminal-positive/50"
                  : "border border-transparent hover:border-terminal-positive/20"
              }`}
              style={{
                textShadow:
                  heatGlow > 0
                    ? `0 0 ${8 + heatGlow * 12}px rgba(0, 255, 0, ${0.3 + heatGlow * 0.5})`
                    : undefined,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-terminal-positive">{symbol}</span>
                <span className={`text-xs ${changeColor}`}>
                  {display ? (changeNum > 0 ? "▲" : changeNum < 0 ? "▼" : "●") : "—"} {change}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-terminal-muted text-xs">
                <div><span className="text-terminal-accent">B:</span> {bid}</div>
                <div><span className="text-terminal-accent">V:</span> {volatility}%</div>
                <div><span className="text-terminal-accent">A:</span> {ask}</div>
                <div><span className="text-terminal-accent">Sp:</span> {spread}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-terminal-positive/30 px-3 py-2 text-xs text-terminal-muted">
        Active: {displayData.filter((d) => d.display).length}
      </div>
    </div>
  );
}
