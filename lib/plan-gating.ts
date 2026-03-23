/**
 * V1 plan limits. Authority: docs/PRD.md
 */
export const FREE_FEED_LIMIT = 20;
export const FREE_SAVED_LIMIT = 10;
export const BASIC_FEED_LIMIT = 100;
export const BASIC_SAVED_LIMIT = 25;

export type Plan = "free" | "basic" | "pro";

const PRO_ALIASES = new Set(["pro", "founder_pro", "founder pro", "founding_pro"]);

/**
 * Normalize any DB plan value to the canonical Plan type.
 * Treats all Founder Pro variants as "pro".
 */
export function normalizePlan(raw: string | null | undefined): Plan {
  if (!raw) return "free";
  const lower = raw.trim().toLowerCase();
  if (PRO_ALIASES.has(lower)) return "pro";
  if (lower === "basic") return "basic";
  return "free";
}

export function feedLimit(plan: Plan): number {
  if (plan === "pro") return 500;
  if (plan === "basic") return BASIC_FEED_LIMIT;
  return FREE_FEED_LIMIT;
}

export function savedLimit(plan: Plan): number {
  if (plan === "pro") return 1000;
  if (plan === "basic") return BASIC_SAVED_LIMIT;
  return FREE_SAVED_LIMIT;
}
