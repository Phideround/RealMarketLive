"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMarketStore, PriceData, Candle } from "@/store/market";
import { useConnectionStore } from "@/store/connection";
import { SIGNAL_REFRESH_MS, useSignalsStore } from "@/store/signals";
import { useUIStore } from "@/store/ui";
import {
  ENDPOINTS,
  fetchAnomaly,
  fetchInsightConfluence,
  fetchInsightNext,
  fetchInsightSetup,
  fetchManipulationRisk,
  OrderflowImbalanceResponse,
  fetchStopHuntZones,
  fetchVolatility,
} from "@/lib/api";
import { detectSignal } from "@/lib/signals";

interface WebSocketConfig {
  symbol: string;
  timeframe: string;
  type: "price" | "candles" | "orderflow";
}

export function useWebSocket(config: WebSocketConfig | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const intentionalCloseRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const lastMessageAtRef = useRef<number>(0);
  const latencyEmaRef = useRef(35);
  const lastLatencyUiUpdateRef = useRef(0);
  const signalFetchAtRef = useRef<Record<string, number>>({});
  const signalInFlightRef = useRef<Record<string, boolean>>({});
  const orderflowByKeyRef = useRef<Record<string, OrderflowImbalanceResponse>>({});
  const streamBootLoggedRef = useRef<Record<string, boolean>>({});
  const signalBootLoggedRef = useRef<Record<string, boolean>>({});
  const maxReconnectAttempts = 10;
  const reconnectDelay = 1000;

  const {
    updatePrice,
    updateCandles,
    addTick,
  } = useMarketStore();
  const { setWsConnected, addLog, setLatency } = useConnectionStore();
  const { updateTickFrequency } = useConnectionStore();
  const { setHeatIntensity } = useUIStore();
  const { updateSignal, addToHistory } = useSignalsStore();

  const describeError = useCallback((error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Unknown error";
  }, []);

  const streamLabel = config ? `${config.symbol} ${config.timeframe} ${config.type}` : "unknown stream";

  const shouldStoreSignalHistory = useCallback((nextSignal: ReturnType<typeof useSignalsStore.getState>["signals"][string], previousSignal?: ReturnType<typeof useSignalsStore.getState>["signals"][string]) => {
    if (!previousSignal) return true;

    return (
      previousSignal.direction !== nextSignal.direction ||
      Math.abs(previousSignal.confidence - nextSignal.confidence) >= 3 ||
      previousSignal.reasoning !== nextSignal.reasoning ||
      previousSignal.orderFlow?.currentImbalance !== nextSignal.orderFlow?.currentImbalance ||
      previousSignal.manipulationRisk?.riskLevel !== nextSignal.manipulationRisk?.riskLevel ||
      previousSignal.anomaly?.hasAnomalies !== nextSignal.anomaly?.hasAnomalies
    );
  }, []);

  const refreshIntegratedSignal = useCallback(async (symbol: string, timeframe: string, candleData: Candle[]) => {
    const key = `${symbol}-${timeframe}`;
    const now = Date.now();
    const last = signalFetchAtRef.current[key] ?? 0;

    if (signalInFlightRef.current[key]) return;
    if (now - last < SIGNAL_REFRESH_MS) return;

    signalInFlightRef.current[key] = true;

    try {
      const [stopHunt, confluence, volatility, setup, nextInsight, anomaly, manipulationRisk] = await Promise.all([
        fetchStopHuntZones(symbol, timeframe),
        fetchInsightConfluence(symbol, timeframe),
        fetchVolatility(symbol, timeframe, 14),
        fetchInsightSetup(symbol, timeframe),
        fetchInsightNext(symbol, timeframe),
        fetchAnomaly(symbol, timeframe),
        fetchManipulationRisk(symbol, timeframe),
      ]);
      const orderflow = orderflowByKeyRef.current[key] ?? null;

      const fallback = detectSignal(candleData, timeframe);

      const mappedDirection = (() => {
        const source = (confluence?.signal ?? setup?.direction ?? nextInsight?.bias ?? "").toLowerCase();
        if (source.includes("buy") || source.includes("bull")) return "BUY" as const;
        if (source.includes("sell") || source.includes("bear")) return "SELL" as const;
        return fallback.direction;
      })();

      const confidence = confluence?.score != null ? Math.round(confluence.score) : fallback.confidence;

      const reasons: string[] = [];
      if (confluence?.strength) reasons.push(`Confluence ${confluence.strength} (${confidence})`);
      if (setup?.setup) reasons.push(`Setup ${setup.setup} ${setup.direction}`);
      if (orderflow?.currentImbalance) reasons.push(`Orderflow ${orderflow.currentImbalance}`);
      if (anomaly?.hasAnomalies) reasons.push(`Anomalies ${anomaly.anomalies.length}`);
      if (manipulationRisk?.riskLevel) reasons.push(`Manipulation ${manipulationRisk.riskLevel} (${Math.round(manipulationRisk.riskScore)})`);
      if (volatility) reasons.push(`ATR ${volatility.atrPercent.toFixed(2)}%`);
      if (nextInsight?.bias) reasons.push(`Bias ${nextInsight.bias} (B${nextInsight.bullScore}/S${nextInsight.bearScore})`);
      if (stopHunt?.zones?.length) {
        const hunted = stopHunt.zones.filter((z) => z.recentlyHunted).length;
        reasons.push(`Stop-hunt zones ${stopHunt.zones.length} (${hunted} hunted)`);
      }
      if (reasons.length === 0) reasons.push(fallback.reasoning);

      const nextSignal = {
        symbol,
        timeframe,
        direction: mappedDirection,
        confidence: Math.max(0, Math.min(100, confidence)),
        timestamp: new Date().toISOString(),
        reasoning: reasons.join(" | "),
        stopHunt: stopHunt
          ? {
              currentPrice: stopHunt.currentPrice,
              zones: stopHunt.zones,
            }
          : undefined,
        orderFlow: orderflow
          ? {
              currentImbalance: orderflow.currentImbalance,
              bullishRatio: orderflow.bullishRatio,
              bearishRatio: orderflow.bearishRatio,
            }
          : undefined,
        anomaly: anomaly
          ? {
              hasAnomalies: anomaly.hasAnomalies,
              anomalies: anomaly.anomalies,
            }
          : undefined,
        manipulationRisk: manipulationRisk
          ? {
              riskLevel: manipulationRisk.riskLevel,
              riskScore: manipulationRisk.riskScore,
              factors: manipulationRisk.factors,
              avgWickToBodyRatio: manipulationRisk.avgWickToBodyRatio,
              currentVolume: manipulationRisk.currentVolume,
              avgVolume: manipulationRisk.avgVolume,
            }
          : undefined,
        volatility: volatility
          ? {
              openTime: volatility.openTime,
              atr: volatility.atr,
              atrPercent: volatility.atrPercent,
              bandWidth: volatility.bandWidth,
              historicalVolatility: volatility.historicalVolatility,
            }
          : undefined,
        confluence: confluence
          ? {
              signal: confluence.signal,
              strength: confluence.strength,
              score: confluence.score,
              reasons: confluence.reasons,
              price: confluence.price,
              nearestSupport: confluence.nearestSupport,
              nearestResistance: confluence.nearestResistance,
            }
          : undefined,
        setup: setup
          ? {
              setup: setup.setup,
              direction: setup.direction,
              description: setup.description,
              price: setup.price,
              nearestSupport: setup.nearestSupport,
              nearestResistance: setup.nearestResistance,
            }
          : undefined,
        nextInsight: nextInsight
          ? {
              bias: nextInsight.bias,
              ema21: nextInsight.ema21,
              ema50: nextInsight.ema50,
              rsi: nextInsight.rsi,
              atr: nextInsight.atr,
              volume: nextInsight.volume,
              avgVolume: nextInsight.avgVolume,
              support: nextInsight.support,
              resistance: nextInsight.resistance,
              bullScore: nextInsight.bullScore,
              bearScore: nextInsight.bearScore,
              targetUp: nextInsight.targetUp,
              targetDown: nextInsight.targetDown,
              signals: nextInsight.signals,
              price: nextInsight.price,
            }
          : undefined,
      };

      const previousSignal = useSignalsStore.getState().signals[symbol];
      updateSignal(symbol, nextSignal);
      if (shouldStoreSignalHistory(nextSignal, previousSignal)) {
        addToHistory(nextSignal);
      }

      if (!signalBootLoggedRef.current[key]) {
        signalBootLoggedRef.current[key] = true;
        addLog({
          timestamp: new Date().toISOString(),
          level: "success",
          message: `✓ Signal stack ready for ${symbol}`,
          details: `Timeframe ${timeframe} | Direction ${mappedDirection} ${Math.max(0, Math.min(100, confidence))}% | Sources: confluence ${confluence ? "yes" : "no"}, setup ${setup ? "yes" : "no"}, next ${nextInsight ? "yes" : "no"}, orderflow ${orderflow ? "yes" : "no"}, anomaly ${anomaly ? "yes" : "no"}, manipulation ${manipulationRisk ? "yes" : "no"}`,
        });
      }

      signalFetchAtRef.current[key] = Date.now();
    } catch (error) {
      console.error("Integrated signal fetch failed:", error);
      const fallback = detectSignal(candleData, timeframe);
      const fallbackSignal = {
        symbol,
        timeframe,
        direction: fallback.direction,
        confidence: fallback.confidence,
        timestamp: new Date().toISOString(),
        reasoning: fallback.reasoning,
      };
      const previousSignal = useSignalsStore.getState().signals[symbol];
      updateSignal(symbol, fallbackSignal);
      if (shouldStoreSignalHistory(fallbackSignal, previousSignal)) {
        addToHistory(fallbackSignal);
      }
      addLog({
        timestamp: new Date().toISOString(),
        level: "warning",
        message: `⚠ Signal refresh fallback for ${symbol}`,
        details: `Timeframe ${timeframe} | Using local candle-derived signal only | Cause: ${describeError(error)}`,
      });
      signalFetchAtRef.current[key] = Date.now();
    } finally {
      signalInFlightRef.current[key] = false;
    }
  }, [addLog, addToHistory, describeError, shouldStoreSignalHistory, updateSignal]);

  const connect = useCallback(() => {
    if (!config) return;

    try {
      // Close any previous socket before opening a new one (symbol/timeframe switch)
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        intentionalCloseRef.current = true;
        wsRef.current.close();
      }

      const url =
        config.type === "price"
          ? ENDPOINTS.priceWS(config.symbol, config.timeframe)
          : config.type === "candles"
            ? ENDPOINTS.candlesWS(config.symbol, config.timeframe)
            : ENDPOINTS.orderflowImbalanceWS(config.symbol, config.timeframe);

      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log(`WebSocket connected for ${config.symbol} - ${config.type}`);
        setWsConnected(true);
        addLog({
          timestamp: new Date().toISOString(),
          level: "success",
          message: `✓ Connected to ${config.symbol} ${config.type} feed`,
          details: `Timeframe ${config.timeframe} | Reconnect attempt reset | Transport ${url.replace(/\?.*$/, "")}`,
        });
        reconnectAttemptsRef.current = 0;

        // Start heartbeat
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Smooth and throttle display latency so the header stays readable.
          {
            const now = Date.now();
            const rawTime =
              data?.LastUpdate ??
              data?.lastUpdate ??
              data?.timestamp ??
              data?.Timestamp ??
              data?.OpenTime ??
              data?.openTime;

            const parsedTime =
              typeof rawTime === "number"
                ? rawTime
                : typeof rawTime === "string"
                  ? Date.parse(rawTime)
                  : NaN;

            let measuredLatency = 0;

            if (Number.isFinite(parsedTime)) {
              measuredLatency = now - parsedTime;
            } else if (lastMessageAtRef.current > 0) {
              measuredLatency = now - lastMessageAtRef.current;
            }

            if (measuredLatency > 0) {
              const bounded = Math.max(8, Math.min(320, measuredLatency));
              const alpha = 0.12;
              latencyEmaRef.current = latencyEmaRef.current * (1 - alpha) + bounded * alpha;

              // Update UI at most once every 1.2s to avoid jitter.
              if (now - lastLatencyUiUpdateRef.current >= 1200) {
                setLatency(Math.round(latencyEmaRef.current));
                lastLatencyUiUpdateRef.current = now;
              }
            }

            lastMessageAtRef.current = now;
          }

          updateTickFrequency();

          if (config.type === "price" && data.SymbolCode) {
            const priceData = data as PriceData;
            updatePrice(config.symbol, priceData);

            const bootKey = `${config.symbol}-${config.timeframe}-${config.type}`;
            if (!streamBootLoggedRef.current[bootKey]) {
              streamBootLoggedRef.current[bootKey] = true;
              addLog({
                timestamp: new Date().toISOString(),
                level: "info",
                message: `• First live price payload for ${config.symbol}`,
                details: `Close ${priceData.ClosePrice} | Bid ${priceData.Bid} | Ask ${priceData.Ask} | Volume ${priceData.Volume} | HistoryPrices ${priceData.HistoryPrices?.length ?? 0} | HistoryVolumes ${priceData.HistoryVolumes?.length ?? 0}`,
              });
            }

            const change = ((priceData.ClosePrice - priceData.OpenPrice) / (priceData.OpenPrice || 1)) * 100;
            addTick({
              symbol: config.symbol,
              price: priceData.ClosePrice,
              change,
              direction: change >= 0 ? "up" : "down",
              timestamp: new Date().toISOString(),
            });

            // Set heat intensity based on price change
            const intensity = Math.min(Math.abs(change) / 2, 1);
            setHeatIntensity(config.symbol, intensity);
          } else if (config.type === "candles" && Array.isArray(data)) {
            const candleData = data as Candle[];
            updateCandles(config.symbol, candleData);

            const bootKey = `${config.symbol}-${config.timeframe}-${config.type}`;
            if (!streamBootLoggedRef.current[bootKey]) {
              streamBootLoggedRef.current[bootKey] = true;
              const latest = candleData[0];
              addLog({
                timestamp: new Date().toISOString(),
                level: "info",
                message: `• First candle batch for ${config.symbol}`,
                details: `Timeframe ${config.timeframe} | Candles ${candleData.length} | Latest ${latest?.OpenTime ?? "n/a"} O:${latest?.OpenPrice ?? 0} H:${latest?.HighPrice ?? 0} L:${latest?.LowPrice ?? 0} C:${latest?.ClosePrice ?? 0}`,
              });
            }

            void refreshIntegratedSignal(config.symbol, config.timeframe, candleData);
          } else if (config.type === "orderflow") {
            const payload = (data?.data ?? data) as Partial<OrderflowImbalanceResponse>;
            if (payload && payload.currentImbalance) {
              const key = `${config.symbol}-${config.timeframe}`;
              const normalized: OrderflowImbalanceResponse = {
                symbolCode: String(payload.symbolCode ?? config.symbol),
                timeFrame: String(payload.timeFrame ?? config.timeframe),
                calculatedAt: String(payload.calculatedAt ?? new Date().toISOString()),
                currentImbalance: String(payload.currentImbalance ?? "Neutral"),
                bullishRatio: Number(payload.bullishRatio ?? 50),
                bearishRatio: Number(payload.bearishRatio ?? 50),
                recentImbalanceZones: Array.isArray(payload.recentImbalanceZones)
                  ? payload.recentImbalanceZones.map((z) => ({
                      openTime: String(z.openTime ?? new Date().toISOString()),
                      open: Number(z.open ?? 0),
                      close: Number(z.close ?? 0),
                      direction: String(z.direction ?? "Neutral"),
                      bodyMultiplier: Number(z.bodyMultiplier ?? 0),
                      volume: Number(z.volume ?? 0),
                    }))
                  : [],
              };

              orderflowByKeyRef.current[key] = normalized;

              const bootKey = `${config.symbol}-${config.timeframe}-${config.type}`;
              if (!streamBootLoggedRef.current[bootKey]) {
                streamBootLoggedRef.current[bootKey] = true;
                addLog({
                  timestamp: new Date().toISOString(),
                  level: "info",
                  message: `• First orderflow snapshot for ${config.symbol}`,
                  details: `Timeframe ${config.timeframe} | Imbalance ${normalized.currentImbalance} | Bull ${normalized.bullishRatio.toFixed(1)}% | Bear ${normalized.bearishRatio.toFixed(1)}% | Zones ${normalized.recentImbalanceZones.length}`,
                });
              }

              const existingSignal = useSignalsStore.getState().signals[config.symbol];
              if (existingSignal) {
                updateSignal(config.symbol, {
                  ...existingSignal,
                  orderFlow: {
                    currentImbalance: normalized.currentImbalance,
                    bullishRatio: normalized.bullishRatio,
                    bearishRatio: normalized.bearishRatio,
                  },
                });
              }
            }
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onerror = (error) => {
        const readyState = wsRef.current?.readyState ?? -1;
        const readyStateText = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][readyState] || "UNKNOWN";
        console.error(`WebSocket error (state: ${readyStateText}):`, error);
        addLog({
          timestamp: new Date().toISOString(),
          level: "error",
          message: `✗ WebSocket error for ${config.symbol} (${readyStateText})`,
          details: `Stream ${streamLabel} | Cause: ${describeError(error)}`,
        });
        setWsConnected(false);
      };

      wsRef.current.onclose = () => {
        console.log(`WebSocket closed for ${config.symbol}`);
        setWsConnected(false);

        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // User/navigation initiated close should not auto-reconnect
        if (intentionalCloseRef.current) {
          intentionalCloseRef.current = false;
          return;
        }

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = reconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current - 1);

          addLog({
            timestamp: new Date().toISOString(),
            level: "warning",
            message: `⟳ Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
            details: `Stream ${streamLabel} | Backoff ${Math.round(delay)}ms`,
          });

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          addLog({
            timestamp: new Date().toISOString(),
            level: "error",
            message: `✗ Max reconnect attempts reached for ${config.symbol}`,
            details: `Stream ${streamLabel} | Automatic reconnect halted after ${maxReconnectAttempts} attempts`,
          });
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      setWsConnected(false);
      addLog({
        timestamp: new Date().toISOString(),
        level: "error",
        message: `✗ Failed to connect to ${config.symbol}`,
        details: `Stream ${streamLabel} | Cause: ${describeError(error)}`,
      });
    }
  }, [config, updatePrice, updateCandles, addTick, setWsConnected, addLog, setLatency, updateTickFrequency, setHeatIntensity, refreshIntegratedSignal, updateSignal, describeError, streamLabel]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        intentionalCloseRef.current = true;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return wsRef.current;
}
