"use client";

import { useEffect, useMemo, useState } from "react";
import { formatTime } from "@/lib/api";

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  link: string;
  source: string;
  timestamp: string;
}

export function NewsFeedPanel() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllModal, setShowAllModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/news", { method: "GET", cache: "no-store" });
        if (!response.ok) {
          throw new Error(`News API failed: ${response.status}`);
        }

        const json = await response.json();
        const items = Array.isArray(json?.data) ? json.data : [];
        if (!cancelled) {
          setFeed(
            items.map((item: any, index: number) => ({
              id: String(item.id ?? `news-${index}`),
              title: String(item.title ?? "Untitled"),
              summary: String(item.summary ?? ""),
              link: String(item.link ?? "#"),
              source: String(item.source ?? "NASDAQ"),
              timestamp: String(item.timestamp ?? new Date().toISOString()),
            }))
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load news");
          setFeed([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    const interval = setInterval(load, 600_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const hasNewsToday = useMemo(() => feed.length > 0, [feed]);
  const compactFeed = useMemo(() => feed.slice(0, 8), [feed]);

  return (
    <div className="flex flex-col h-full border border-terminal-positive/20 rounded bg-black/40 overflow-hidden">
      <div className="px-3 py-2 border-b border-terminal-positive/20 bg-black/70">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-terminal-accent tracking-wider">NEWS FEED</h3>
          <button
            onClick={() => setShowAllModal(true)}
            className="text-[10px] px-2 py-1 border border-terminal-positive/40 text-terminal-positive hover:bg-terminal-positive/10"
            title="Open full news view"
          >
            ▦ All
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading && <div className="text-[11px] text-terminal-muted px-1 py-2">Loading latest RSS headlines...</div>}

        {!loading && error && (
          <div className="rounded border border-red-400/60 bg-black/60 p-2 text-[11px] text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && !hasNewsToday && (
          <div className="rounded border border-terminal-positive/30 bg-black/60 p-2 text-[11px] text-terminal-muted">
            No news today from configured RSS feeds.
          </div>
        )}

        {!loading && !error && compactFeed.map((item) => (
          <article key={item.id} className="rounded border border-terminal-positive/30 bg-black/60 p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] text-terminal-positive font-bold uppercase tracking-wide">{item.source}</div>
              <div className="text-[10px] text-terminal-muted">{formatTime(item.timestamp)}</div>
            </div>
            <h4 className="text-xs text-terminal-positive mt-1">{item.title}</h4>
            {item.summary && <p className="text-[11px] text-terminal-muted mt-1 leading-relaxed">{item.summary}</p>}
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-2 text-[10px] text-terminal-positive hover:text-terminal-accent"
            >
              Open article
            </a>
          </article>
        ))}
      </div>

      {showAllModal && (
        <div className="fixed inset-0 z-50 bg-black/85 p-6" onClick={() => setShowAllModal(false)}>
          <div
            className="h-full w-full rounded border border-terminal-positive/30 bg-black/95 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-terminal-positive/20 flex items-center justify-between">
              <h3 className="text-sm font-bold text-terminal-accent tracking-wider">FULL NEWS FEED</h3>
              <button
                onClick={() => setShowAllModal(false)}
                className="text-xs px-3 py-1 border border-terminal-positive/40 text-terminal-positive hover:bg-terminal-positive/10"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {feed.map((item) => (
                <article key={`modal-${item.id}`} className="rounded border border-terminal-positive/30 bg-black/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] text-terminal-positive font-bold uppercase tracking-wide">{item.source}</div>
                    <div className="text-[10px] text-terminal-muted">{formatTime(item.timestamp)}</div>
                  </div>
                  <h4 className="text-sm text-terminal-positive mt-1">{item.title}</h4>
                  {item.summary && <p className="text-[12px] text-terminal-muted mt-1 leading-relaxed">{item.summary}</p>}
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-2 text-[11px] text-terminal-positive hover:text-terminal-positive/90"
                  >
                    Open article
                  </a>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
