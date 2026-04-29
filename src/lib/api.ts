// API Configuration
export const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "demo-key";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.realmarketapi.com";
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "wss://api.realmarketapi.com";

// API Endpoints
export const ENDPOINTS = {
  symbols: `${API_BASE_URL}/api/v1/symbol?apiKey=${API_KEY}`,
  health: `${API_BASE_URL}/api/v1/health`,
  marketPrice: `${API_BASE_URL}/api/v1/price/market?apiKey=${API_KEY}`,
  ema: (symbol: string, timeFrame: string, period: number) =>
    `${API_BASE_URL}/api/v1/indicator/ema?apiKey=${API_KEY}&SymbolCode=${symbol}&TimeFrame=${timeFrame}&Period=${period}`,
  bollingerBands: (symbol: string, timeFrame: string, period: number, multiplier: number) =>
    `${API_BASE_URL}/api/v1/indicator/bollinger-bands?apiKey=${API_KEY}&SymbolCode=${symbol}&TimeFrame=${timeFrame}&Period=${period}&Multiplier=${multiplier}`,
  sentiment: (symbol: string, timeFrame: string) =>
    `${API_BASE_URL}/api/v1/indicator/sentiment?apiKey=${API_KEY}&symbolCode=${symbol}&timeFrame=${timeFrame}`,
  stopHuntZones: (symbol: string, timeFrame: string) =>
    `${API_BASE_URL}/api/v1/stop-hunt/zones?apiKey=${API_KEY}&SymbolCode=${symbol}&TimeFrame=${timeFrame}`,
  orderflowImbalance: (symbol: string, timeFrame: string) =>
    `${API_BASE_URL}/api/v1/orderflow/imbalance?apiKey=${API_KEY}&SymbolCode=${symbol}&TimeFrame=${timeFrame}`,
  anomaly: (symbol: string, timeFrame: string) =>
    `${API_BASE_URL}/api/v1/anomaly?apiKey=${API_KEY}&SymbolCode=${symbol}&TimeFrame=${timeFrame}`,
  manipulationRisk: (symbol: string, timeFrame: string) =>
    `${API_BASE_URL}/api/v1/manipulation-risk?apiKey=${API_KEY}&SymbolCode=${symbol}&TimeFrame=${timeFrame}`,
  insightConfluence: (symbol: string, timeFrame: string) =>
    `${API_BASE_URL}/api/v1/insight/confluence?apiKey=${API_KEY}&SymbolCode=${symbol}&TimeFrame=${timeFrame}`,
  volatility: (symbol: string, timeFrame: string, period: number) =>
    `${API_BASE_URL}/api/v1/volatility?apiKey=${API_KEY}&symbolCode=${symbol}&timeFrame=${timeFrame}&period=${period}`,
  insightSetup: (symbol: string, timeFrame: string) =>
    `${API_BASE_URL}/api/v1/insight/setup?apiKey=${API_KEY}&SymbolCode=${symbol}&TimeFrame=${timeFrame}`,
  insightNext: (symbol: string, timeFrame: string) =>
    `${API_BASE_URL}/api/v1/insight/next?apiKey=${API_KEY}&SymbolCode=${symbol}&TimeFrame=${timeFrame}`,
  priceWS: (symbol: string, timeFrame: string) =>
    `${WS_BASE_URL}/price?apiKey=${API_KEY}&symbolCode=${symbol}&timeFrame=${timeFrame}`,
  candlesWS: (symbol: string, timeFrame: string) =>
    `${WS_BASE_URL}/candles?apiKey=${API_KEY}&symbolCode=${symbol}&timeFrame=${timeFrame}`,
  orderflowImbalanceWS: (symbol: string, timeFrame: string) =>
    `${WS_BASE_URL}/orderflow/imbalance?apiKey=${API_KEY}&symbolCode=${symbol}&timeFrame=${timeFrame}`,
};

