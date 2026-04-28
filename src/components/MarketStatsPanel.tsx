"use client";

import { useMemo } from "react";
import { useMarketStore } from "@/store/market";
import { useConnectionStore } from "@/store/connection";
import { calculateSpread, calculateVolatility, formatNumber } from "@/lib/api";
import { getSessionRange, calculateMomentum } from "@/lib/signals";

export function MarketStatsPanel() {
  const { symbols, priceData, candles, currentSymbol } = useMarketStore();
  const { tickFrequency } = useConnectionStore();

  const stats = useMemo(() => {
    const currentPrice = priceData[currentSymbol];
    const currentCandles = candles[currentSymbol] || [];

    if (!currentPrice) {
      return {
        currentSpread: 0,
        avgVolatility: 0,
        sessionRange: { high: 0, low: 0 },
        momentum: 0,
        maxVolume: 0,
        minVolume: 0,
        volatilitySpikes: 0,
      };
    }

      const spread = calculateSpread(currentPrice.Bid, currentPrice.Ask);

    const avgVolatility =
      currentCandles.length > 0
        ? currentCandles.reduce((sum, c) => sum + calculateVolatility(c.HighPrice, c.LowPrice, c.ClosePrice), 0) /
          currentCandles.length
        : 0;

    const sessionRange = getSessionRange(currentCandles);

    const momentum = calculateMomentum(currentCandles);

    const volumes = currentCandles.map((c) => c.Volume);
    const maxVolume = Math.max(...volumes, 0);
    const minVolume = Math.min(...volumes, 0);

    // Count volatility spikes (volatility > 2x average)
    const avgVol = avgVolatility;
    const volatilitySpikes = currentCandles.filter(
      (c) => calculateVolatility(c.HighPrice, c.LowPrice, c.ClosePrice) > avgVol * 2
    ).length;

    return {
      currentSpread: spread,
      avgVolatility,
      sessionRange,
      momentum,
      maxVolume,
      minVolume,
      volatilitySpikes,
    };
  }, [currentSymbol, priceData, candles]);

  // Calculate top volatility symbols
  const topVolatile = useMemo(() => {
    return symbols
      .map((symbolInfo) => {
        const symbol = symbolInfo.symbolCode;
        const price = priceData[symbol];
        if (!price) return { symbol, volatility: 0 };

        return {
          symbol,
          volatility: calculateVolatility(
            price.HighPrice,
            price.LowPrice,
            price.ClosePrice
          ),
        };
      })
      .sort((a, b) => b.volatility - a.volatility)
      .slice(0, 3);
  }, [symbols, priceData]);

  return (
    <div className="flex flex-col h-full bg-black/50">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 border-b border-terminal-positive/30 px-4 py-2">
        <h3 className="text-sm font-bold text-terminal-accent">Market Statistics</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Current Symbol Stats */}
        <div className="border border-terminal-positive/30 rounded p-3 bg-black/30">
          <div className="text-xs font-bold text-terminal-accent mb-2">{currentSymbol} Stats</div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-terminal-muted">Spread</div>
              <div className="text-terminal-positive font-mono font-bold">
                {formatNumber(stats.currentSpread, 3)}
              </div>
            </div>
            <div>
              <div className="text-terminal-muted">Avg Volatility</div>
              <div className="text-terminal-positive font-mono font-bold">
                {formatNumber(stats.avgVolatility, 2)}%
              </div>
            </div>
            <div>
              <div className="text-terminal-muted">Momentum</div>
              <div
                className={`font-mono font-bold ${
                  stats.momentum > 0 ? "text-terminal-positive" : "text-terminal-negative"
                }`}
              >
                {formatNumber(stats.momentum, 2)}%
              </div>
            </div>
            <div>
              <div className="text-terminal-muted">Vol Spikes</div>
              <div className="text-terminal-accent font-mono font-bold">
                {stats.volatilitySpikes}
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-terminal-positive/20 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-terminal-muted">Session High</div>
                <div className="text-terminal-positive font-mono">
                  {formatNumber(stats.sessionRange.high, 2)}
                </div>
              </div>
              <div>
                <div className="text-terminal-muted">Session Low</div>
                <div className="text-terminal-positive font-mono">
                  {formatNumber(stats.sessionRange.low, 2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Performance */}
        <div className="border border-terminal-positive/30 rounded p-3 bg-black/30">
          <div className="text-xs font-bold text-terminal-accent mb-2">System Performance</div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-terminal-muted">Tick Rate</div>
              <div className="text-terminal-positive font-mono font-bold">
                {tickFrequency} ticks/s
              </div>
            </div>
            <div>
              <div className="text-terminal-muted">Active Symbols</div>
              <div className="text-terminal-positive font-mono font-bold">
                {symbols.length}
              </div>
            </div>
          </div>
        </div>

        {/* Top Volatility */}
        <div className="border border-terminal-positive/30 rounded p-3 bg-black/30">
          <div className="text-xs font-bold text-terminal-accent mb-2">Top Volatility</div>

          <div className="space-y-1">
            {topVolatile.map(({ symbol, volatility }) => (
              <div key={symbol} className="flex items-center justify-between text-xs">
                <span className="text-terminal-accent">{symbol}</span>
                <span className="text-terminal-positive font-mono">
                  {formatNumber(volatility, 2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-terminal-positive/30 px-4 py-2 text-xs text-terminal-muted bg-black/80">
        Last Update: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}
