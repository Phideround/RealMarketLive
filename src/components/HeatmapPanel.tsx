"use client";

import { useMemo, useState } from "react";
import { useMarketStore } from "@/store/market";
import { formatNumber } from "@/lib/api";

export function HeatmapPanel() {
  const { symbols, priceData, currentSymbol, setCurrentSymbol } = useMarketStore();
  const [showAllModal, setShowAllModal] = useState(false);
  const PRIORITY_SYMBOLS = ["XAUUSD", "BTCUSD"];

  const classIcon = (marketClass: string) => {
    const key = marketClass.toLowerCase();
    if (key.includes("forex")) return "FX";
    if (key.includes("crypto")) return "₿";
    if (key.includes("commodity")) return "CM";
    if (key.includes("index")) return "IX";
    if (key.includes("stock") || key.includes("equity")) return "EQ";
    return "•";
  };

  const cells = useMemo(() => {
    const ranked = symbols
      .map((s) => {
        const symbol = s.symbolCode;
        const marketClass = s.marketClass;
        const price = priceData[symbol];
        if (!price) {
          return {
            symbol,
            marketClass,
            change: 0,
            colorChange: 0,
            absChange: 0,
            hourly: 0,
            daily: 0,
            bid: 0,
            ask: 0,
            volume: 0,
            trend: [] as number[],
            hasData: false,
          };
        }

        const change = ((price.ClosePrice - price.OpenPrice) / (price.OpenPrice || 1)) * 100;
        const trend = (price.HistoryVolumes || []).slice(-12);
        const colorChange = price.DailyChangePercent ?? change;
        return {
          symbol,
          marketClass,
          change,
          colorChange,
          absChange: Math.min(1, Math.abs(colorChange) / 2),
          hourly: price.HourlyChangePercent ?? 0,
          daily: price.DailyChangePercent ?? 0,
          bid: price.Bid,
          ask: price.Ask,
          volume: price.Volume,
          trend,
          hasData: true,
        };
      })
      .sort((a, b) => {
        const aPriority = PRIORITY_SYMBOLS.includes(a.symbol) ? PRIORITY_SYMBOLS.indexOf(a.symbol) : 99;
        const bPriority = PRIORITY_SYMBOLS.includes(b.symbol) ? PRIORITY_SYMBOLS.indexOf(b.symbol) : 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return Math.abs(b.colorChange) - Math.abs(a.colorChange);
      });

    return ranked;
  }, [symbols, priceData]);

  const topCells = useMemo(() => cells.slice(0, 14), [cells]);

  const tileStyle = (isUp: boolean, absChange: number, isActive: boolean) => {
    const intensity = 0.06 + absChange * 0.2;
    const background = isUp
      ? `rgba(0, 255, 65, ${intensity})`
      : `rgba(255, 96, 96, ${intensity})`;
    const borderColor = isActive
      ? "#00E5FF"
      : isUp
      ? "rgba(0,255,65,0.38)"
      : "rgba(255,96,96,0.38)";

    return {
      background,
      borderColor,
      boxShadow: isActive ? "0 0 0 1px #00E5FF inset" : undefined,
    };
  };

  return (
    <div className="flex flex-col h-full border border-terminal-positive/20 rounded bg-black/40 overflow-hidden">
      <div className="px-3 py-2 border-b border-terminal-positive/20 bg-black/70">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-terminal-accent tracking-wider">MARKET HEATMAP (24H)</h3>
          <button
            onClick={() => setShowAllModal(true)}
            className="text-[10px] px-2 py-1 rounded border border-terminal-accent/40 text-terminal-accent hover:bg-terminal-accent/10"
            title="Open full heatmap view"
          >
            ▦ All
          </button>
        </div>
      </div>

      <div className="p-2 grid grid-cols-2 gap-2 flex-1 overflow-y-auto">
        {topCells.map((cell) => {
          const isActive = cell.symbol === currentSymbol;
          const isUp = cell.colorChange >= 0;
          const trendMax = Math.max(...cell.trend, 1);

          return (
            <button
              key={cell.symbol}
              onClick={() => setCurrentSymbol(cell.symbol)}
              className="rounded p-2 text-left border transition-all"
              style={tileStyle(isUp, cell.absChange, isActive)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-terminal-positive">{classIcon(cell.marketClass)} {cell.symbol}</div>
                <div className={`text-[11px] font-mono ${cell.change >= 0 ? "text-terminal-positive" : "text-red-400"}`}>
                  {cell.hasData ? `${cell.change >= 0 ? "+" : ""}${formatNumber(cell.change, 2)}%` : "--"}
                </div>
              </div>

              <div className="mt-1 grid grid-cols-2 gap-x-2 text-[10px] text-terminal-muted font-mono">
                <div>
                  H1: <span className={cell.hourly >= 0 ? "text-terminal-positive" : "text-red-400"}>{cell.hasData ? `${cell.hourly >= 0 ? "+" : ""}${formatNumber(cell.hourly, 2)}%` : "--"}</span>
                </div>
                <div>
                  D1: <span className={cell.daily >= 0 ? "text-terminal-positive" : "text-red-400"}>{cell.hasData ? `${cell.daily >= 0 ? "+" : ""}${formatNumber(cell.daily, 2)}%` : "--"}</span>
                </div>
                <div>
                  B: <span className="text-terminal-accent">{cell.hasData ? formatNumber(cell.bid, 2) : "--"}</span>
                </div>
                <div>
                  A: <span className="text-terminal-accent">{cell.hasData ? formatNumber(cell.ask, 2) : "--"}</span>
                </div>
              </div>

              <div className="mt-1 text-[10px] text-terminal-muted font-mono">
                Vol: <span className="text-terminal-positive">{cell.hasData ? formatNumber(cell.volume, 0) : "--"}</span>
              </div>

              <div className="mt-1 h-4 flex items-end gap-[1px]">
                {cell.hasData && cell.trend.length > 0 ? (
                  cell.trend.map((v, i) => (
                    <span
                      key={`${cell.symbol}-trend-${i}`}
                      className="flex-1 bg-terminal-accent/70"
                      style={{ height: `${Math.max(15, (v / trendMax) * 100)}%` }}
                    />
                  ))
                ) : (
                  <span className="text-[10px] text-terminal-muted">No trend</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {showAllModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[1px] p-6" onClick={() => setShowAllModal(false)}>
          <div
            className="h-full w-full rounded border border-terminal-positive/30 bg-black/95 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-terminal-positive/20 flex items-center justify-between">
              <h3 className="text-sm font-bold text-terminal-accent tracking-wider">FULL MARKET HEATMAP (24H)</h3>
              <button
                onClick={() => setShowAllModal(false)}
                className="text-xs px-3 py-1 border border-terminal-accent/40 rounded text-terminal-accent hover:bg-terminal-accent/10"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {cells.map((cell) => {
                const isActive = cell.symbol === currentSymbol;
                const isUp = cell.colorChange >= 0;

                return (
                  <button
                    key={`modal-${cell.symbol}`}
                    onClick={() => {
                      setCurrentSymbol(cell.symbol);
                      setShowAllModal(false);
                    }}
                    className="rounded p-3 border transition-all text-center"
                    style={tileStyle(isUp, cell.absChange, isActive)}
                  >
                    <div className="text-xs text-terminal-muted mb-1">{classIcon(cell.marketClass)}</div>
                    <div className="text-lg font-bold text-terminal-positive">{cell.symbol}</div>
                    <div className={`text-lg font-mono ${cell.colorChange >= 0 ? "text-terminal-positive" : "text-red-400"}`}>
                      {cell.hasData ? `${cell.colorChange >= 0 ? "+" : ""}${formatNumber(cell.colorChange, 2)}%` : "--"}
                    </div>
                    <div className="mt-1 text-[11px] text-terminal-muted">
                      Vol {cell.hasData ? formatNumber(cell.volume, 0) : "--"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