export interface SentimentIndicator {
  symbolCode: string;
  timeFrame: string;
  calculatedAt: string;
  trend: string;
  sentiment: string;
  fearGreedScore: number;
  rsi: number;
  macdHistogram: number;
  ema50: number;
  ema100: number;
  currentClose: number;
}

export interface EmaPoint {
  openTime: string;
  value: number;
}

export interface BollingerBandPoint {
  openTime: string;
  upper: number;
  middle: number;
  lower: number;
}

export interface StopHuntZonesResponse {
  symbolCode: string;
  timeFrame: string;
  calculatedAt: string;
  currentPrice: number;
  zones: Array<{
    price: number;
    type: string;
    description: string;
    recentlyHunted: boolean;
    huntedAt: string | null;
  }>;
}

export interface OrderflowImbalanceResponse {
  symbolCode: string;
  timeFrame: string;
  calculatedAt: string;
  currentImbalance: string;
  bullishRatio: number;
  bearishRatio: number;
  recentImbalanceZones: Array<{
    openTime: string;
    open: number;
    close: number;
    direction: string;
    bodyMultiplier: number;
    volume: number;
  }>;
}

export interface InsightConfluenceResponse {
  symbolCode: string;
  timeFrame: string;
  calculatedAt: string;
  signal: string;
  strength: string;
  score: number;
  reasons: string[];
  rsi: number;
  ema21: number;
  ema50: number;
  price: number;
  nearestSupport: number;
  nearestResistance: number;
}

export interface AnomalyResponse {
  symbolCode: string;
  timeFrame: string;
  calculatedAt: string;
  hasAnomalies: boolean;
  anomalies: Array<{
    openTime: string;
    type: string;
    value: number;
    threshold: number;
    description: string;
  }>;
}

export interface ManipulationRiskResponse {
  symbolCode: string;
  timeFrame: string;
  calculatedAt: string;
  riskLevel: string;
  riskScore: number;
  factors: string[];
  avgWickToBodyRatio: number;
  currentVolume: number;
  avgVolume: number;
}

export interface InsightSetupResponse {
  symbolCode: string;
  timeFrame: string;
  calculatedAt: string;
  setup: string;
  direction: string;
  description: string;
  price: number;
  nearestSupport: number;
  nearestResistance: number;
}

export interface VolatilityPoint {
  openTime: string;
  atr: number;
  atrPercent: number;
  bandWidth: number;
  historicalVolatility: number;
}

export interface InsightNextResponse {
  symbolCode: string;
  timeFrame: string;
  calculatedAt: string;
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
}

