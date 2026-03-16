/**
 * Recency decay. Authority: docs/PRD.md, docs/BACKEND_STRUCTURE.md
 * 0–7 days: 100%, 8–14: 75%, 15–30: 40%
 */
export function decayFactor(occurredAt: string, now: Date = new Date()): number {
  const then = new Date(occurredAt).getTime();
  const days = (now.getTime() - then) / (24 * 60 * 60 * 1000);
  if (days <= 7) return 1;
  if (days <= 14) return 0.75;
  if (days <= 30) return 0.4;
  return 0;
}
