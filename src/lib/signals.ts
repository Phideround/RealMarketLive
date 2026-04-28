import { Candle } from "@/store/market";

// Simple signal detection based on candle patterns
export function detectSignal(
  candles: Candle[],
  _timeframe: string
): { direction: "BUY" | "SELL" | "NEUTRAL"; confidence: number; reasoning: string } {
  if (candles.length < 2) {
    return {
      direction: "NEUTRAL",
      confidence: 0,
      reasoning: "Insufficient data",
    };
  }

  const current = candles[0];
  const previous = candles[1];

  let direction: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
  let confidence = 0;
  let reasoning = "";

  // Calculate body size and direction
  const currentBody = Math.abs(current.ClosePrice - current.OpenPrice);
  const previousBody = Math.abs(previous.ClosePrice - previous.OpenPrice);
  const currentCandle = current.ClosePrice > current.OpenPrice ? "bullish" : "bearish";

  // Trend analysis
  let upTrend = 0;
  let downTrend = 0;

  for (let i = 0; i < Math.min(5, candles.length); i++) {
    if (candles[i].ClosePrice > candles[i].OpenPrice) {
      upTrend++;
    } else {
      downTrend++;
    }
  }

  // Momentum check
  const momUp = candles.slice(0, 3).filter((c) => c.ClosePrice > c.OpenPrice).length;

  // Signal generation
  if (currentCandle === "bullish") {
    if (upTrend >= 3 && currentBody > previousBody * 0.8) {
      direction = "BUY";
      confidence = Math.min(75 + momUp * 10, 90);
      reasoning = "Strong uptrend with expanding body";
    } else if (upTrend >= 2) {
      direction = "BUY";
      confidence = 55 + Math.min(momUp * 15, 20);
      reasoning = "Mild bullish momentum";
    } else {
      direction = "NEUTRAL";
      confidence = 40;
      reasoning = "Mixed signals";
    }
  } else {
    if (downTrend >= 3 && currentBody > previousBody * 0.8) {
      direction = "SELL";
      confidence = Math.min(75 + (3 - momUp) * 10, 90);
      reasoning = "Strong downtrend with expanding body";
    } else if (downTrend >= 2) {
      direction = "SELL";
      confidence = 55 + Math.min((3 - momUp) * 15, 20);
      reasoning = "Mild bearish momentum";
    } else {
      direction = "NEUTRAL";
      confidence = 40;
      reasoning = "Mixed signals";
    }
  }

  // Volatility adjustment
  const avgRange =
    candles.slice(0, 5).reduce((sum, c) => sum + (c.HighPrice - c.LowPrice), 0) / 5;
  const currentRange = current.HighPrice - current.LowPrice;

  if (currentRange > avgRange * 1.5) {
    confidence = Math.min(confidence + 10, 95);
    reasoning += " (high volatility)";
  }

  return {
    direction,
    confidence: Math.round(confidence),
    reasoning,
  };
}

// Calculate VWAP (Volume Weighted Average Price)
export function calculateVWAP(candles: Candle[]): number {
  if (candles.length === 0) return 0;

  let totalVolumePrice = 0;
  let totalVolume = 0;

  for (const candle of candles) {
    const typicalPrice = (candle.HighPrice + candle.LowPrice + candle.ClosePrice) / 3;
    totalVolumePrice += typicalPrice * candle.Volume;
    totalVolume += candle.Volume;
  }

  return totalVolume > 0 ? totalVolumePrice / totalVolume : 0;
}

// Calculate Simple Moving Average
export function calculateSMA(candles: Candle[], period: number = 20): number[] {
  const smas: number[] = [];

  for (let i = 0; i <= candles.length - period; i++) {
    const slice = candles.slice(i, i + period);
    const avg = slice.reduce((sum, c) => sum + c.ClosePrice, 0) / period;
    smas.push(avg);
  }

  return smas;
}

// Identify session high and low
export function getSessionRange(candles: Candle[]): { high: number; low: number } {
  if (candles.length === 0) return { high: 0, low: 0 };

  let high = candles[0].HighPrice;
  let low = candles[0].LowPrice;

  for (const candle of candles) {
    high = Math.max(high, candle.HighPrice);
    low = Math.min(low, candle.LowPrice);
  }

  return { high, low };
}

// Calculate momentum score (simple)
export function calculateMomentum(candles: Candle[], period: number = 5): number {
  if (candles.length < period) return 0;

  const recent = candles.slice(0, period);
  const older = candles[period];

  const currentPrice = recent[0].ClosePrice;

  if (older.ClosePrice === 0) return 0;
  return ((currentPrice - older.ClosePrice) / older.ClosePrice) * 100;
}
