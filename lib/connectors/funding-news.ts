import type { SourceConnector } from "./types";
import type { RawIngestionEvent } from "@/types/ingestion";
import {
  detectFundingRoundType,
  extractCompanyFromFundingTitle,
  extractFundingAmount,
  extractLeadInvestors,
} from "./funding-utils";

const FUNDING_RSS_FEEDS = [
  "https://techcrunch.com/feed/",
  "https://feeds.feedburner.com/venturebeat/SZYF",
];

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

          const company = extractCompanyFromFundingTitle(title);
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
