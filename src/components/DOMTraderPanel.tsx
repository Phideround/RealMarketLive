"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMarketStore } from "@/store/market";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DOMRow {
  price: number;
  bidQty: number;
  askQty: number;
  tradeVol: number;
  isKeyLevel: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TICK = 0.25;
const HALF_LEVELS = 22;

// Snap a raw price to the nearest tick grid
function snapToTick(price: number): number {
  return Math.round(price / TICK) * TICK;
}

// ─── DOM builder (mock volumes, real price anchor) ───────────────────────────

function buildDOM(
  bid: number,
  ask: number,
  keyLevelPrices: Set<number>,
  prevRows?: DOMRow[]
): DOMRow[] {
  const mid = snapToTick((bid + ask) / 2);
  const rows: DOMRow[] = [];

  for (let i = HALF_LEVELS; i >= -HALF_LEVELS; i--) {
    const price = Math.round((mid + i * TICK) * 100) / 100;
    // A price is on the ask side if it's >= ask, bid side if <= bid
    const isAsk = price >= ask;
    const distRatio = Math.abs(i) / HALF_LEVELS;

    const base = Math.max(8, Math.round((1 - distRatio * 0.65) * 220));
    const jitter = Math.round((Math.random() - 0.5) * 40);
    const spike = Math.random() < 0.04 ? Math.round(Math.random() * 600 + 300) : 0;
    const qty = Math.max(1, base + jitter + spike);

    const prev = prevRows?.find((r) => r.price === price);
    const prevQty = isAsk ? (prev?.askQty ?? qty) : (prev?.bidQty ?? qty);
    const smoothQty = spike > 0 ? qty : Math.round(prevQty * 0.7 + qty * 0.3);

    const newPrint = Math.random() < 0.15 ? Math.floor(Math.random() * 80 + 5) : 0;
    const decayedVol = prev ? Math.round((prev.tradeVol ?? 0) * 0.82) : 0;
    rows.push({
      price,
      bidQty: isAsk ? 0 : smoothQty,
      askQty: isAsk ? smoothQty : 0,
      tradeVol: Math.min(999, decayedVol + newPrint),
      isKeyLevel: keyLevelPrices.has(price),
    });
  }
  return rows;
}

function getMaxQty(rows: DOMRow[]): number {
  return Math.max(...rows.map((r) => Math.max(r.bidQty, r.askQty)), 1);
}

function getMaxTradeVol(rows: DOMRow[]): number {
  return Math.max(...rows.map((r) => r.tradeVol), 1);
}

// Derive key levels from HistoryPrices (local HH/LL clusters)
function deriveKeyLevels(historyPrices: number[], bid: number, ask: number): Set<number> {
  if (historyPrices.length < 4) return new Set();
  const levels = new Set<number>();
  for (let i = 1; i < historyPrices.length - 1; i++) {
    const p = historyPrices[i];
    if (p > historyPrices[i - 1] && p > historyPrices[i + 1]) levels.add(snapToTick(p));
    if (p < historyPrices[i - 1] && p < historyPrices[i + 1]) levels.add(snapToTick(p));
  }
  // Only keep levels within the visible ladder range
  const mid = (bid + ask) / 2;
  const range = HALF_LEVELS * TICK;
  return new Set([...levels].filter((l) => Math.abs(l - mid) <= range));
}

// ─── Component ───────────────────────────────────────────────────────────────

interface DOMTraderPanelProps {
  symbol?: string;
}

