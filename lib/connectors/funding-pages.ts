import * as cheerio from "cheerio";
import { createServiceClient } from "@/lib/supabase/service";
import type { RawIngestionEvent } from "@/types/ingestion";
import type { SourceConnector } from "./types";
import {
  detectFundingRoundType,
  extractFundingAmount,
  extractLeadInvestors,
} from "./funding-utils";

const FUNDING_PATHS = ["/press", "/news", "/newsroom", "/blog", "/press-releases"];
const FUNDING_HINT_RE = /\b(raises?|raised|secures?|secured|announces? funding|series\s+[a-f]|pre-seed|seed round|growth round|strategic investment)\b/i;

function normalizeBaseUrl(sourceUrl: string | null, companyDomain: string | null): string | null {
  if (sourceUrl?.startsWith("http")) return sourceUrl.replace(/\/+$/, "");
  if (companyDomain) return `https://${companyDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return null;
}

function toAbsoluteUrl(baseUrl: string, href: string | null | undefined): string | null {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function buildCandidateUrls(baseUrl: string): string[] {
  const candidates = new Set<string>([baseUrl]);
  for (const path of FUNDING_PATHS) {
    candidates.add(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
  }
  return Array.from(candidates);
}

export const fundingPagesConnector: SourceConnector = {
  sourceType: "funding_page",

  async fetch(): Promise<RawIngestionEvent[]> {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("monitored_sources")
      .select("id, company_name, company_domain, source_url, active")
      .eq("source_type", "funding_page")
      .eq("active", true);

    if (error || !data?.length) return [];

    const events: RawIngestionEvent[] = [];
    const seen = new Set<string>();
    const nowIso = new Date().toISOString();

    for (const row of data) {
      const baseUrl = normalizeBaseUrl(row.source_url, row.company_domain);
      if (!baseUrl) continue;

      for (const url of buildCandidateUrls(baseUrl)) {
        try {
          const res = await fetch(url, {
            headers: { "User-Agent": "ScoutSignal/1.0 (compatible; funding-page scan)" },
            redirect: "follow",
            signal: AbortSignal.timeout(10_000),
          });
          if (!res.ok) continue;

          const html = await res.text();
          const $ = cheerio.load(html);
          const candidates = new Map<string, string>();

          $("a, h1, h2, h3, article, li").each((_, node) => {
            const text = $(node).text().replace(/\s+/g, " ").trim();
            if (!text || text.length < 12 || !FUNDING_HINT_RE.test(text)) return;

            const href = $(node).is("a")
              ? $(node).attr("href")
              : $(node).find("a").first().attr("href");
            const absoluteUrl = toAbsoluteUrl(url, href) ?? url;

            if (!candidates.has(absoluteUrl)) candidates.set(absoluteUrl, text);
          });

          for (const [candidateUrl, text] of Array.from(candidates.entries())) {
            const fundingRoundType = detectFundingRoundType(text);
            const { amount, currency } = extractFundingAmount(text);
            const investors = extractLeadInvestors(text);
            const externalId = `funding_page:${candidateUrl}`;
            if (seen.has(externalId)) continue;
            seen.add(externalId);

            events.push({
              source_type: "funding_page",
              source_url: candidateUrl,
              external_id: externalId,
              company_name_raw: row.company_name,
              company_domain: row.company_domain ?? undefined,
              event_type: "funding_event_detected",
              metadata: {
                title: text,
                funding_round_type: fundingRoundType,
                funding_amount: amount,
                funding_currency: currency,
                investors,
                listing_source: "funding_page",
              },
              detected_at: nowIso,
            });
          }
        } catch {
          continue;
        }
      }
    }

    return events;
  },
};
