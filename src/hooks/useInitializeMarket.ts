"use client";

import { useEffect, useRef } from "react";
import { useMarketStore, SymbolInfo } from "@/store/market";
import { useConnectionStore } from "@/store/connection";
import { fetchSymbols, checkHealth, fetchMarketPrices } from "@/lib/api";

const FALLBACK_SYMBOLS: SymbolInfo[] = [
  { symbolCode: "XAUUSD", displayName: "Gold/USD", marketClass: "Commodity" },
  { symbolCode: "EURUSD", displayName: "Euro / US Dollar", marketClass: "Forex" },
  { symbolCode: "GBPUSD", displayName: "British Pound / US Dollar", marketClass: "Forex" },
  { symbolCode: "BTCUSD", displayName: "Bitcoin/USD", marketClass: "Crypto" },
  { symbolCode: "ETHUSD", displayName: "Ethereum/USD", marketClass: "Crypto" },
  { symbolCode: "AAPL",   displayName: "Apple Inc.", marketClass: "Stock" },
];

export function useInitializeMarket() {
  const { setSymbols, updatePrice } = useMarketStore();
  const { setApiHealth, addLog } = useConnectionStore();
  const initRef = useRef(false);

  const summarizeError = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return "Unknown error";
  };

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initialize = async () => {
      addLog({
        timestamp: new Date().toISOString(),
        level: "info",
        message: "⟳ Connecting to RealMarketAPI...",
        details: "Boot sequence: health check, symbol load, REST snapshot seed, then live WebSocket handoff.",
      });

      // Check API health
      const isHealthy = await checkHealth();
      setApiHealth(isHealthy ? "ok" : "degraded");

      if (!isHealthy) {
        addLog({
          timestamp: new Date().toISOString(),
          level: "warning",
          message: "⚠ API health check failed – feed may be degraded",
          details: "Health endpoint returned degraded status. REST snapshots may still load, but live metrics can lag.",
        });
      }

      // Fetch available symbols
      try {
        const symbols = await fetchSymbols();
        if (symbols.length > 0) {
          const priority = ["XAUUSD", "BTCUSD"];
          const prioritized = [
            ...symbols.filter((s) => priority.includes(s.symbolCode)),
            ...symbols.filter((s) => !priority.includes(s.symbolCode)),
          ];
          setSymbols(prioritized);
          addLog({
            timestamp: new Date().toISOString(),
            level: "success",
            message: `✓ Loaded ${symbols.length} symbols (XAUUSD/BTCUSD prioritized)`,
            details: `Classes: ${Array.from(new Set(symbols.map((s) => s.marketClass))).join(", ")} | Head: ${prioritized.slice(0, 6).map((s) => s.symbolCode).join(", ")}`,
          });
        } else {
          throw new Error("Empty symbol list returned");
        }
      } catch (error) {
        console.error("Failed to fetch symbols:", error);
        setSymbols(FALLBACK_SYMBOLS);
        addLog({
          timestamp: new Date().toISOString(),
          level: "warning",
          message: "⚠ Using default symbol list (fetch failed)",
          details: `Fallback count ${FALLBACK_SYMBOLS.length} | Cause: ${summarizeError(error)}`,
        });
      }

      // Seed initial prices from REST snapshot before WS stream updates arrive
      try {
        const prices = await fetchMarketPrices();
        if (prices.length > 0) {
          const withHistoryPrices = prices.filter((price) => Array.isArray(price.HistoryPrices) && price.HistoryPrices.length > 0).length;
          const withHistoryVolumes = prices.filter((price) => Array.isArray(price.HistoryVolumes) && price.HistoryVolumes.length > 0).length;
          prices.forEach((price) => {
            updatePrice(price.SymbolCode, { ...price, LastUpdate: Date.now() });
          });
          addLog({
            timestamp: new Date().toISOString(),
            level: "success",
            message: `✓ Seeded prices for ${prices.length} symbols`,
            details: `HistoryPrices ${withHistoryPrices}/${prices.length} | HistoryVolumes ${withHistoryVolumes}/${prices.length} | Head: ${prices.slice(0, 5).map((price) => `${price.SymbolCode} ${price.ClosePrice}`).join(" | ")}`,
          });
        } else {
          addLog({
            timestamp: new Date().toISOString(),
            level: "warning",
            message: "⚠ Market snapshot returned no rows",
            details: "REST market price endpoint responded successfully but returned an empty array.",
          });
        }
      } catch (error) {
        console.error("Failed to seed market prices:", error);
        addLog({
          timestamp: new Date().toISOString(),
          level: "error",
          message: "✗ Failed to seed market snapshot",
          details: summarizeError(error),
        });
      }

      addLog({
        timestamp: new Date().toISOString(),
        level: "success",
        message: "✓ Market initialized – WebSocket feeds starting",
        details: "Initial REST bootstrap completed. Live price, candle, and orderflow sockets can now replace snapshot state.",
      });
    };

    initialize();
  }, [setSymbols, updatePrice, setApiHealth, addLog]);
}
