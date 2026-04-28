import { create } from "zustand";

export interface Signal {
  symbol: string;
  timeframe: string;
  direction: "BUY" | "SELL" | "NEUTRAL";
  confidence: number; // 0-100
  timestamp: string;
  reasoning?: string;
  stopHunt?: {
    currentPrice: number;
    zones: Array<{
      price: number;
      type: string;
      description: string;
      recentlyHunted: boolean;
      huntedAt: string | null;
    }>;
  };
  orderFlow?: {
    currentImbalance: string;
    bullishRatio: number;
    bearishRatio: number;
  };
  volatility?: {
    openTime: string;
    atr: number;
    atrPercent: number;
    bandWidth: number;
    historicalVolatility: number;
  };
  confluence?: {
    signal: string;
    strength: string;
    score: number;
    reasons: string[];
    price: number;
    nearestSupport: number;
    nearestResistance: number;
  };
  setup?: {
    setup: string;
    direction: string;
    description: string;
    price: number;
    nearestSupport: number;
    nearestResistance: number;
  };
  nextInsight?: {
    bias: string;
    ema21: number;
    ema50: number;
    rsi: number;
    atr: number;
    volume: number;
    avgVolume: number;
    support: number;
    resistance: number;
    bullScore: number;
    bearScore: number;
    targetUp: number;
    targetDown: number;
    signals: Array<{
      name: string;
      direction: string;
    }>;
    price: number;
  };
}

interface SignalsStore {
  // Current signals
  signals: Record<string, Signal>;
  updateSignal: (symbol: string, signal: Signal) => void;
  getSignal: (symbol: string) => Signal | undefined;

  // Signal history
  signalHistory: Signal[];
  addToHistory: (signal: Signal) => void;
  maxHistorySize: number;
}

export const useSignalsStore = create<SignalsStore>((set, get) => ({
  signals: {},
  updateSignal: (symbol: string, signal: Signal) =>
    set((state) => ({
      signals: { ...state.signals, [symbol]: signal },
    })),
  getSignal: (symbol: string) => get().signals[symbol],

  signalHistory: [],
  addToHistory: (signal: Signal) =>
    set((state) => ({
      signalHistory: [signal, ...state.signalHistory].slice(
        0,
        state.maxHistorySize
      ),
    })),
  maxHistorySize: 50,
}));
