import { create } from "zustand";

export interface SymbolInfo {
  symbolCode: string;
  displayName: string;
  marketClass: string;
}

export interface PriceData {
  SymbolCode: string;
  OpenPrice: number;
  ClosePrice: number;
  HighPrice: number;
  LowPrice: number;
  Bid: number;
  Ask: number;
  Volume: number;
  OpenTime: string;
  HistoryVolumes?: number[];
  HistoryPrices?: number[];
  HourlyChangePercent?: number;
  DailyChangePercent?: number;
  LastUpdate?: number;
}

export interface Candle {
  SymbolCode: string;
  OpenPrice: number;
  ClosePrice: number;
  HighPrice: number;
  LowPrice: number;
  Volume: number;
  OpenTime: string;
}

export interface TickEntry {
  symbol: string;
  price: number;
  change: number;
  direction: "up" | "down";
  timestamp: string;
}

interface MarketStore {
  // Current symbol
  currentSymbol: string;
  setCurrentSymbol: (symbol: string) => void;

  // Price data
  priceData: Record<string, PriceData>;
  updatePrice: (symbol: string, price: PriceData) => void;

  // Candles
  candles: Record<string, Candle[]>;
  updateCandles: (symbol: string, candles: Candle[]) => void;

  // Available symbols
  symbols: SymbolInfo[];
  setSymbols: (symbols: SymbolInfo[]) => void;

  // Timeframe
  currentTimeframe: string;
  setCurrentTimeframe: (timeframe: string) => void;

  // Tick stream
  tickHistory: TickEntry[];
  addTick: (tick: TickEntry) => void;
}

export const useMarketStore = create<MarketStore>((set) => ({
  currentSymbol: "XAUUSD",
  setCurrentSymbol: (symbol: string) => set({ currentSymbol: symbol }),

  priceData: {},
  updatePrice: (symbol: string, price: PriceData) =>
    set((state) => ({
      priceData: {
        ...state.priceData,
        [symbol]: (() => {
          const previous = state.priceData[symbol];
          if (!previous) return price;

          const nextVolume =
            Number.isFinite(price.Volume) && price.Volume > 0
              ? price.Volume
              : previous.Volume;

          return {
            ...previous,
            ...price,
            Volume: nextVolume,
            HistoryVolumes:
              Array.isArray(price.HistoryVolumes) && price.HistoryVolumes.length > 0
                ? price.HistoryVolumes
                : previous.HistoryVolumes,
            HistoryPrices:
              Array.isArray(price.HistoryPrices) && price.HistoryPrices.length > 0
                ? price.HistoryPrices
                : previous.HistoryPrices,
            HourlyChangePercent:
              price.HourlyChangePercent != null ? price.HourlyChangePercent : previous.HourlyChangePercent,
            DailyChangePercent:
              price.DailyChangePercent != null ? price.DailyChangePercent : previous.DailyChangePercent,
          };
        })(),
      },
    })),

  candles: {},
  updateCandles: (symbol: string, candles: Candle[]) =>
    set((state) => ({
      candles: { ...state.candles, [symbol]: candles },
    })),

  symbols: [],
  setSymbols: (symbols: SymbolInfo[]) => set({ symbols }),

  currentTimeframe: "H1",
  setCurrentTimeframe: (timeframe: string) => set({ currentTimeframe: timeframe }),

  tickHistory: [],
  addTick: (tick: TickEntry) =>
    set((state) => ({
      tickHistory: [tick, ...state.tickHistory].slice(0, 300),
    })),
}));
