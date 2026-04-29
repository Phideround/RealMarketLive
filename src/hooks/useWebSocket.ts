"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMarketStore, PriceData, Candle } from "@/store/market";
import { useConnectionStore } from "@/store/connection";
import { useUIStore } from "@/store/ui";
import { useSignalsStore } from "@/store/signals";
import {
  ENDPOINTS,
  fetchInsightConfluence,
  fetchInsightNext,
  fetchInsightSetup,
  fetchOrderflowImbalance,
  fetchStopHuntZones,
  fetchVolatility,
} from "@/lib/api";
import { detectSignal } from "@/lib/signals";

interface WebSocketConfig {
  symbol: string;
  timeframe: string;
  type: "price" | "candles";
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
  const maxReconnectAttempts = 10;
  const reconnectDelay = 1000;
  const signalRefreshMs = 30_000;

  const {
    updatePrice,
    updateCandles,
  } = useMarketStore();
  const { setWsConnected, addLog, setLatency } = useConnectionStore();
  const { updateTickFrequency } = useConnectionStore();
  const { setHeatIntensity } = useUIStore();
  const { updateSignal } = useSignalsStore();

  const refreshIntegratedSignal = useCallback(async (symbol: string, timeframe: string, candleData: Candle[]) => {
    const key = `${symbol}-${timeframe}`;
    const now = Date.now();
    const last = signalFetchAtRef.current[key] ?? 0;

    if (signalInFlightRef.current[key]) return;
    if (now - last < signalRefreshMs) return;

    signalInFlightRef.current[key] = true;

    try {
      const [stopHunt, orderflow, confluence, volatility, setup, nextInsight] = await Promise.all([
        fetchStopHuntZones(symbol, timeframe),
        fetchOrderflowImbalance(symbol, timeframe),
        fetchInsightConfluence(symbol, timeframe),
        fetchVolatility(symbol, timeframe, 14),
        fetchInsightSetup(symbol, timeframe),
        fetchInsightNext(symbol, timeframe),
      ]);

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
      if (volatility) reasons.push(`ATR ${volatility.atrPercent.toFixed(2)}%`);
      if (nextInsight?.bias) reasons.push(`Bias ${nextInsight.bias} (B${nextInsight.bullScore}/S${nextInsight.bearScore})`);
      if (stopHunt?.zones?.length) {
        const hunted = stopHunt.zones.filter((z) => z.recentlyHunted).length;
        reasons.push(`Stop-hunt zones ${stopHunt.zones.length} (${hunted} hunted)`);
      }
      if (reasons.length === 0) reasons.push(fallback.reasoning);

      updateSignal(symbol, {
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
      });

      signalFetchAtRef.current[key] = Date.now();
    } catch (error) {
      console.error("Integrated signal fetch failed:", error);
      const fallback = detectSignal(candleData, timeframe);
      updateSignal(symbol, {
        symbol,
        timeframe,
        direction: fallback.direction,
        confidence: fallback.confidence,
        timestamp: new Date().toISOString(),
        reasoning: fallback.reasoning,
      });
      signalFetchAtRef.current[key] = Date.now();
    } finally {
      signalInFlightRef.current[key] = false;
    }
  }, [updateSignal]);

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
          : ENDPOINTS.candlesWS(config.symbol, config.timeframe);

      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log(`WebSocket connected for ${config.symbol} - ${config.type}`);
        setWsConnected(true);
        addLog({
          timestamp: new Date().toISOString(),
          level: "success",
          message: `✓ Connected to ${config.symbol} ${config.type} feed`,
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

            // Set heat intensity based on price change
            const change = ((priceData.ClosePrice - priceData.OpenPrice) / priceData.OpenPrice) * 100;
            const intensity = Math.min(Math.abs(change) / 2, 1);
            setHeatIntensity(config.symbol, intensity);
          } else if (config.type === "candles" && Array.isArray(data)) {
            const candleData = data as Candle[];
            updateCandles(config.symbol, candleData);

            void refreshIntegratedSignal(config.symbol, config.timeframe, candleData);
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
          });

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          addLog({
            timestamp: new Date().toISOString(),
            level: "error",
            message: `✗ Max reconnect attempts reached for ${config.symbol}`,
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
      });
    }
  }, [config, updatePrice, updateCandles, setWsConnected, addLog, setLatency, updateTickFrequency, setHeatIntensity, refreshIntegratedSignal]);

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
