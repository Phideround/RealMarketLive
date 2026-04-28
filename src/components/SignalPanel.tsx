"use client";

import { useMarketStore } from "@/store/market";
import { useSignalsStore } from "@/store/signals";
import { formatNumber, formatTime } from "@/lib/api";

export function SignalPanel() {
  const { currentSymbol, symbols } = useMarketStore();
  const { signals } = useSignalsStore();

  const displaySignals = symbols
    .map((symbolInfo) => signals[symbolInfo.symbolCode])
    .filter((signal): signal is typeof signals[string] => signal !== undefined);

  const currentSignal = signals[currentSymbol];

  return (
    <div className="flex flex-col h-full border border-terminal-positive/20 rounded bg-black/40 overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-black/70 border-b border-terminal-positive/20 px-3 py-2 z-10">
        <h3 className="text-xs font-bold text-terminal-accent tracking-wider">MARKET SIGNALS</h3>
      </div>

      {/* Current Symbol Signal */}
      {currentSignal && (
        <div className="px-3 py-3 border-b border-terminal-positive/20 bg-black/30">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-bold text-terminal-accent">{currentSymbol}</div>
            <div className="text-xs text-terminal-muted">
              {formatTime(currentSignal.timestamp)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <div className="text-xs text-terminal-muted">Direction</div>
              <div
                className={`text-lg font-bold font-mono ${
                  currentSignal.direction === "BUY"
                    ? "text-terminal-positive"
                    : currentSignal.direction === "SELL"
                      ? "text-terminal-negative"
                      : "text-terminal-accent"
                }`}
              >
                {currentSignal.direction}
              </div>
            </div>
            <div>
              <div className="text-xs text-terminal-muted">Confidence</div>
              <div className="text-lg font-bold text-terminal-positive">
                {currentSignal.confidence}%
              </div>
            </div>
            <div>
              <div className="text-xs text-terminal-muted">Timeframe</div>
              <div className="text-lg font-bold text-terminal-positive">
                {currentSignal.timeframe}
              </div>
            </div>
          </div>

          {currentSignal.reasoning && (
            <div className="text-xs text-terminal-muted bg-black/50 p-2 rounded border border-terminal-positive/20">
              {currentSignal.reasoning}
            </div>
          )}

          {currentSignal.confluence && (
            <div className="mt-2 text-xs bg-black/50 p-2 rounded border border-terminal-accent/30 space-y-1">
              <div className="text-terminal-accent font-bold">Confluence</div>
              <div className="text-terminal-muted">
                Signal: <span className="text-terminal-positive">{currentSignal.confluence.signal}</span> | Strength: <span className="text-terminal-positive">{currentSignal.confluence.strength}</span> | Score: <span className="text-terminal-positive">{currentSignal.confluence.score}</span>
              </div>
              {currentSignal.confluence.reasons.slice(0, 2).map((reason, idx) => (
                <div key={`reason-${idx}`} className="text-terminal-muted">• {reason}</div>
              ))}
            </div>
          )}

          {currentSignal.setup && (
            <div className="mt-2 text-xs bg-black/50 p-2 rounded border border-terminal-positive/20">
              <div className="text-terminal-accent font-bold">Setup</div>
              <div className="text-terminal-muted">
                {currentSignal.setup.setup} / {currentSignal.setup.direction} @ {formatNumber(currentSignal.setup.price, 2)}
              </div>
              <div className="text-terminal-muted line-clamp-2">{currentSignal.setup.description}</div>
            </div>
          )}

          {currentSignal.orderFlow && (
            <div className="mt-2 text-xs bg-black/50 p-2 rounded border border-terminal-positive/20">
              <div className="text-terminal-accent font-bold">Orderflow</div>
              <div className="text-terminal-muted mb-1">{currentSignal.orderFlow.currentImbalance}</div>
              <div className="h-3 rounded overflow-hidden border border-terminal-positive/20 bg-black/60 flex">
                <div
                  className="h-full bg-terminal-positive/70"
                  style={{ width: `${Math.max(0, Math.min(100, currentSignal.orderFlow.bullishRatio))}%` }}
                />
                <div
                  className="h-full bg-red-400/70"
                  style={{ width: `${Math.max(0, Math.min(100, currentSignal.orderFlow.bearishRatio))}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-terminal-muted font-mono">
                <span className="text-terminal-positive">Bull {formatNumber(currentSignal.orderFlow.bullishRatio, 1)}%</span>
                <span className="text-red-400">Bear {formatNumber(currentSignal.orderFlow.bearishRatio, 1)}%</span>
              </div>
            </div>
          )}

          {currentSignal.volatility && (
            <div className="mt-2 text-xs bg-black/50 p-2 rounded border border-terminal-positive/20">
              <div className="text-terminal-accent font-bold">Volatility</div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-terminal-muted">
                <div>ATR: <span className="text-terminal-positive">{formatNumber(currentSignal.volatility.atr, 2)}</span></div>
                <div>ATR %: <span className="text-terminal-positive">{formatNumber(currentSignal.volatility.atrPercent, 2)}%</span></div>
                <div>Band: <span className="text-terminal-accent">{formatNumber(currentSignal.volatility.bandWidth, 2)}</span></div>
                <div>Hist Vol: <span className="text-terminal-accent">{formatNumber(currentSignal.volatility.historicalVolatility, 2)}</span></div>
              </div>
            </div>
          )}

          {currentSignal.stopHunt && (
            <div className="mt-2 text-xs bg-black/50 p-2 rounded border border-terminal-positive/20">
              <div className="text-terminal-accent font-bold">Stop Hunt Zones</div>
              <div className="text-terminal-muted">Current: {formatNumber(currentSignal.stopHunt.currentPrice, 2)}</div>
              {currentSignal.stopHunt.zones.slice(0, 2).map((z, idx) => (
                <div key={`zone-${idx}`} className="text-terminal-muted">
                  {z.type} @ {formatNumber(z.price, 2)} {z.recentlyHunted ? "(hunted)" : ""}
                </div>
              ))}
            </div>
          )}

          {currentSignal.nextInsight && (
            <div className="mt-2 text-xs bg-black/50 p-2 rounded border border-terminal-positive/20">
              <div className="text-terminal-accent font-bold">Next Insight</div>
              <div className="text-terminal-muted">
                Bias: <span className={currentSignal.nextInsight.bias.toLowerCase().includes("bear") ? "text-red-400" : "text-terminal-positive"}>{currentSignal.nextInsight.bias}</span>
                {" | "}
                Score B{currentSignal.nextInsight.bullScore}/S{currentSignal.nextInsight.bearScore}
              </div>
              <div className="text-terminal-muted">
                RSI {formatNumber(currentSignal.nextInsight.rsi, 2)} | ATR {formatNumber(currentSignal.nextInsight.atr, 2)}
              </div>
              <div className="text-terminal-muted">
                S {formatNumber(currentSignal.nextInsight.support, 2)} / R {formatNumber(currentSignal.nextInsight.resistance, 2)}
              </div>
              <div className="text-terminal-muted">
                T↑ {formatNumber(currentSignal.nextInsight.targetUp, 2)} | T↓ {formatNumber(currentSignal.nextInsight.targetDown, 2)}
              </div>
              {currentSignal.nextInsight.signals.slice(0, 2).map((s, idx) => (
                <div key={`next-signal-${idx}`} className="text-terminal-muted">
                  • {s.name}: {s.direction}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Signals */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="text-xs font-bold text-terminal-accent tracking-wider mb-2">ALL SYMBOLS</div>

        <div className="space-y-2">
          {displaySignals.map((signal) => (
            <div
              key={signal.symbol}
              className="p-2 rounded border border-terminal-positive/20 bg-black/30 hover:border-terminal-positive/50 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-terminal-positive text-sm">
                  {signal.symbol}
                </span>
                <span
                  className={`text-xs font-bold ${
                    signal.direction === "BUY"
                      ? "text-terminal-positive"
                      : signal.direction === "SELL"
                        ? "text-terminal-negative"
                        : "text-terminal-accent"
                  }`}
                >
                  {signal.direction} ({signal.confidence}%)
                </span>
              </div>

              <div className="text-xs text-terminal-muted line-clamp-2">
                {signal.reasoning}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-terminal-positive/20 px-3 py-2 text-xs text-terminal-muted bg-black/70">
        Total Signals: {displaySignals.length}
      </div>
    </div>
  );
}