// Fetch symbols list
export async function fetchSymbols(): Promise<import("@/store/market").SymbolInfo[]> {
  try {
    const response = await fetch(ENDPOINTS.symbols, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    const payload = json.data ?? json;
    if (!Array.isArray(payload)) return [];
    return payload.map((s: { symbolCode: string; displayName: string; marketClass: string }) => ({
      symbolCode: s.symbolCode,
      displayName: s.displayName,
      marketClass: s.marketClass,
    }));
  } catch (error) {
    console.error("Error fetching symbols:", error);
    return [];
  }
}

// Fetch all symbols' latest prices in one call
export async function fetchMarketPrices(): Promise<import("@/store/market").PriceData[]> {
  try {
    const response = await fetch(ENDPOINTS.marketPrice, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    const payload = json.data ?? json;
    if (!Array.isArray(payload)) return [];

    const mapped: Array<import("@/store/market").PriceData | null> = payload.map((row: any) => {
        const symbolCode = row.SymbolCode ?? row.symbolCode;
        const closePrice = row.ClosePrice ?? row.closePrice;
        const highPrice = row.HighPrice ?? row.highPrice;
        const lowPrice = row.LowPrice ?? row.lowPrice;
        const volume = row.Volume ?? row.volume ?? 0;

        if (!symbolCode || closePrice == null || highPrice == null || lowPrice == null) {
          return null;
        }

        const openPrice = row.OpenPrice ?? row.openPrice ?? closePrice;
        const bid = row.Bid ?? row.bid ?? closePrice;
        const ask = row.Ask ?? row.ask ?? closePrice;
        const openTime = row.OpenTime ?? row.openTime ?? new Date().toISOString();
        const historyVolumes = row.HistoryVolumes ?? row.historyVolumes;
        const historyPrices = row.HistoryPrices ?? row.historyPrices;
        const hourlyChangePercent = row.HourlyChangePercent ?? row.hourlyChangePercent;
        const dailyChangePercent = row.DailyChangePercent ?? row.dailyChangePercent;

        const normalized: import("@/store/market").PriceData = {
          SymbolCode: symbolCode,
          OpenPrice: Number(openPrice),
          ClosePrice: Number(closePrice),
          HighPrice: Number(highPrice),
          LowPrice: Number(lowPrice),
          Bid: Number(bid),
          Ask: Number(ask),
          Volume: Number(volume),
          OpenTime: openTime,
        };

        if (Array.isArray(historyVolumes)) {
          normalized.HistoryVolumes = historyVolumes
            .map((v: unknown) => Number(v))
            .filter((v: number) => Number.isFinite(v));
        }
        if (Array.isArray(historyPrices)) {
          normalized.HistoryPrices = historyPrices
            .map((v: unknown) => Number(v))
            .filter((v: number) => Number.isFinite(v));
        }
        if (hourlyChangePercent != null) {
          normalized.HourlyChangePercent = Number(hourlyChangePercent);
        }
        if (dailyChangePercent != null) {
          normalized.DailyChangePercent = Number(dailyChangePercent);
        }

        return normalized;
      });

    return mapped.filter((row): row is import("@/store/market").PriceData => row !== null);
  } catch (error) {
    console.error("Error fetching market prices:", error);
    return [];
  }
}

// Check API health
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(ENDPOINTS.health, {
      method: "GET",
    });

    if (!response.ok) {
      return false;
    }

    const json = await response.json();
    const payload = json.data ?? json;
    return payload.status === "Healthy";
  } catch (error) {
    console.error("Error checking health:", error);
    return false;
  }
}

