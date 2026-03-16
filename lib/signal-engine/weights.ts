/**
 * V1 signal weights and types. Authority: docs/PRD.md, docs/BACKEND_STRUCTURE.md
 */
export const SIGNAL_WEIGHTS = {
  job_post: 35,
  hiring_spike: 70,
  engineering_hiring: 45,
  ai_hiring: 60,
  remote_hiring: 20,
  new_department_hiring: 50,
  leadership_hiring: 65,
  funding_event: 80,
  ft1000_growth: 20,
} as const;

export type SignalType = keyof typeof SIGNAL_WEIGHTS;