export function DOMTraderPanel({ symbol = "XAUUSD" }: DOMTraderPanelProps) {
  const priceData = useMarketStore((s) => s.priceData[symbol]);

  // Real bid/ask from WS; fall back to sensible defaults until first message
  const liveBid = priceData?.Bid ?? priceData?.ClosePrice ?? 6982.0;
  const liveAsk = priceData?.Ask ?? (liveBid + 0.5);
  const spread = Math.round((liveAsk - liveBid) * 100) / 100;

  const historyPrices = priceData?.HistoryPrices ?? [];
  const keyLevelPrices = deriveKeyLevels(historyPrices, liveBid, liveAsk);

  const [rows, setRows] = useState<DOMRow[]>(() => buildDOM(liveBid, liveAsk, keyLevelPrices));
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevBidRef = useRef(liveBid);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLDivElement>(null);

  // Scroll current price into view
  const scrollToMid = useCallback(() => {
    if (currentRowRef.current && containerRef.current) {
      const container = containerRef.current;
      const row = currentRowRef.current;
      const offset = row.offsetTop - container.clientHeight / 2 + row.clientHeight / 2;
      container.scrollTop = offset;
    }
  }, []);

  // Rebuild ladder whenever bid/ask changes from WS
  useEffect(() => {
    const direction = liveBid > prevBidRef.current ? "up" : liveBid < prevBidRef.current ? "down" : null;
    setFlash(direction);
    prevBidRef.current = liveBid;
    setRows((prev) => buildDOM(liveBid, liveAsk, keyLevelPrices, prev));
    const t = setTimeout(scrollToMid, 50);
    return () => clearTimeout(t);
    // keyLevelPrices is derived inline — comparing by reference is fine here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveBid, liveAsk, scrollToMid]);

  // Animate mock volume fluctuations while real order book API isn't connected
  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) => buildDOM(liveBid, liveAsk, keyLevelPrices, prev));
    }, 280);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveBid, liveAsk]);

  // Initial scroll
  useEffect(() => {
    const t = setTimeout(scrollToMid, 100);
    return () => clearTimeout(t);
  }, [scrollToMid]);

  const mid = snapToTick((liveBid + liveAsk) / 2);
  const maxQty = getMaxQty(rows);
  const maxTradeVol = getMaxTradeVol(rows);
  const totalBid = rows.reduce((s, r) => s + r.bidQty, 0);
  const totalAsk = rows.reduce((s, r) => s + r.askQty, 0);
  const bidPct = Math.round((totalBid / (totalBid + totalAsk)) * 100);

  const bid = liveBid;
  const ask = liveAsk;

  return (
    <div className="flex h-full flex-col bg-black font-mono select-none overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-terminal-positive/25 px-2 py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-[0.2em] text-terminal-muted">DOM</span>
          <span className="text-[10px] font-bold text-terminal-positive">{symbol}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[9px]">
          <span className="text-[#00ccff]/80">B {bid.toFixed(2)}</span>
          <span className="text-terminal-muted/30">{spread.toFixed(2)}</span>
          <span className="text-[#ff6666]/80">A {ask.toFixed(2)}</span>
        </div>
      </div>

      {/* ── Column labels ───────────────────────────────────────── */}
      {/* Layout: [BID 36px] [PRICE flex] [ASK 36px] */}
      <div className="grid grid-cols-[36px_1fr_36px] border-b border-terminal-positive/15 px-1 py-[2px] text-[8px] uppercase tracking-wider text-terminal-muted/40 shrink-0">
        <span className="text-right pr-1 text-[#44ccff]/50">BID</span>
        <span className="text-center">PRICE</span>
        <span className="text-left pl-1 text-[#ff7777]/50">ASK</span>
      </div>

      {/* ── Price Ladder ─────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {rows.map((row) => {
          const isCurrent = row.price === mid;
          const isAsk = row.askQty > 0;
          const qty = isAsk ? row.askQty : row.bidQty;
          const barPct = Math.round((qty / maxQty) * 100);
          const isKey = row.isKeyLevel;

          return (
            <div
              key={row.price}
              ref={isCurrent ? currentRowRef : undefined}
              className="relative grid grid-cols-[36px_1fr_36px] items-center h-[17px]"
            >
              {/* Full-width volume bar as background — always fills LEFT to RIGHT */}
              <div
                className="absolute inset-y-0 left-0 transition-[width] duration-150 ease-out pointer-events-none"
                style={{
                  width: `${barPct}%`,
                  background: isCurrent
                    ? "rgba(0,255,65,0.18)"
                    : isAsk
                    ? "rgba(255,77,77,0.22)"
                    : isKey
                    ? "rgba(255,165,0,0.18)"
                    : "rgba(0,170,210,0.18)",
                }}
              />

              {/* Solid current-price highlight */}
              {isCurrent && (
                <div className="absolute inset-0 bg-terminal-positive/10 pointer-events-none" />
              )}

              {/* Left edge accent */}
              {isCurrent && (
                <div
                  className="absolute left-0 top-0 h-full w-[2px] pointer-events-none"
                  style={{ background: flash === "up" ? "#00FF41" : flash === "down" ? "#ff4d4d" : "#00FF41" }}
                />
              )}
              {isKey && !isCurrent && (
                <div className="absolute left-0 top-0 h-full w-[2px] bg-orange-400/50 pointer-events-none" />
              )}

              {/* BID qty — left column, right-aligned */}
              <div
                className={`relative text-right pr-1 text-[9px] tabular-nums z-10 ${
                  isCurrent
                    ? "text-terminal-positive font-bold"
                    : "text-[#44ccff]/75"
                }`}
              >
                {!isAsk ? (qty > 999 ? `${(qty / 1000).toFixed(1)}k` : qty) : ""}
              </div>

              {/* Price */}
              <div
                className={`relative text-center text-[9px] tabular-nums z-10 ${
                  isCurrent
                    ? "text-terminal-positive font-bold text-[10px]"
                    : isKey
                    ? "text-orange-400/90"
                    : isAsk
                    ? "text-[#ff9999]/60"
                    : "text-[#88ddff]/60"
                }`}
              >
                {row.price.toFixed(2)}
              </div>

              {/* Print / traded vol — bar fills left to right, same direction as depth bar */}
              <div className="relative h-full overflow-hidden">
                {row.tradeVol > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 transition-[width] duration-150 ease-out pointer-events-none"
                    style={{
                      width: `${Math.round((row.tradeVol / maxTradeVol) * 100)}%`,
                      background: isAsk
                        ? "rgba(255,100,100,0.35)"
                        : "rgba(0,180,220,0.35)",
                    }}
                  />
                )}
                {/* ASK qty — right column, left-aligned */}
                <div
                  className={`relative text-left pl-1 text-[9px] tabular-nums z-10 ${
                    isCurrent
                      ? "text-terminal-positive font-bold"
                      : "text-[#ff7777]/75"
                  }`}
                  style={{ lineHeight: "17px" }}
                >
                  {isAsk ? (qty > 999 ? `${(qty / 1000).toFixed(1)}k` : qty) : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Depth bar ───────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-terminal-positive/20 px-2 pt-1.5 pb-1">
        <div className="flex h-[5px] overflow-hidden rounded-[2px] bg-[#ff4d4d]/25">
          <div
            className="h-full bg-[#00ccff]/60 transition-[width] duration-300"
            style={{ width: `${bidPct}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[8px] text-terminal-muted/50">
          <span className="text-[#44ccff]/70">{bidPct}%</span>
          <span>depth</span>
          <span className="text-[#ff7777]/70">{100 - bidPct}%</span>
        </div>
      </div>

      {/* ── Totals ──────────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-2 border-t border-terminal-positive/15 text-[8px] text-terminal-muted/50">
        <div className="border-r border-terminal-positive/15 px-2 py-1 text-center">
          <span className="text-[#44ccff]/70">{(totalBid / 1000).toFixed(1)}k</span>
          <span className="ml-0.5">bid</span>
        </div>
        <div className="px-2 py-1 text-center">
          <span>{(totalAsk / 1000).toFixed(1)}k</span>
          <span className="ml-0.5 text-[#ff7777]/70">ask</span>
        </div>
      </div>
    </div>
  );
}
