"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { Candle, useMarketStore } from "@/store/market";
import { useSignalsStore } from "@/store/signals";
import { BollingerBandPoint, EmaPoint, fetchBollingerBands, fetchEMAIndicator, formatNumber } from "@/lib/api";
import { calculateVWAP, getSessionRange } from "@/lib/signals";

const TIMEFRAMES = ["M1", "M5", "M15", "H1", "H4", "D1"];
const MIN_VISIBLE_CANDLES = 20;
const EMA_PERIODS = [21, 50] as const;
const EMA_COLORS: Record<(typeof EMA_PERIODS)[number], string> = {
  21: "#00FF41",
  50: "#FFFFFF",
};
const BOLLINGER_PERIOD = 20;
const BOLLINGER_MULTIPLIER = 2;
const BOLLINGER_COLORS = {
  upper: "rgba(255, 160, 70, 0.9)",
  middle: "rgba(90, 190, 255, 0.9)",
  lower: "rgba(255, 120, 190, 0.9)",
};
type CursorMode = "cursor" | "crosshair" | "sniper";

interface HoverInfo {
  index: number;
  x: number;
  y: number;
  candle: Candle;
}

interface ShotFx {
  id: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  distance: number;
  angle: number;
}

export function LiveChart() {
  const { currentSymbol, currentTimeframe, setCurrentTimeframe, candles, priceData } = useMarketStore();
  const { signals } = useSignalsStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [cursorMode, setCursorMode] = useState<CursorMode>("crosshair");
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [showPriceOverlay, setShowPriceOverlay] = useState(true);
  const [emaEnabled, setEmaEnabled] = useState(true);
  const [emaSeries, setEmaSeries] = useState<Record<(typeof EMA_PERIODS)[number], EmaPoint[]>>({
    21: [],
    50: [],
  });
  const [bollingerEnabled, setBollingerEnabled] = useState(true);
  const [bollingerSeries, setBollingerSeries] = useState<BollingerBandPoint[]>([]);
  const [shotFx, setShotFx] = useState<ShotFx | null>(null);
  const shotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const candleList = useMemo(
    () => candles[currentSymbol] || [],
    [candles, currentSymbol]
  );
  const currentPrice = priceData[currentSymbol];
  const currentSignal = signals[currentSymbol];
  const orderFlow = currentSignal?.orderFlow;
  const latestCandle = candleList[0];
  const chartCandles = useMemo(() => [...candleList].reverse(), [candleList]);
  const visibleCandleCount = useMemo(
    () => Math.max(MIN_VISIBLE_CANDLES, Math.floor(chartCandles.length / zoomLevel)),
    [chartCandles.length, zoomLevel]
  );
  const visibleCandles = useMemo(
    () => chartCandles.slice(-visibleCandleCount),
    [chartCandles, visibleCandleCount]
  );
  const volumeDisplay = useMemo(() => {
    const raw = visibleCandles.map((candle) => {
      const vol = Number(candle.Volume);
      if (Number.isFinite(vol) && vol > 0) return vol;
      const body = Math.abs(candle.ClosePrice - candle.OpenPrice);
      return Math.max(1, body * 10000);
    });
    const max = Math.max(...raw, 1);
    const hasNative = visibleCandles.some((candle) => Number.isFinite(candle.Volume) && candle.Volume > 0);

    return {
      bars: raw,
      max,
      hasNative,
    };
  }, [visibleCandles]);
  const vwap = calculateVWAP(candleList);
  const visibleRange = useMemo(() => getSessionRange(visibleCandles), [visibleCandles]);
  const supportResistance = useMemo(() => {
    const support =
      currentSignal?.nextInsight?.support ??
      currentSignal?.confluence?.nearestSupport ??
      currentSignal?.setup?.nearestSupport;
    const resistance =
      currentSignal?.nextInsight?.resistance ??
      currentSignal?.confluence?.nearestResistance ??
      currentSignal?.setup?.nearestResistance;

    return {
      support: support != null && Number.isFinite(support) ? Number(support) : null,
      resistance: resistance != null && Number.isFinite(resistance) ? Number(resistance) : null,
    };
  }, [currentSignal]);

  useEffect(() => {
    let cancelled = false;

    const loadIndicators = async () => {
      const tasks: Promise<unknown>[] = [];

      if (emaEnabled) {
        tasks.push(
          Promise.all([
            fetchEMAIndicator(currentSymbol, currentTimeframe, 21),
            fetchEMAIndicator(currentSymbol, currentTimeframe, 50),
          ]).then(([ema21, ema50]) => {
            if (cancelled) return;
            setEmaSeries({
              21: ema21,
              50: ema50,
            });
          })
        );
      } else {
        setEmaSeries({ 21: [], 50: [] });
      }

      if (bollingerEnabled) {
        tasks.push(
          fetchBollingerBands(currentSymbol, currentTimeframe, BOLLINGER_PERIOD, BOLLINGER_MULTIPLIER).then((bands) => {
            if (cancelled) return;
            setBollingerSeries(bands);
          })
        );
      } else {
        setBollingerSeries([]);
      }

      if (tasks.length > 0) {
        await Promise.all(tasks);
      }
    };

    void loadIndicators();
    return () => {
      cancelled = true;
    };
  }, [currentSymbol, currentTimeframe, emaEnabled, bollingerEnabled]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      setChartSize({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
      });
    });

    observer.observe(container);

    const rect = container.getBoundingClientRect();
    setChartSize({
      width: Math.max(0, Math.floor(rect.width)),
      height: Math.max(0, Math.floor(rect.height)),
    });

    return () => observer.disconnect();
  }, []);

  // Draw simple candlestick chart
  useEffect(() => {
    if (!containerRef.current || visibleCandles.length === 0) return;
    if (chartSize.width <= 0 || chartSize.height <= 0) return;

    const canvas = containerRef.current.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(chartSize.width * dpr);
    canvas.height = Math.floor(chartSize.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = chartSize.width;
    const height = chartSize.height;
    const padding = 40;
    const priceTop = padding;
    const priceBottom = height - padding;
    const pricePanelHeight = priceBottom - priceTop;

    // Clear
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "rgba(0, 255, 65, 0.12)";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i++) {
      const y = priceTop + (i / 10) * (priceBottom - priceTop);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Get price range
    let minPrice = Math.min(...visibleCandles.map((c) => c.LowPrice));
    let maxPrice = Math.max(...visibleCandles.map((c) => c.HighPrice));
    const visibleTimeSet = new Set(visibleCandles.map((c) => new Date(c.OpenTime).getTime()));
    const emaVisibleValues: number[] = [];
    const bollingerVisibleValues: number[] = [];

    if (emaEnabled) {
      EMA_PERIODS.forEach((period) => {
        for (const point of emaSeries[period]) {
          const ts = new Date(point.openTime).getTime();
          if (visibleTimeSet.has(ts) && Number.isFinite(point.value)) {
            emaVisibleValues.push(point.value);
          }
        }
      });
    }

    if (emaVisibleValues.length > 0) {
      minPrice = Math.min(minPrice, ...emaVisibleValues);
      maxPrice = Math.max(maxPrice, ...emaVisibleValues);
    }

    if (bollingerEnabled) {
      for (const point of bollingerSeries) {
        const ts = new Date(point.openTime).getTime();
        if (!visibleTimeSet.has(ts)) continue;
        if (Number.isFinite(point.upper)) bollingerVisibleValues.push(point.upper);
        if (Number.isFinite(point.middle)) bollingerVisibleValues.push(point.middle);
        if (Number.isFinite(point.lower)) bollingerVisibleValues.push(point.lower);
      }
    }

    if (bollingerVisibleValues.length > 0) {
      minPrice = Math.min(minPrice, ...bollingerVisibleValues);
      maxPrice = Math.max(maxPrice, ...bollingerVisibleValues);
    }

    if (supportResistance.support != null) {
      minPrice = Math.min(minPrice, supportResistance.support);
      maxPrice = Math.max(maxPrice, supportResistance.support);
    }
    if (supportResistance.resistance != null) {
      minPrice = Math.min(minPrice, supportResistance.resistance);
      maxPrice = Math.max(maxPrice, supportResistance.resistance);
    }

    const priceRange = maxPrice - minPrice || 1;
    minPrice -= priceRange * 0.06;
    maxPrice += priceRange * 0.06;

    // Draw candles
    const chartWidth = width - padding * 2;
    const slotWidth = chartWidth / visibleCandles.length;
    const candleWidth = Math.max(2, Math.min(18, slotWidth * 0.72));
    const xByCandleTime = new Map<number, number>();

    const normalizePrice = (price: number) => {
      const pct = (price - minPrice) / (maxPrice - minPrice || 1);
      return priceBottom - pct * pricePanelHeight;
    };

    visibleCandles.forEach((candle, index) => {
      const x = padding + index * slotWidth + slotWidth / 2;
      xByCandleTime.set(new Date(candle.OpenTime).getTime(), x);

      const open = normalizePrice(candle.OpenPrice);
      const close = normalizePrice(candle.ClosePrice);
      const high = normalizePrice(candle.HighPrice);
      const low = normalizePrice(candle.LowPrice);

      const isUp = candle.ClosePrice >= candle.OpenPrice;
      ctx.fillStyle = isUp ? "#00FF41" : "#ff0000";
      ctx.strokeStyle = isUp ? "#00FF41" : "#ff0000";

      // Wick
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, high);
      ctx.lineTo(x, low);
      ctx.stroke();

      // Body
      ctx.lineWidth = 2;
      const bodyTop = Math.min(open, close);
      const bodyHeight = Math.abs(close - open) || 1;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

    // Draw EMA lines and small period tags
    if (emaEnabled) {
      EMA_PERIODS.forEach((period) => {
        const points = emaSeries[period] || [];
        let plotted = points
          .map((p) => {
            const ts = new Date(p.openTime).getTime();
            const x = xByCandleTime.get(ts);
            if (x == null || !Number.isFinite(p.value)) return null;
            return { x, y: normalizePrice(p.value), value: p.value };
          })
          .filter((p): p is { x: number; y: number; value: number } => p !== null);

        if (plotted.length < 2 && points.length > 0) {
          const recentPoints = points.slice(-visibleCandles.length);
          const offset = visibleCandles.length - recentPoints.length;
          plotted = recentPoints
            .map((p, idx) => {
              if (!Number.isFinite(p.value)) return null;
              const candle = visibleCandles[offset + idx];
              if (!candle) return null;
              const ts = new Date(candle.OpenTime).getTime();
              const x = xByCandleTime.get(ts);
              if (x == null) return null;
              return { x, y: normalizePrice(p.value), value: p.value };
            })
            .filter((p): p is { x: number; y: number; value: number } => p !== null);
        }

        if (plotted.length < 2) return;

        ctx.strokeStyle = EMA_COLORS[period];
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        plotted.forEach((p, idx) => {
          if (idx === 0) {
            ctx.moveTo(p.x, p.y);
          } else {
            ctx.lineTo(p.x, p.y);
          }
        });
        ctx.stroke();

        const last = plotted[plotted.length - 1];
        const tagText = String(period);
        const tagW = 18;
        const tagH = 12;
        const tagX = Math.min(width - padding - tagW, last.x + 4);
        const tagY = Math.max(priceTop + 2, Math.min(priceBottom - tagH - 2, last.y - tagH / 2));

        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(tagX, tagY, tagW, tagH);
        ctx.strokeStyle = EMA_COLORS[period];
        ctx.lineWidth = 1;
        ctx.strokeRect(tagX, tagY, tagW, tagH);
        ctx.fillStyle = EMA_COLORS[period];
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(tagText, tagX + 3, tagY + 9);
      });
    }

    if (bollingerEnabled && bollingerSeries.length > 0) {
      const plotted = bollingerSeries
        .map((p) => {
          const ts = new Date(p.openTime).getTime();
          const x = xByCandleTime.get(ts);
          if (x == null) return null;
          return {
            x,
            upper: normalizePrice(p.upper),
            middle: normalizePrice(p.middle),
            lower: normalizePrice(p.lower),
          };
        })
        .filter((p): p is { x: number; upper: number; middle: number; lower: number } => p !== null);

      if (plotted.length > 1) {
        ctx.fillStyle = "rgba(90, 190, 255, 0.08)";
        ctx.beginPath();
        plotted.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.upper);
          else ctx.lineTo(p.x, p.upper);
        });
        for (let i = plotted.length - 1; i >= 0; i--) {
          ctx.lineTo(plotted[i].x, plotted[i].lower);
        }
        ctx.closePath();
        ctx.fill();

        const drawBandLine = (key: "upper" | "middle" | "lower", color: string, dashed = false) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.25;
          ctx.setLineDash(dashed ? [5, 4] : []);
          ctx.beginPath();
          plotted.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p[key]);
            else ctx.lineTo(p.x, p[key]);
          });
          ctx.stroke();
          ctx.setLineDash([]);
        };

        drawBandLine("upper", BOLLINGER_COLORS.upper);
        drawBandLine("middle", BOLLINGER_COLORS.middle, true);
        drawBandLine("lower", BOLLINGER_COLORS.lower);
      }
    }

    // Draw VWAP
    if (vwap > 0) {
      const vwapY = normalizePrice(vwap);
      ctx.strokeStyle = "rgba(255, 177, 0, 0.8)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding, vwapY);
      ctx.lineTo(width - padding, vwapY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw session high/low
    const highY = normalizePrice(visibleRange.high);
    const lowY = normalizePrice(visibleRange.low);

    ctx.strokeStyle = "rgba(0, 255, 65, 0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding, highY);
    ctx.lineTo(width - padding, highY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding, lowY);
    ctx.lineTo(width - padding, lowY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw support/resistance guide lines with subtle transparency
    if (supportResistance.support != null) {
      const supportY = normalizePrice(supportResistance.support);
      ctx.strokeStyle = "rgba(0, 255, 65, 0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(padding, supportY);
      ctx.lineTo(width - padding, supportY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.fillRect(width - padding - 102, supportY - 9, 102, 16);
      ctx.strokeStyle = "rgba(0, 255, 65, 0.45)";
      ctx.strokeRect(width - padding - 102, supportY - 9, 102, 16);
      ctx.fillStyle = "rgba(0, 255, 65, 0.85)";
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`S ${formatNumber(supportResistance.support, 2)}`, width - padding - 97, supportY + 3);
    }

    if (supportResistance.resistance != null) {
      const resistanceY = normalizePrice(supportResistance.resistance);
      ctx.strokeStyle = "rgba(255, 96, 96, 0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(padding, resistanceY);
      ctx.lineTo(width - padding, resistanceY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.fillRect(width - padding - 102, resistanceY - 9, 102, 16);
      ctx.strokeStyle = "rgba(255, 96, 96, 0.45)";
      ctx.strokeRect(width - padding - 102, resistanceY - 9, 102, 16);
      ctx.fillStyle = "rgba(255, 96, 96, 0.9)";
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`R ${formatNumber(supportResistance.resistance, 2)}`, width - padding - 97, resistanceY + 3);
    }

    // Draw current price guide (dashed) at the newest candle close
    if (latestCandle) {
      const currentPriceY = Math.max(priceTop, Math.min(priceBottom, normalizePrice(latestCandle.ClosePrice)));
      const currentPriceLabel = formatNumber(latestCandle.ClosePrice, 2);

      ctx.strokeStyle = "rgba(0, 255, 65, 0.95)";
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(padding, currentPriceY);
      ctx.lineTo(width - padding, currentPriceY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(0, 255, 65, 0.2)";
      ctx.fillRect(width - padding - 70, currentPriceY - 10, 70, 18);
      ctx.strokeStyle = "rgba(0, 255, 65, 0.85)";
      ctx.strokeRect(width - padding - 70, currentPriceY - 10, 70, 18);
      ctx.fillStyle = "#00FF41";
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText(currentPriceLabel, width - padding - 64, currentPriceY + 3);

    }

    // Draw interactive crosshair guides
    if (hoverInfo && cursorMode === "crosshair") {
      const crossY = Math.max(priceTop, Math.min(priceBottom, hoverInfo.y));
      const crossX = Math.max(padding, Math.min(width - padding, hoverInfo.x));
      const crossPriceY = Math.max(priceTop, Math.min(priceBottom, hoverInfo.y));
      const crossPrice =
        maxPrice - ((crossPriceY - priceTop) / (priceBottom - priceTop || 1)) * (maxPrice - minPrice || 1);

      ctx.strokeStyle = "rgba(0, 255, 65, 0.75)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(crossX, priceTop);
      ctx.lineTo(crossX, priceBottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(padding, crossY);
      ctx.lineTo(width - padding, crossY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Crosshair price tag
      const priceLabel = formatNumber(crossPrice, 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
      ctx.fillRect(width - padding - 70, crossPriceY - 9, 70, 18);
      ctx.strokeStyle = "rgba(0, 255, 65, 0.85)";
      ctx.strokeRect(width - padding - 70, crossPriceY - 9, 70, 18);
      ctx.fillStyle = "#00FF41";
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(priceLabel, width - padding - 64, crossPriceY + 4);
    }
  }, [visibleCandles, vwap, visibleRange, latestCandle, chartSize, hoverInfo, cursorMode, emaEnabled, emaSeries, bollingerEnabled, bollingerSeries, supportResistance]);

  const zoomIn = () => setZoomLevel((z) => Math.min(8, Number((z * 1.25).toFixed(2))));
  const zoomOut = () => setZoomLevel((z) => Math.max(1, Number((z / 1.25).toFixed(2))));
  const resetZoom = () => setZoomLevel(1);
  const resetView = () => {
    setCurrentTimeframe("H1");
    setZoomLevel(1);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoomLevel((z) => Math.min(8, Number((z * 1.25).toFixed(2))));
      } else {
        setZoomLevel((z) => Math.max(1, Number((z / 1.25).toFixed(2))));
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    return () => {
      if (shotTimeoutRef.current) {
        clearTimeout(shotTimeoutRef.current);
      }
    };
  }, []);

  const getChartGeometry = () => {
    const width = chartSize.width;
    const height = chartSize.height;
    const padding = 40;
    const priceTop = padding;
    const priceBottom = height - padding;
    const chartWidth = width - padding * 2;
    const slotWidth = visibleCandles.length > 0 ? chartWidth / visibleCandles.length : 0;

    return { padding, priceTop, priceBottom, chartWidth, slotWidth };
  };

  const onChartMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || visibleCandles.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { padding, slotWidth, priceTop, priceBottom } = getChartGeometry();

    if (x < padding || x > rect.width - padding || y < priceTop || y > priceBottom || slotWidth <= 0) {
      setHoverInfo(null);
      return;
    }

    const index = Math.max(0, Math.min(visibleCandles.length - 1, Math.floor((x - padding) / slotWidth)));
    const candle = visibleCandles[index];
    const centerX = padding + index * slotWidth + slotWidth / 2;

    setHoverInfo({
      index,
      x: centerX,
      y,
      candle,
    });
  };

  const onChartMouseLeave = () => setHoverInfo(null);

  const fireSniperShot = (targetX?: number, targetY?: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    const originX = rect.width - 22;
    const originY = 20;
    const resolvedTargetX =
      targetX != null
        ? Math.max(12, Math.min(rect.width - 12, targetX))
        : rect.width * (0.18 + Math.random() * 0.62);
    const resolvedTargetY =
      targetY != null
        ? Math.max(12, Math.min(rect.height - 12, targetY))
        : rect.height * (0.2 + Math.random() * 0.58);
    const deltaX = resolvedTargetX - originX;
    const deltaY = resolvedTargetY - originY;
    const distance = Math.hypot(deltaX, deltaY);
    const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

    setShotFx({
      id: Date.now(),
      originX,
      originY,
      targetX: resolvedTargetX,
      targetY: resolvedTargetY,
      distance,
      angle,
    });

    if (shotTimeoutRef.current) {
      clearTimeout(shotTimeoutRef.current);
    }
    shotTimeoutRef.current = setTimeout(() => setShotFx(null), 850);
  };

  const onChartClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cursorMode !== "sniper" || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    fireSniperShot(x, y);
  };

  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_88px_auto] border border-terminal-positive/20 rounded bg-black/40 overflow-hidden flex-1 hud-fade-in surface-glow">
      {/* Header */}
      <div className="shrink-0 flex flex-col gap-2 px-3 py-2 border-b border-terminal-positive/20 bg-black/70 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="text-xs font-bold text-terminal-positive tracking-wider">{currentSymbol.toUpperCase()} · CANDLESTICK</h2>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
            <div className="inline-flex items-center gap-2 border border-terminal-positive/25 bg-black/70 px-2 py-1 text-terminal-muted">
              <span className="uppercase tracking-[0.18em] text-terminal-muted/80">Orderflow</span>
              {orderFlow ? (
                <>
                  <span className={`inline-flex items-center gap-1 border px-1.5 py-0.5 ${orderFlow.currentImbalance.toLowerCase().includes("bear") ? "border-red-500/35 bg-red-950/20 text-red-400" : "border-terminal-positive/35 bg-terminal-positive/10 text-terminal-positive flow-pulse"}`}>
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                    {orderFlow.currentImbalance}
                  </span>
                  <span className="text-terminal-positive">Bull {formatNumber(orderFlow.bullishRatio, 1)}%</span>
                  <span className="text-red-400">Bear {formatNumber(orderFlow.bearishRatio, 1)}%</span>
                  <span className="h-2 w-24 overflow-hidden border border-terminal-positive/15 bg-black/70">
                    <span className="flex h-full w-full">
                      <span className="flow-meter-rise bg-terminal-positive/70" style={{ width: `${Math.max(0, Math.min(100, orderFlow.bullishRatio))}%` }} />
                      <span className="bg-red-500/70" style={{ width: `${Math.max(0, Math.min(100, orderFlow.bearishRatio))}%` }} />
                    </span>
                  </span>
                </>
              ) : (
                <span className="text-terminal-muted">Awaiting live imbalance feed</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setCurrentTimeframe(tf)}
              className={`px-1.5 py-1 text-[11px] sm:px-2 sm:text-xs font-mono transition-all ${
                currentTimeframe === tf
                  ? "bg-terminal-positive/30 border border-terminal-positive text-terminal-positive"
                  : "border border-terminal-positive/30 text-terminal-muted hover:border-terminal-positive/50"
              }`}
            >
              {tf}
            </button>
          ))}
          <div className="w-px h-5 bg-terminal-positive/30 mx-1" />
          <button
            onClick={zoomOut}
            className="px-1.5 py-1 text-[11px] sm:px-2 sm:text-xs font-mono border border-terminal-positive/30 text-terminal-muted hover:border-terminal-positive/50"
            title="Zoom Out"
          >
            -
          </button>
          <button
            onClick={resetZoom}
            className="px-1.5 py-1 text-[11px] sm:px-2 sm:text-xs font-mono border border-terminal-positive/40 text-terminal-positive hover:border-terminal-positive"
            title="Reset Zoom"
          >
            {zoomLevel.toFixed(1)}x
          </button>
          <button
            onClick={resetView}
            className="px-1.5 py-1 text-[11px] sm:px-2 sm:text-xs font-mono border border-terminal-positive/50 text-terminal-positive hover:bg-terminal-positive/10"
            title="Reset to H1 and 1x zoom"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 11l9-8 9 8" />
              <path d="M5 10v10h14V10" />
            </svg>
          </button>
          <div className="w-px h-5 bg-terminal-positive/30 mx-1" />
          <button
            onClick={() => setCursorMode("cursor")}
            className={`px-1.5 py-1 text-[11px] sm:px-2 sm:text-xs font-mono border transition-all ${
              cursorMode === "cursor"
                ? "border-terminal-positive text-terminal-positive bg-terminal-positive/10"
                : "border-terminal-positive/30 text-terminal-muted hover:border-terminal-positive/50"
            }`}
            title="Pointer mode"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
              <path d="M5 3l12 7-6 2 2 7-3 2-3-8-4-10z" />
            </svg>
          </button>
          <button
            onClick={() => setCursorMode("crosshair")}
            className={`px-1.5 py-1 text-[11px] sm:px-2 sm:text-xs font-mono border transition-all ${
              cursorMode === "crosshair"
                ? "border-terminal-positive text-terminal-positive bg-terminal-positive/10"
                : "border-terminal-positive/30 text-terminal-muted hover:border-terminal-positive/50"
            }`}
            title="Crosshair mode"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </button>
          <button
            onClick={() => setCursorMode("sniper")}
            className={`sniper-button px-1.5 py-1 text-[11px] sm:px-2 sm:text-xs font-mono border transition-all ${
              cursorMode === "sniper"
                ? "border-terminal-positive text-terminal-positive bg-terminal-positive/10"
                : "border-terminal-positive/30 text-terminal-muted hover:border-terminal-positive/50"
            }`}
            title="Sniper mode"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </button>
          <button
            onClick={() => setEmaEnabled((prev) => !prev)}
            className={`px-1.5 py-1 text-[11px] sm:px-2 sm:text-xs font-mono border transition-all ${
              emaEnabled
                ? "border-terminal-positive text-terminal-positive bg-terminal-positive/10"
                : "border-terminal-positive/30 text-terminal-muted hover:border-terminal-positive/50"
            }`}
            title={emaEnabled ? "Hide all EMA" : "Show all EMA"}
          >
            {emaEnabled ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                <circle cx="12" cy="12" r="3" />
                <path d="M4 20L20 4" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setBollingerEnabled((prev) => !prev)}
            className={`px-1.5 py-1 text-[11px] sm:px-2 sm:text-xs font-mono border transition-all ${
              bollingerEnabled
                ? "border-terminal-positive text-terminal-positive bg-terminal-positive/10"
                : "border-terminal-positive/30 text-terminal-muted hover:border-terminal-positive/50"
            }`}
            title={bollingerEnabled ? "Hide Bollinger Bands" : "Show Bollinger Bands"}
          >
            BB
          </button>
          <button
            onClick={zoomIn}
            className="px-1.5 py-1 text-[11px] sm:px-2 sm:text-xs font-mono border border-terminal-positive/30 text-terminal-muted hover:border-terminal-positive/50"
            title="Zoom In"
          >
            +
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div
        ref={containerRef}
        className={`min-h-0 relative bg-black ${cursorMode === "sniper" ? "cursor-crosshair" : ""}`}
        onMouseMove={onChartMouseMove}
        onMouseLeave={onChartMouseLeave}
        onClick={onChartClick}
      >
        {shotFx ? (
          <div key={shotFx.id} className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
            <span
              className="sniper-muzzle-flash"
              style={{ left: shotFx.originX - 6, top: shotFx.originY - 6 }}
            />
            <span
              className="sniper-tracer"
              style={{
                left: shotFx.originX,
                top: shotFx.originY,
                width: `${shotFx.distance}px`,
                ["--shot-angle" as const]: `${shotFx.angle}deg`,
              } as React.CSSProperties}
            />
            <span
              className="sniper-impact"
              style={{ left: shotFx.targetX, top: shotFx.targetY }}
            />
          </div>
        ) : null}

        <canvas
          className="w-full h-full"
          style={{ imageRendering: "auto" }}
        />

        {hoverInfo && (
          <div className="absolute left-3 top-3 hidden md:block bg-black/85 border border-terminal-positive/40 px-3 py-2 text-[11px] font-mono space-y-1">
            <div className="text-terminal-positive font-bold">Candle #{hoverInfo.index + 1}</div>
            <div className="text-terminal-muted">Time: <span className="text-terminal-positive">{new Date(hoverInfo.candle.OpenTime).toLocaleString()}</span></div>
            <div className="text-terminal-muted">O: <span className="text-terminal-positive">{formatNumber(hoverInfo.candle.OpenPrice, 2)}</span> H: <span className="text-terminal-positive">{formatNumber(hoverInfo.candle.HighPrice, 2)}</span></div>
            <div className="text-terminal-muted">L: <span className="text-terminal-positive">{formatNumber(hoverInfo.candle.LowPrice, 2)}</span> C: <span className="text-terminal-positive">{formatNumber(hoverInfo.candle.ClosePrice, 2)}</span></div>
            <div className="text-terminal-muted">Vol: <span className="text-terminal-positive">{formatNumber(hoverInfo.candle.Volume, 2)}</span></div>
          </div>
        )}

        {(emaEnabled || bollingerEnabled) && (
          <div className="absolute left-3 bottom-3 bg-black/75 border border-terminal-positive/30 px-2 py-1 text-[10px] font-mono flex items-center gap-2">
            {emaEnabled && (
              <>
                <span className="text-terminal-muted">EMA</span>
                <span style={{ color: EMA_COLORS[21] }}>21</span>
                <span style={{ color: EMA_COLORS[50] }}>50</span>
              </>
            )}
            {bollingerEnabled && (
              <>
                <span className="text-terminal-muted">BB</span>
                <span style={{ color: BOLLINGER_COLORS.upper }}>U</span>
                <span style={{ color: BOLLINGER_COLORS.middle }}>M</span>
                <span style={{ color: BOLLINGER_COLORS.lower }}>L</span>
              </>
            )}
          </div>
        )}

        {/* Icon toolbar (right side) */}
        <div className="absolute top-3 right-3 hidden md:flex flex-col items-end gap-1 z-20">
          <button
            onClick={() => setShowPriceOverlay((prev) => !prev)}
            className={`h-8 w-8 flex items-center justify-center border text-terminal-positive transition-all ${
              showPriceOverlay
                ? "border-terminal-positive bg-terminal-positive/10"
                : "border-terminal-positive/35 bg-black/65 hover:border-terminal-positive"
            }`}
            title={showPriceOverlay ? "Minimize price panel" : "Show price panel"}
            aria-label={showPriceOverlay ? "Minimize price panel" : "Show price panel"}
          >
            {showPriceOverlay ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </button>
        </div>

        {/* Price/Stats Overlay */}
        <div className="absolute top-12 right-3 hidden md:block text-xs font-mono space-y-1 z-10">
          <div className="bg-black/80 border border-terminal-positive/30 p-2">
            <div className="text-terminal-positive">Current Price</div>
            <div className="text-terminal-positive text-lg font-bold">
              {latestCandle ? formatNumber(latestCandle.ClosePrice, 2) : "—"}
            </div>

            {showPriceOverlay && candleList.length > 0 && (
              <div className="mt-2 text-terminal-muted space-y-1 border-t border-terminal-positive/20 pt-2">
                <div>
                  Bid: <span className="text-terminal-positive">{currentPrice ? formatNumber(currentPrice.Bid, 2) : "—"}</span>
                </div>
                <div>
                  Ask: <span className="text-terminal-positive">{currentPrice ? formatNumber(currentPrice.Ask, 2) : "—"}</span>
                </div>
                <div>
                  High: <span className="text-terminal-positive">{formatNumber(visibleRange.high, 2)}</span>
                </div>
                <div>
                  Low: <span className="text-terminal-positive">{formatNumber(visibleRange.low, 2)}</span>
                </div>
                <div>
                  VWAP: <span className="text-terminal-positive">{formatNumber(vwap, 2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dedicated volume strip (always visible) */}
      <div className="border-t border-terminal-positive/40 bg-black/90 px-3 py-2">
        <div className="mb-1 flex items-center justify-between text-[10px] font-mono">
          <span className="text-terminal-positive">{volumeDisplay.hasNative ? "Volume" : "Volume*"}</span>
          <span className="text-terminal-muted">
            {volumeDisplay.hasNative ? "feed" : "estimated fallback"}
          </span>
        </div>
        <div className="h-16 flex items-end gap-[1px]">
          {volumeDisplay.bars.length > 0 ? (
            volumeDisplay.bars.map((value, idx) => {
              const candle = visibleCandles[idx];
              const up = candle ? candle.ClosePrice >= candle.OpenPrice : true;
              const height = Math.max(18, (value / volumeDisplay.max) * 100);
              return (
                <span
                  key={`vol-strip-${idx}`}
                  className={`flex-1 ${up ? "bg-terminal-positive/70" : "bg-red-500/70"}`}
                  style={{ height: `${height}%` }}
                />
              );
            })
          ) : (
            <span className="text-[10px] text-terminal-muted">No volume data</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-terminal-positive/30 px-4 py-2 text-xs text-terminal-muted bg-black/80">
        Candles: {visibleCandles.length}/{candleList.length} | Timeframe: {currentTimeframe} | Zoom: {zoomLevel.toFixed(1)}x | Last Update:{" "}
        {latestCandle
          ? new Date(latestCandle.OpenTime).toLocaleTimeString()
          : "—"}
      </div>
    </div>
  );
}
