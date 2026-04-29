"use client";

import { useEffect, useMemo, useState } from "react";
import { useMarketStore } from "@/store/market";
import { fetchSentimentIndicator, SentimentIndicator, formatNumber } from "@/lib/api";

export function SentimentGaugePanel() {
  const { currentSymbol, currentTimeframe } = useMarketStore();
  const [data, setData] = useState<SentimentIndicator | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const result = await fetchSentimentIndicator(currentSymbol, currentTimeframe || "H1");
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    };

    void load();
    const interval = setInterval(load, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentSymbol, currentTimeframe]);

  const score = data?.fearGreedScore ?? 50;
  const gaugeStyle = useMemo(() => {
    if (score >= 80) return { stroke: "#00ff41", base: "rgba(0,255,65,0.2)", label: "Extreme Greed" };
    if (score >= 60) return { stroke: "#39d353", base: "rgba(57,211,83,0.2)", label: "Greed" };
    if (score >= 40) return { stroke: "#9be9a8", base: "rgba(155,233,168,0.2)", label: "Neutral" };
    if (score >= 20) return { stroke: "#ff9f43", base: "rgba(255,159,67,0.2)", label: "Fear" };
    return { stroke: "#ff4d4d", base: "rgba(255,77,77,0.2)", label: "Extreme Fear" };
  }, [score]);

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="flex flex-col h-full border border-terminal-positive/20 rounded bg-black/40 overflow-hidden">
      <div className="px-3 py-2 border-b border-terminal-positive/20 bg-black/70">
        <h3 className="text-xs font-bold text-terminal-positive tracking-wider">SENTIMENT GAUGE</h3>
      </div>

      <div className="flex-1 p-3 flex items-center justify-center">
        <div className="relative w-[128px] h-[128px] mx-auto">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={radius} stroke={gaugeStyle.base} strokeWidth="10" fill="none" />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={gaugeStyle.stroke}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              fill="none"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
            <div className="text-2xl font-bold" style={{ color: gaugeStyle.stroke }}>
              {formatNumber(clampedScore, 0)}
            </div>
            <div className="text-[10px] text-terminal-muted">Fear/Greed</div>
            <div className="text-[10px]" style={{ color: gaugeStyle.stroke }}>
              {loading ? "Loading..." : gaugeStyle.label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
