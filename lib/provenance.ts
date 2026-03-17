export type ProvenanceKind = "direct" | "inferred" | "context";

export type ProvenanceInfo = {
  label: string;
  kind: ProvenanceKind;
  /** Lowercase internal id (e.g. greenhouse_hiring). */
  sourceType: string;
};

export function getProvenanceInfo(sourceType: string | null | undefined): ProvenanceInfo | null {
  const t = (sourceType ?? "").trim();
  if (!t) return null;

  if (t === "greenhouse_hiring") return { label: "Greenhouse", kind: "direct", sourceType: t };
  if (t === "lever_hiring") return { label: "Lever", kind: "direct", sourceType: t };
  if (t === "ashby_hiring") return { label: "Ashby", kind: "direct", sourceType: t };

  if (t === "career_page") return { label: "Company careers page", kind: "inferred", sourceType: t };
  if (t === "funding_news") return { label: "News-derived", kind: "inferred", sourceType: t };

  if (t === "ft1000") return { label: "FT1000 (context)", kind: "context", sourceType: t };

  // Default: present but unknown — treat as inferred until we classify it.
  return { label: t.replace(/_/g, " "), kind: "inferred", sourceType: t };
}

export function rankProvenanceSourceTypes(sourceTypes: string[]): string[] {
  const order = new Map<string, number>([
    ["greenhouse_hiring", 0],
    ["lever_hiring", 1],
    ["ashby_hiring", 2],
    ["career_page", 3],
    ["funding_news", 4],
    ["ft1000", 5],
  ]);
  return [...sourceTypes].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
}

export function formatDaysAgo(iso: string, now = new Date()): string | null {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const days = Math.max(0, Math.floor((now.getTime() - t) / (24 * 60 * 60 * 1000)));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

