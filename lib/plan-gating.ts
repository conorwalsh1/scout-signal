/**
 * V1 plan limits. Authority: docs/PRD.md
 */
export const BASIC_FEED_LIMIT = 20;
export const BASIC_SAVED_LIMIT = 10;

export type Plan = "basic" | "pro";

export function feedLimit(plan: Plan): number {
  return plan === "pro" ? 500 : BASIC_FEED_LIMIT;
}

export function savedLimit(plan: Plan): number {
  return plan === "pro" ? 1000 : BASIC_SAVED_LIMIT;
}
