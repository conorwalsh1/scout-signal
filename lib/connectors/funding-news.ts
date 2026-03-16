import type { SourceConnector } from "./types";
import type { RawIngestionEvent } from "@/types/ingestion";

const FUNDING_RSS_FEEDS = [
  "https://techcrunch.com/feed/",
  "https://feeds.feedburner.com/venturebeat/SZYF",
];

/**
 * Extract company name from funding-style headline only when a clear pattern matches.
 * e.g. "Startup X raises $10M" -> "Startup X". Never use the full article title as company name.
 */
function extractCompanyFromTitle(title: string): string | null {
  const t = title.trim();
  if (!t) return null;
  const raiseMatch = t.match(/^([^–—-]+?)\s+(?:raises?|secures?|closes?|lands?)\s+/i)
    ?? t.match(/\s+([^–—-]+?)\s+(?:raises?|secures?|closes?|lands?)\s+/i);
  if (raiseMatch) return raiseMatch[1].trim();
  const fundedMatch = t.match(/([^–—-]+?)\s+(?:raises?|secures?|gets?)\s+\$[\d.]+\s*[KMB]/i);
  if (fundedMatch) return fundedMatch[1].trim();
  return null;
}

function detectFundingRoundType(content: string): string | null {
  const value = content.toLowerCase();
  if (/\bstrategic investment\b|\bstrategic backing\b/.test(value)) return "strategic_investment";
  if (/\bseries\s+c\b|\bseries\s+d\b|\bseries\s+e\b|\bgrowth round\b/.test(value)) return "series_b_plus";
  if (/\bseries\s+b\b/.test(value)) return "series_b_plus";
  if (/\bseries\s+a\b/.test(value)) return "series_a";
  if (/\bseed\b|\bpre-seed\b/.test(value)) return "seed";
  return null;
}

function extractFundingAmount(content: string): { amount: string | null; currency: string | null } {
  const match = content.match(/([$€£])\s?(\d+(?:\.\d+)?)\s?([KMB])?/i);
  if (!match) return { amount: null, currency: null };
  const currency = match[1] === "$" ? "USD" : match[1] === "€" ? "EUR" : "GBP";
  const unit = (match[3] ?? "").toUpperCase();
  const amount = `${match[2]}${unit}`;
  return { amount, currency };
}

function extractLeadInvestors(content: string): string[] {
  const leadMatch = content.match(/led by ([^.]+?)(?:,| with| alongside|\.|$)/i);
  if (!leadMatch) return [];
  return leadMatch[1]
    .split(/,| and /i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)
    .slice(0, 3);
}

export const fundingNewsConnector: SourceConnector = {
  sourceType: "funding_news",

  async fetch(): Promise<RawIngestionEvent[]> {
    const events: RawIngestionEvent[] = [];
    const now = new Date().toISOString();

    interface RssParserInstance {
      parseURL: (url: string) => Promise<{ items?: Array<{ title?: string; link?: string; guid?: string; pubDate?: string | Date; content?: string; contentSnippet?: string }> }>;
    }
    let parser: RssParserInstance;
    try {
      const mod = await import("rss-parser");
      const ParserClass = (mod as { default?: unknown }).default ?? mod;
      parser = new (ParserClass as new (opts?: { timeout?: number }) => RssParserInstance)({ timeout: 15_000 });
    } catch {
      return events;
    }

    const seen = new Set<string>();

    for (const feedUrl of FUNDING_RSS_FEEDS) {
      try {
        const feed = await parser.parseURL(feedUrl);
        const items = feed.items ?? [];
        for (const item of items) {
          const title = item.title ?? "";
          const link = item.link ?? item.guid ?? feedUrl;
          const content = [title, item.content, item.contentSnippet].filter(Boolean).join(" ");
          const isFunding = /raises?|funding|secures?\s+\$|series\s+[a-d]|seed\s+round|venture\s+capital/i.test(content);
          if (!isFunding) continue;

          const company = extractCompanyFromTitle(title);
          if (!company || company.length < 2 || company.length > 120) continue;
          const fundingRoundType = detectFundingRoundType(content);
          const { amount, currency } = extractFundingAmount(content);
          const investors = extractLeadInvestors(content);
          const key = `${company.toLowerCase()}:${link}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const detectedAt =
            typeof item.pubDate === "string"
              ? item.pubDate
              : item.pubDate instanceof Date
                ? item.pubDate.toISOString()
                : now;
          events.push({
            source_type: "funding_news",
            source_url: link,
            external_id: `funding:${link}`,
            company_name_raw: company,
            event_type: "funding_event_detected",
            metadata: {
              title,
              feed: feedUrl,
              funding_round_type: fundingRoundType,
              funding_amount: amount,
              funding_currency: currency,
              investors,
            },
            detected_at: detectedAt,
          });
        }
      } catch {
        // Skip this feed on parse/network errors
      }
    }

    return events;
  },
};