export async function fetchSentimentIndicator(
  symbol: string,
  timeFrame: string
): Promise<SentimentIndicator | null> {
  try {
    const response = await fetch(ENDPOINTS.sentiment(symbol, timeFrame), {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    const payload = json.data ?? json;
    if (!payload || typeof payload !== "object") return null;

    return {
      symbolCode: payload.symbolCode ?? symbol,
      timeFrame: payload.timeFrame ?? timeFrame,
      calculatedAt: payload.calculatedAt ?? new Date().toISOString(),
      trend: payload.trend ?? "Unknown",
      sentiment: payload.sentiment ?? "Neutral",
      fearGreedScore: Number(payload.fearGreedScore ?? 50),
      rsi: Number(payload.rsi ?? 0),
      macdHistogram: Number(payload.macdHistogram ?? 0),
      ema50: Number(payload.ema50 ?? 0),
      ema100: Number(payload.ema100 ?? 0),
      currentClose: Number(payload.currentClose ?? 0),
    };
  } catch (error) {
    console.error("Error fetching sentiment indicator:", error);
    return null;
  }
}

export async function fetchEMAIndicator(
  symbol: string,
  timeFrame: string,
  period: number
): Promise<EmaPoint[]> {
  try {
    const response = await fetch(ENDPOINTS.ema(symbol, timeFrame, period), {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    const payload = json.data ?? json;
    if (!Array.isArray(payload)) return [];

    return payload
      .map((row: any) => ({
        openTime: String(row.openTime ?? row.OpenTime ?? ""),
        value: Number(row.value ?? row.Value),
      }))
      .filter((row: EmaPoint) => row.openTime.length > 0 && Number.isFinite(row.value));
  } catch (error) {
    console.error(`Error fetching EMA(${period}) indicator:`, error);
    return [];
  }
}

export async function fetchBollingerBands(
  symbol: string,
  timeFrame: string,
  period: number,
  multiplier: number
): Promise<BollingerBandPoint[]> {
  try {
    const response = await fetch(ENDPOINTS.bollingerBands(symbol, timeFrame, period, multiplier), {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    const payload = json.data ?? json;
    if (!Array.isArray(payload)) return [];

    return payload
      .map((row: any) => ({
        openTime: String(row.openTime ?? row.OpenTime ?? ""),
        upper: Number(row.upper ?? row.Upper),
        middle: Number(row.middle ?? row.Middle),
        lower: Number(row.lower ?? row.Lower),
      }))
      .filter(
        (row: BollingerBandPoint) =>
          row.openTime.length > 0 &&
          Number.isFinite(row.upper) &&
          Number.isFinite(row.middle) &&
          Number.isFinite(row.lower)
      );
  } catch (error) {
    console.error("Error fetching Bollinger Bands:", error);
    return [];
  }
}

export async function fetchStopHuntZones(
  symbol: string,
  timeFrame: string
): Promise<StopHuntZonesResponse | null> {
  try {
    const response = await fetch(ENDPOINTS.stopHuntZones(symbol, timeFrame), { method: "GET" });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const json = await response.json();
    const payload = json.data ?? json;
    if (!payload || typeof payload !== "object") return null;

    return {
      symbolCode: String(payload.symbolCode ?? symbol),
      timeFrame: String(payload.timeFrame ?? timeFrame),
      calculatedAt: String(payload.calculatedAt ?? new Date().toISOString()),
      currentPrice: Number(payload.currentPrice ?? 0),
      zones: Array.isArray(payload.zones)
        ? payload.zones.map((z: any) => ({
            price: Number(z.price ?? 0),
            type: String(z.type ?? "Unknown"),
            description: String(z.description ?? ""),
            recentlyHunted: Boolean(z.recentlyHunted),
            huntedAt: z.huntedAt ? String(z.huntedAt) : null,
          }))
        : [],
    };
  } catch (error) {
    console.error("Error fetching stop-hunt zones:", error);
    return null;
  }
}

export async function fetchOrderflowImbalance(
  symbol: string,
  timeFrame: string
): Promise<OrderflowImbalanceResponse | null> {
  try {
    const response = await fetch(ENDPOINTS.orderflowImbalance(symbol, timeFrame), { method: "GET" });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const json = await response.json();
    const payload = json.data ?? json;
    if (!payload || typeof payload !== "object") return null;

    return {
      symbolCode: String(payload.symbolCode ?? symbol),
      timeFrame: String(payload.timeFrame ?? timeFrame),
      calculatedAt: String(payload.calculatedAt ?? new Date().toISOString()),
      currentImbalance: String(payload.currentImbalance ?? "Neutral"),
      bullishRatio: Number(payload.bullishRatio ?? 50),
      bearishRatio: Number(payload.bearishRatio ?? 50),
      recentImbalanceZones: Array.isArray(payload.recentImbalanceZones)
        ? payload.recentImbalanceZones.map((z: any) => ({
            openTime: String(z.openTime ?? new Date().toISOString()),
            open: Number(z.open ?? 0),
            close: Number(z.close ?? 0),
            direction: String(z.direction ?? "Neutral"),
            bodyMultiplier: Number(z.bodyMultiplier ?? 0),
            volume: Number(z.volume ?? 0),
          }))
        : [],
    };
  } catch (error) {
    console.error("Error fetching orderflow imbalance:", error);
    return null;
  }
}

export async function fetchAnomaly(
  symbol: string,
  timeFrame: string
): Promise<AnomalyResponse | null> {
  try {
    const response = await fetch(ENDPOINTS.anomaly(symbol, timeFrame), { method: "GET" });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const json = await response.json();
    const payload = json.data ?? json;
    if (!payload || typeof payload !== "object") return null;

    return {
      symbolCode: String(payload.symbolCode ?? symbol),
      timeFrame: String(payload.timeFrame ?? timeFrame),
      calculatedAt: String(payload.calculatedAt ?? new Date().toISOString()),
      hasAnomalies: Boolean(payload.hasAnomalies),
      anomalies: Array.isArray(payload.anomalies)
        ? payload.anomalies.map((item: any) => ({
            openTime: String(item.openTime ?? new Date().toISOString()),
            type: String(item.type ?? "Unknown"),
            value: Number(item.value ?? 0),
            threshold: Number(item.threshold ?? 0),
            description: String(item.description ?? ""),
          }))
        : [],
    };
  } catch (error) {
    console.error("Error fetching anomaly:", error);
    return null;
  }
}

export async function fetchManipulationRisk(
  symbol: string,
  timeFrame: string
): Promise<ManipulationRiskResponse | null> {
  try {
    const response = await fetch(ENDPOINTS.manipulationRisk(symbol, timeFrame), { method: "GET" });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const json = await response.json();
    const payload = json.data ?? json;
    if (!payload || typeof payload !== "object") return null;

    return {
      symbolCode: String(payload.symbolCode ?? symbol),
      timeFrame: String(payload.timeFrame ?? timeFrame),
      calculatedAt: String(payload.calculatedAt ?? new Date().toISOString()),
      riskLevel: String(payload.riskLevel ?? "Unknown"),
      riskScore: Number(payload.riskScore ?? 0),
      factors: Array.isArray(payload.factors) ? payload.factors.map((factor: any) => String(factor)) : [],
      avgWickToBodyRatio: Number(payload.avgWickToBodyRatio ?? 0),
      currentVolume: Number(payload.currentVolume ?? 0),
      avgVolume: Number(payload.avgVolume ?? 0),
    };
  } catch (error) {
    console.error("Error fetching manipulation risk:", error);
    return null;
  }
}

export async function fetchInsightConfluence(
  symbol: string,
  timeFrame: string
): Promise<InsightConfluenceResponse | null> {
  try {
    const response = await fetch(ENDPOINTS.insightConfluence(symbol, timeFrame), { method: "GET" });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const json = await response.json();
    const payload = json.data ?? json;
    if (!payload || typeof payload !== "object") return null;

    return {
      symbolCode: String(payload.symbolCode ?? symbol),
      timeFrame: String(payload.timeFrame ?? timeFrame),
      calculatedAt: String(payload.calculatedAt ?? new Date().toISOString()),
      signal: String(payload.signal ?? "Neutral"),
      strength: String(payload.strength ?? "Moderate"),
      score: Number(payload.score ?? 50),
      reasons: Array.isArray(payload.reasons) ? payload.reasons.map((r: any) => String(r)) : [],
      rsi: Number(payload.rsi ?? 0),
      ema21: Number(payload.ema21 ?? 0),
      ema50: Number(payload.ema50 ?? 0),
      price: Number(payload.price ?? 0),
      nearestSupport: Number(payload.nearestSupport ?? 0),
      nearestResistance: Number(payload.nearestResistance ?? 0),
    };
  } catch (error) {
    console.error("Error fetching confluence insight:", error);
    return null;
  }
}

export async function fetchInsightSetup(
  symbol: string,
  timeFrame: string
): Promise<InsightSetupResponse | null> {
  try {
    const response = await fetch(ENDPOINTS.insightSetup(symbol, timeFrame), { method: "GET" });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const json = await response.json();
    const payload = json.data ?? json;
    if (!payload || typeof payload !== "object") return null;

    return {
      symbolCode: String(payload.symbolCode ?? symbol),
      timeFrame: String(payload.timeFrame ?? timeFrame),
      calculatedAt: String(payload.calculatedAt ?? new Date().toISOString()),
      setup: String(payload.setup ?? "Unknown"),
      direction: String(payload.direction ?? "Neutral"),
      description: String(payload.description ?? ""),
      price: Number(payload.price ?? 0),
      nearestSupport: Number(payload.nearestSupport ?? 0),
      nearestResistance: Number(payload.nearestResistance ?? 0),
    };
  } catch (error) {
    console.error("Error fetching setup insight:", error);
    return null;
  }
}

export async function fetchVolatility(
  symbol: string,
  timeFrame: string,
  period: number = 14
): Promise<VolatilityPoint | null> {
  try {
    const response = await fetch(ENDPOINTS.volatility(symbol, timeFrame, period), { method: "GET" });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const json = await response.json();
    const payload = json.data ?? json;
    if (!Array.isArray(payload) || payload.length === 0) return null;

    const latest = payload[0];
    return {
      openTime: String(latest.openTime ?? latest.OpenTime ?? new Date().toISOString()),
      atr: Number(latest.atr ?? latest.ATR ?? 0),
      atrPercent: Number(latest.atrPercent ?? latest.ATRPercent ?? 0),
      bandWidth: Number(latest.bandWidth ?? latest.BandWidth ?? 0),
      historicalVolatility: Number(latest.historicalVolatility ?? latest.HistoricalVolatility ?? 0),
    };
  } catch (error) {
    console.error("Error fetching volatility:", error);
    return null;
  }
}

export async function fetchInsightNext(
  symbol: string,
  timeFrame: string
): Promise<InsightNextResponse | null> {
  try {
    const response = await fetch(ENDPOINTS.insightNext(symbol, timeFrame), { method: "GET" });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const json = await response.json();
    const payload = json.data ?? json;
    if (!payload || typeof payload !== "object") return null;

    return {
      symbolCode: String(payload.symbolCode ?? symbol),
      timeFrame: String(payload.timeFrame ?? timeFrame),
      calculatedAt: String(payload.calculatedAt ?? new Date().toISOString()),
      bias: String(payload.bias ?? payload.trend ?? "Unknown"),
      ema21: Number(payload.ema21 ?? 0),
      ema50: Number(payload.ema50 ?? 0),
      rsi: Number(payload.rsi ?? 0),
      atr: Number(payload.atr ?? 0),
      volume: Number(payload.volume ?? 0),
      avgVolume: Number(payload.avgVolume ?? 0),
      support: Number(payload.support ?? payload.nearestSupport ?? 0),
      resistance: Number(payload.resistance ?? payload.nearestResistance ?? 0),
      bullScore: Number(payload.bullScore ?? 0),
      bearScore: Number(payload.bearScore ?? 0),
      targetUp: Number(payload.targetUp ?? 0),
      targetDown: Number(payload.targetDown ?? 0),
      signals: Array.isArray(payload.signals)
        ? payload.signals.map((s: any) => ({
            name: String(s.name ?? "Unknown"),
            direction: String(s.direction ?? "Neutral"),
          }))
        : [],
      price: Number(payload.price ?? 0),
    };
  } catch (error) {
    console.error("Error fetching next insight:", error);
    return null;
  }
}

// Calculate spread percentage
export function calculateSpread(bid: number, ask: number): number {
  if (bid === 0) return 0;
  return ((ask - bid) / bid) * 100;
}

// Calculate volatility (simplified - based on range)
export function calculateVolatility(high: number, low: number, close: number): number {
  if (close === 0) return 0;
  return ((high - low) / close) * 100;
}

// Format large numbers
export function formatNumber(num: number, decimals = 2): string {
  return num.toFixed(decimals);
}

// Format timestamp
export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

// Format date
export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US");
  } catch {
    return isoString;
  }
}

// Calculate percentage change
export function calculateChange(oldPrice: number, newPrice: number): number {
  if (oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

// Get direction based on price change
export function getDirection(change: number): "up" | "down" | "neutral" {
  if (change > 0.001) return "up";
  if (change < -0.001) return "down";
  return "neutral";
}
