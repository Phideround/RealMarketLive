"use client";

import { useEffect, useMemo, useState } from "react";
import { useMarketStore } from "@/store/market";
import { SIGNAL_REFRESH_MS, useSignalsStore } from "@/store/signals";
import { formatDate, formatNumber, formatTime } from "@/lib/api";

export function SignalPanel() {
  const { currentSymbol, symbols, setCurrentSymbol } = useMarketStore();
  const { signals } = useSignalsStore();
  const [showAnomalyDetails, setShowAnomalyDetails] = useState(false);
  const [showStopHuntDetails, setShowStopHuntDetails] = useState(false);
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());

  const displaySignals = useMemo(
    () =>
      symbols
        .map((symbolInfo) => signals[symbolInfo.symbolCode])
        .filter((signal): signal is typeof signals[string] => signal !== undefined),
    [signals, symbols]
  );

  const currentSignal = signals[currentSymbol];
  const visibleAnomalies = useMemo(
    () =>
      [...(currentSignal?.anomaly?.anomalies ?? [])].sort(
        (left, right) => Date.parse(right.openTime) - Date.parse(left.openTime)
      ),
    [currentSignal?.anomaly?.anomalies]
  );
  const visibleStopHuntZones = useMemo(
    () =>
      [...(currentSignal?.stopHunt?.zones ?? [])].sort((left, right) => {
        const rightTime = Date.parse(right.huntedAt ?? right.price.toString());
        const leftTime = Date.parse(left.huntedAt ?? left.price.toString());

        if (Number.isFinite(rightTime) && Number.isFinite(leftTime)) {
          return rightTime - leftTime;
        }

        if (left.recentlyHunted !== right.recentlyHunted) {
          return Number(right.recentlyHunted) - Number(left.recentlyHunted);
        }

        return right.price - left.price;
      }),
    [currentSignal?.stopHunt?.zones]
  );

  useEffect(() => {
    setShowAnomalyDetails(false);
    setShowStopHuntDetails(false);
  }, [currentSymbol]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCooldownNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const signalCooldownSeconds = useMemo(() => {
    if (!currentSignal?.timestamp) return null;
    const nextRefreshAt = Date.parse(currentSignal.timestamp) + SIGNAL_REFRESH_MS;
    if (!Number.isFinite(nextRefreshAt)) return null;
    return Math.max(0, Math.ceil((nextRefreshAt - cooldownNow) / 1000));
  }, [cooldownNow, currentSignal?.timestamp]);

  const formattedSignalUpdatedAt = useMemo(() => {
    if (!currentSignal?.timestamp) return "--";
    return `${formatDate(currentSignal.timestamp)} ${formatTime(currentSignal.timestamp)}`;
  }, [currentSignal?.timestamp]);

  const directionTone =
    currentSignal?.direction === "BUY"
      ? "text-terminal-positive"
      : currentSignal?.direction === "SELL"
        ? "text-terminal-negative"
        : "text-terminal-accent";

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded bg-black/40 border border-terminal-positive/20">
      <div className="sticky top-0 z-10 border-b border-terminal-positive/20 bg-black/70 px-3 py-2">
        <div className="text-xs font-bold tracking-wider text-terminal-accent">MARKET SIGNALS</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-terminal-muted">Focused Decision Stack</div>
      </div>

      <div className="border-b border-terminal-positive/20 bg-black/30 px-3 py-3">
        {currentSignal ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-terminal-accent">{currentSymbol}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-terminal-muted">
                  Updated {formattedSignalUpdatedAt}
                </div>
              </div>
              <div className={`text-lg font-bold font-mono ${directionTone}`}>{currentSignal.direction}</div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono xl:grid-cols-4">
              <div className="border border-terminal-positive/15 bg-black/40 px-2 py-1.5">
                <div className="text-terminal-muted">Confidence</div>
                <div className="mt-1 font-bold text-terminal-positive">{currentSignal.confidence}%</div>
              </div>
              <div className="border border-terminal-positive/15 bg-black/40 px-2 py-1.5">
                <div className="text-terminal-muted">Timeframe</div>
                <div className="mt-1 font-bold text-terminal-positive">{currentSignal.timeframe}</div>
              </div>
              <div className="border border-terminal-positive/15 bg-black/40 px-2 py-1.5">
                <div className="text-terminal-muted">Bias</div>
                <div className="mt-1 font-bold text-terminal-positive">
                  {currentSignal.nextInsight?.bias ?? currentSignal.setup?.direction ?? "Mixed"}
                </div>
              </div>
              <div className="border border-terminal-positive/15 bg-black/40 px-2 py-1.5">
                <div className="text-terminal-muted">Refresh</div>
                <div className="mt-1 font-bold text-terminal-positive">
                  {signalCooldownSeconds == null ? "--" : signalCooldownSeconds > 0 ? `${signalCooldownSeconds}s` : "Ready"}
                </div>
              </div>
            </div>

            {currentSignal.reasoning && (
              <div className="mt-3 rounded border border-terminal-positive/15 bg-black/50 px-2 py-2 text-[11px] leading-relaxed text-terminal-muted line-clamp-3">
                {currentSignal.reasoning}
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-2 text-[11px]">
              {currentSignal.confluence && (
                <div className="rounded border border-terminal-accent/25 bg-black/50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-terminal-accent">Confluence</div>
                    <div className="text-terminal-positive">{formatNumber(currentSignal.confluence.score, 0)}</div>
                  </div>
                  <div className="mt-1 text-terminal-muted">
                    {currentSignal.confluence.signal} | {currentSignal.confluence.strength}
                  </div>
                </div>
              )}

              {currentSignal.setup && (
                <div className="rounded border border-terminal-positive/20 bg-black/50 p-2">
                  <div className="font-bold text-terminal-accent">Setup</div>
                  <div className="mt-1 text-terminal-muted line-clamp-2">
                    {currentSignal.setup.setup} / {currentSignal.setup.direction} @ {formatNumber(currentSignal.setup.price, 2)}
                  </div>
                </div>
              )}

              {currentSignal.nextInsight && (
                <div className="rounded border border-terminal-positive/20 bg-black/50 p-2">
                  <div className="font-bold text-terminal-accent">Next Insight</div>
                  <div className="mt-1 text-terminal-muted">
                    Bias <span className={currentSignal.nextInsight.bias.toLowerCase().includes("bear") ? "text-red-400" : "text-terminal-positive"}>{currentSignal.nextInsight.bias}</span>
                    {" | "}
                    B{currentSignal.nextInsight.bullScore}/S{currentSignal.nextInsight.bearScore}
                  </div>
                  <div className="mt-1 text-terminal-muted">
                    UP {formatNumber(currentSignal.nextInsight.targetUp, 2)} | DN {formatNumber(currentSignal.nextInsight.targetDown, 2)}
                  </div>
                </div>
              )}

              {currentSignal.volatility && (
                <div className="rounded border border-terminal-positive/20 bg-black/50 p-2">
                  <div className="font-bold text-terminal-accent">Volatility</div>
                  <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-terminal-muted">
                    <div>ATR <span className="text-terminal-positive">{formatNumber(currentSignal.volatility.atr, 2)}</span></div>
                    <div>ATR% <span className="text-terminal-positive">{formatNumber(currentSignal.volatility.atrPercent, 2)}%</span></div>
                  </div>
                </div>
              )}

              {currentSignal.stopHunt && (
                <div className="rounded border border-terminal-positive/20 bg-black/50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-terminal-accent">Stop Hunt</div>
                    {visibleStopHuntZones.length > 0 ? (
                      <button
                        onClick={() => setShowStopHuntDetails((prev) => !prev)}
                        className="inline-flex h-7 w-7 items-center justify-center border border-terminal-positive/25 bg-black/60 text-terminal-positive transition-all hover:border-terminal-positive hover:bg-terminal-positive/10"
                        title={showStopHuntDetails ? "Hide stop hunt details" : "Show stop hunt details"}
                        aria-label={showStopHuntDetails ? "Hide stop hunt details" : "Show stop hunt details"}
                      >
                        {showStopHuntDetails ? (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M6 15l6-6 6 6" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                          </svg>
                        )}
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-1 text-terminal-muted">Current {formatNumber(currentSignal.stopHunt.currentPrice, 2)}</div>
                </div>
              )}

              {currentSignal.anomaly && (
                <div className="rounded border border-terminal-positive/20 bg-black/50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-terminal-accent">Anomaly</div>
                    <div className="flex items-center gap-2">
                      <div className={currentSignal.anomaly.hasAnomalies ? "text-red-400" : "text-terminal-positive"}>
                        {currentSignal.anomaly.hasAnomalies ? `${currentSignal.anomaly.anomalies.length} detected` : "None"}
                      </div>
                      {visibleAnomalies.length > 0 ? (
                        <button
                          onClick={() => setShowAnomalyDetails((prev) => !prev)}
                          className="inline-flex h-7 w-7 items-center justify-center border border-terminal-positive/25 bg-black/60 text-terminal-positive transition-all hover:border-terminal-positive hover:bg-terminal-positive/10"
                          title={showAnomalyDetails ? "Hide anomaly details" : "Show anomaly details"}
                          aria-label={showAnomalyDetails ? "Hide anomaly details" : "Show anomaly details"}
                        >
                          {showAnomalyDetails ? (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path d="M6 15l6-6 6 6" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path d="M12 5v14" />
                              <path d="M5 12h14" />
                            </svg>
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {currentSignal.manipulationRisk && (
                <div className="rounded border border-terminal-positive/20 bg-black/50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-terminal-accent">Manipulation Risk</div>
                    <div className={currentSignal.manipulationRisk.riskLevel.toLowerCase().includes("high") ? "text-red-400" : "text-terminal-positive"}>
                      {currentSignal.manipulationRisk.riskLevel} {formatNumber(currentSignal.manipulationRisk.riskScore, 0)}
                    </div>
                  </div>
                  <div className="mt-1 text-terminal-muted">
                    Wick/Body {formatNumber(currentSignal.manipulationRisk.avgWickToBodyRatio, 2)}x
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded border border-terminal-positive/15 bg-black/40 px-2 py-3 text-[11px] text-terminal-muted">
            Waiting for signal data...
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-terminal-accent">Coverage</div>
        <div className="space-y-2">
          {displaySignals.map((signal) => (
            <button
              key={signal.symbol}
              onClick={() => setCurrentSymbol(signal.symbol)}
              className={`w-full rounded border px-2 py-2 text-left transition-all ${
                signal.symbol === currentSymbol
                  ? "border-terminal-positive/60 bg-terminal-positive/10"
                  : "border-terminal-positive/20 bg-black/30 hover:border-terminal-positive/45"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-terminal-positive">{signal.symbol}</span>
                <span
                  className={`text-[11px] font-bold ${
                    signal.direction === "BUY"
                      ? "text-terminal-positive"
                      : signal.direction === "SELL"
                        ? "text-terminal-negative"
                        : "text-terminal-accent"
                  }`}
                >
                  {signal.direction} {signal.confidence}%
                </span>
              </div>
              <div className="mt-1 text-[11px] text-terminal-muted line-clamp-2">{signal.reasoning}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-terminal-positive/20 bg-black/70 px-3 py-2 text-xs text-terminal-muted">
        Total Signals: {displaySignals.length}
      </div>

      {showAnomalyDetails && visibleAnomalies.length > 0 ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-3 backdrop-blur-[2px]"
          onClick={() => setShowAnomalyDetails(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-hidden rounded border border-terminal-positive/35 bg-[#040404] shadow-[0_0_24px_rgba(0,255,65,0.14)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative border-b border-terminal-positive/20 bg-black/90 px-3 py-2 pr-24">
              <div>
                <div className="text-xs font-bold tracking-[0.18em] text-terminal-accent">ANOMALY DETAILS</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-terminal-muted">{currentSymbol} · {visibleAnomalies.length} events</div>
              </div>
              <button
                onClick={() => setShowAnomalyDetails(false)}
                className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded border border-red-400/80 bg-red-500/20 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-red-200 shadow-[0_0_12px_rgba(248,113,113,0.35)] transition-all hover:border-red-300 hover:bg-red-500/30"
                title="Close anomaly popup"
                aria-label="Close anomaly popup"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>
                <span>Close</span>
              </button>
            </div>

            <div className="max-h-[calc(80vh-4rem)] overflow-y-auto px-3 py-3 text-[10px]">
              <div className="space-y-2">
                {visibleAnomalies.map((anomaly, index) => (
                  <div key={`${anomaly.openTime}-${anomaly.type}-${index}`} className="rounded border border-terminal-positive/10 bg-black/35 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-red-400">{anomaly.type}</span>
                      <span className="text-terminal-muted">{formatDate(anomaly.openTime)} {formatTime(anomaly.openTime)}</span>
                    </div>
                    <div className="mt-1 text-terminal-muted">
                      Value {formatNumber(anomaly.value, 2)} / Threshold {formatNumber(anomaly.threshold, 2)}
                    </div>
                    <div className="mt-1 leading-relaxed text-terminal-muted/90">{anomaly.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showStopHuntDetails && visibleStopHuntZones.length > 0 ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-3 backdrop-blur-[2px]"
          onClick={() => setShowStopHuntDetails(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-hidden rounded border border-terminal-positive/35 bg-[#040404] shadow-[0_0_24px_rgba(0,255,65,0.14)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative border-b border-terminal-positive/20 bg-black/90 px-3 py-2 pr-24">
              <div>
                <div className="text-xs font-bold tracking-[0.18em] text-terminal-accent">STOP HUNT DETAILS</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-terminal-muted">{currentSymbol} · {visibleStopHuntZones.length} zones</div>
              </div>
              <button
                onClick={() => setShowStopHuntDetails(false)}
                className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded border border-red-400/80 bg-red-500/20 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-red-200 shadow-[0_0_12px_rgba(248,113,113,0.35)] transition-all hover:border-red-300 hover:bg-red-500/30"
                title="Close stop hunt popup"
                aria-label="Close stop hunt popup"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>
                <span>Close</span>
              </button>
            </div>

            <div className="max-h-[calc(80vh-4rem)] overflow-y-auto px-3 py-3 text-[10px]">
              <div className="mb-2 rounded border border-terminal-positive/10 bg-black/35 px-2.5 py-2 text-terminal-muted">
                Current Price <span className="text-terminal-positive">{formatNumber(currentSignal.stopHunt?.currentPrice ?? 0, 2)}</span>
              </div>
              <div className="space-y-2">
                {visibleStopHuntZones.map((zone, index) => (
                  <div key={`${zone.price}-${zone.type}-${index}`} className="rounded border border-terminal-positive/10 bg-black/35 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-bold ${zone.type.toLowerCase().includes("sell") ? "text-red-400" : "text-terminal-positive"}`}>{zone.type}</span>
                      <span className="text-terminal-muted">{formatNumber(zone.price, 2)}</span>
                    </div>
                    <div className="mt-1 text-terminal-muted/90">{zone.description}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-terminal-muted">
                      <span>Status: <span className={zone.recentlyHunted ? "text-red-400" : "text-terminal-positive"}>{zone.recentlyHunted ? "Hunted" : "Watching"}</span></span>
                      {zone.huntedAt ? <span>{formatDate(zone.huntedAt)} {formatTime(zone.huntedAt)}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
