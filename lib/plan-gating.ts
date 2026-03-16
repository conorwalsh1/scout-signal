/**
 * V1 plan limits. Authority: docs/PRD.md
 */
export const FREE_FEED_LIMIT = 20;
export const FREE_SAVED_LIMIT = 10;
export const BASIC_FEED_LIMIT = 100;
export const BASIC_SAVED_LIMIT = 25;

export type Plan = "free" | "basic" | "pro";

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
