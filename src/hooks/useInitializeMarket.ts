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

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initialize = async () => {
      addLog({
        timestamp: new Date().toISOString(),
        level: "info",
        message: "⟳ Connecting to RealMarketAPI...",
      });

      // Check API health
      const isHealthy = await checkHealth();
      setApiHealth(isHealthy ? "ok" : "degraded");

      if (!isHealthy) {
        addLog({
          timestamp: new Date().toISOString(),
          level: "warning",
          message: "⚠ API health check failed – feed may be degraded",
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
        });
      }

      // Seed initial prices from REST snapshot before WS stream updates arrive
      try {
        const prices = await fetchMarketPrices();
        if (prices.length > 0) {
          prices.forEach((price) => {
            updatePrice(price.SymbolCode, { ...price, LastUpdate: Date.now() });
          });
          addLog({
            timestamp: new Date().toISOString(),
            level: "success",
            message: `✓ Seeded prices for ${prices.length} symbols`,
          });
        } else {
          addLog({
            timestamp: new Date().toISOString(),
            level: "warning",
            message: "⚠ Market snapshot returned no rows",
          });
        }
      } catch (error) {
        console.error("Failed to seed market prices:", error);
      }

      addLog({
        timestamp: new Date().toISOString(),
        level: "success",
        message: "✓ Market initialized – WebSocket feeds starting",
      });
    };

    initialize();
  }, [setSymbols, updatePrice, setApiHealth, addLog]);
}
