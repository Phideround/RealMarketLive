import { NextResponse } from "next/server";

const RSS_FEEDS = [
  { url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", source: "MarketWatch" },
  { url: "https://www.investing.com/rss/forex.rss", source: "Investing" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss", source: "CoinDesk" },
  { url: "https://slate.com/feeds/news-and-politics.rss", source: "Slate" },
] as const;
const MAX_ITEMS = 100;

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  link: string;
  source: string;
  timestamp: string;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .trim();
}

function pickTagValue(block: string, tagName: string): string {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXmlEntities(match[1]) : "";
}

function toUtcDateOnly(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export async function GET() {
  try {
    const todayUtc = toUtcDateOnly(new Date());

    const responses = await Promise.allSettled(
      RSS_FEEDS.map(async (feed) => {
        const response = await fetch(feed.url, {
          method: "GET",
          cache: "no-store",
          next: { revalidate: 0 },
          headers: {
            Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
          },
        });

        if (!response.ok) {
          throw new Error(`${feed.source} RSS fetch failed: ${response.status}`);
        }

        const xml = await response.text();
        const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

        return itemBlocks.map((block, idx) => {
          const title = pickTagValue(block, "title");
          const summary = pickTagValue(block, "description");
          const link = pickTagValue(block, "link");
          const pubDate = pickTagValue(block, "pubDate");
          const source = pickTagValue(block, "source") || feed.source;
          const dt = pubDate ? new Date(pubDate) : new Date();

          return {
            id: `${feed.source}-${dt.getTime()}-${idx}`,
            title,
            summary,
            link,
            source,
            timestamp: dt.toISOString(),
          } as NewsItem;
        });
      })
    );

    const merged: NewsItem[] = responses
      .filter((result): result is PromiseFulfilledResult<NewsItem[]> => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .filter((item) => item.title.length > 0 && item.link.length > 0)
      .filter((item) => toUtcDateOnly(new Date(item.timestamp)) === todayUtc)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const uniqueByLink = new Map<string, NewsItem>();
    for (const item of merged) {
      if (!uniqueByLink.has(item.link)) {
        uniqueByLink.set(item.link, item);
      }
      if (uniqueByLink.size >= MAX_ITEMS) {
        break;
      }
    }

    const parsed = Array.from(uniqueByLink.values());

    return NextResponse.json({
      data: parsed,
      totalCount: parsed.length,
      sources: RSS_FEEDS.map((f) => f.url),
      onlyToday: true,
      maxItems: MAX_ITEMS,
    });
  } catch (error) {
    return NextResponse.json(
      {
        data: [],
        totalCount: 0,
        error: error instanceof Error ? error.message : "Unknown RSS parse error",
      },
      { status: 500 }
    );
  }
}
