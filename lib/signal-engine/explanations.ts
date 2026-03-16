import type { ScoreComponents } from "@/types/database";
import type { SignalType } from "./weights";

/** Short label for "Latest Signal" column (e.g. "Hiring surge", "Funding", "Job posts"). */
export function getLatestSignalLabel(scoreComponents: ScoreComponents): string {
  const c = scoreComponents;
  if (c.leadership_hiring) return "Leadership hiring";
  if (c.ai_hiring) return "AI hiring";
  if (c.new_department_hiring) return "New team buildout";
  if (c.engineering_hiring) return "Engineering hiring";
  if (c.hiring_spike) return "Hiring surge";
  if (c.funding_event) return "Funding";
  const jobs = c.job_posts ?? 0;
  if (jobs > 0) return jobs === 1 ? "1 job post" : `${jobs} job posts`;
  if (c.ft1000_listed) return "FT1000";
  return "—";
}

/** Single "Why this matters" one-liner for the company (core intelligence layer). */
export function getWhyThisMatters(scoreComponents: ScoreComponents): string {
  const jobs = scoreComponents.job_posts ?? 0;
  const engineeringJobs = scoreComponents.engineering_job_posts ?? 0;
  const aiJobs = scoreComponents.ai_job_posts ?? 0;
  const remoteJobs = scoreComponents.remote_job_posts ?? 0;
  const leadershipJobs = scoreComponents.leadership_job_posts ?? 0;
  const hasSpike = !!scoreComponents.hiring_spike;
  const hasEngineering = !!scoreComponents.engineering_hiring || engineeringJobs > 0;
  const hasAi = !!scoreComponents.ai_hiring || aiJobs > 0;
  const hasRemote = !!scoreComponents.remote_hiring || remoteJobs > 0;
  const hasLeadership = !!scoreComponents.leadership_hiring || leadershipJobs > 0;
  const newDepartments = Array.isArray(scoreComponents.new_department_names)
    ? scoreComponents.new_department_names.filter((value): value is string => typeof value === "string")
    : [];
  const hasFunding = !!scoreComponents.funding_event;
  const fundingRound = typeof scoreComponents.funding_round_type === "string" ? scoreComponents.funding_round_type : null;
  const hasFt1000 = !!scoreComponents.ft1000_listed;
  const recent7d = scoreComponents.recent_job_posts_7d ?? 0;
  const previous7d = scoreComponents.previous_job_posts_7d ?? 0;

  if (hasLeadership && leadershipJobs > 0) {
    return `${leadershipJobs} leadership role${leadershipJobs !== 1 ? "s" : ""} opened recently — team buildout may follow.`;
  }
  if (hasAi && aiJobs > 0) {
    return `${aiJobs} AI-focused role${aiJobs !== 1 ? "s" : ""} detected recently — capability buildout is underway.`;
  }
  if (hasEngineering && engineeringJobs > 0) {
    return `${engineeringJobs} engineering role${engineeringJobs !== 1 ? "s" : ""} detected recently — the team is expanding.`;
  }
  if (newDepartments.length > 0) {
    return `Hiring has expanded into ${newDepartments.join(", ")} — the company may be building a new function.`;
  }
  if (hasSpike && jobs > 0) {
    return `${jobs} new role${jobs !== 1 ? "s" : ""} posted in the last 7 days — hiring momentum is high.`;
  }
  if (recent7d > previous7d && recent7d > 0) {
    return `${recent7d} roles detected in the last 7 days, up from ${previous7d} the week before.`;
  }
  if (hasRemote && remoteJobs > 0) {
    return `${remoteJobs} remote or hybrid role${remoteJobs !== 1 ? "s" : ""} detected recently.`;
  }
  if (hasSpike) {
    return "Hiring surge detected: multiple new roles in a short window.";
  }
  if (jobs > 0) {
    return `${jobs} new role${jobs !== 1 ? "s" : ""} posted recently.`;
  }
  if (hasFunding) {
    return fundingRound
      ? `${fundingRound.replace(/_/g, " ")} funding detected — hiring capacity may expand soon.`
      : "Funding event detected — company is well-capitalized.";
  }
  if (hasFt1000) {
    return "Listed in FT1000 fast growth ranking.";
  }
  return "No recent signals — check back for updates.";
}

/** Per-signal insight lines (readable intelligence, not raw tags). */
export function buildScoreExplanation(
  scoreComponents: ScoreComponents,
  signalSummaries?: { type: SignalType; count: number }[]
): string[] {
  const lines: string[] = [];
  const jobs = scoreComponents.job_posts ?? 0;
  const engineeringJobs = scoreComponents.engineering_job_posts ?? 0;
  const aiJobs = scoreComponents.ai_job_posts ?? 0;
  const remoteJobs = scoreComponents.remote_job_posts ?? 0;
  const leadershipJobs = scoreComponents.leadership_job_posts ?? 0;
  const newDepartments = Array.isArray(scoreComponents.new_department_names)
    ? scoreComponents.new_department_names.filter((value): value is string => typeof value === "string")
    : [];
  const leadershipRoles = Array.isArray(scoreComponents.leadership_roles)
    ? scoreComponents.leadership_roles.filter((value): value is string => typeof value === "string")
    : [];
  const fundingRound = typeof scoreComponents.funding_round_type === "string" ? scoreComponents.funding_round_type : null;
  const fundingAmount = typeof scoreComponents.funding_amount === "string" ? scoreComponents.funding_amount : null;
  const fundingCurrency = typeof scoreComponents.funding_currency === "string" ? scoreComponents.funding_currency : null;
  const recent7d = scoreComponents.recent_job_posts_7d ?? 0;
  const previous7d = scoreComponents.previous_job_posts_7d ?? 0;

  if (scoreComponents.hiring_spike) {
    lines.push(jobs > 0 ? `${jobs} new roles posted in the last 7 days.` : "Hiring surge: multiple new roles in a short window.");
  } else if (jobs > 0) {
    lines.push(jobs === 1 ? "1 new role posted recently." : `${jobs} new roles posted recently.`);
  }
  if ((scoreComponents.engineering_hiring || engineeringJobs > 0) && engineeringJobs > 0) {
    lines.push(
      engineeringJobs === 1
        ? "1 engineering role detected."
        : `${engineeringJobs} engineering roles detected.`
    );
  }
  if ((scoreComponents.ai_hiring || aiJobs > 0) && aiJobs > 0) {
    lines.push(aiJobs === 1 ? "1 AI-focused role detected." : `${aiJobs} AI-focused roles detected.`);
  }
  if ((scoreComponents.remote_hiring || remoteJobs > 0) && remoteJobs > 0) {
    lines.push(
      remoteJobs === 1
        ? "1 remote or hybrid role detected."
        : `${remoteJobs} remote or hybrid roles detected.`
    );
  }
  if (newDepartments.length > 0) {
    lines.push(`Hiring expanded into ${newDepartments.join(", ")}.`);
  }
  if ((scoreComponents.leadership_hiring || leadershipJobs > 0) && leadershipJobs > 0) {
    const rolesLabel = leadershipRoles.length > 0 ? ` (${leadershipRoles.join(", ")})` : "";
    lines.push(
      leadershipJobs === 1
        ? `1 leadership role detected${rolesLabel}.`
        : `${leadershipJobs} leadership roles detected${rolesLabel}.`
    );
  }
  if (recent7d > previous7d && recent7d > 0) {
    lines.push(`Hiring velocity increased: ${recent7d} roles in the last 7 days vs ${previous7d} the week before.`);
  }
  if (scoreComponents.funding_event) {
    const amountLabel = fundingAmount ? ` ${fundingCurrency ?? ""} ${fundingAmount}`.trim() : null;
    if (fundingRound && amountLabel) {
      lines.push(`${fundingRound.replace(/_/g, " ")} funding detected (${amountLabel}).`);
    } else if (fundingRound) {
      lines.push(`${fundingRound.replace(/_/g, " ")} funding detected.`);
    } else {
      lines.push("Funding event detected.");
    }
  }
  if (scoreComponents.ft1000_listed) {
    const rank = scoreComponents.ft1000_rank;
    lines.push(
      typeof rank === "number"
        ? `Listed in FT1000 fast growth ranking (#${rank}).`
        : "Listed in FT1000 fast growth ranking."
    );
  }
  if (signalSummaries?.length) {
    for (const { type, count } of signalSummaries) {
      if (type === "job_post" && count > 0 && !lines.some((l) => l.includes("role"))) {
        lines.push(`${count} new role${count > 1 ? "s" : ""} posted recently.`);
      }
      if (type === "hiring_spike" && !lines.some((l) => l.includes("Hiring surge") || l.includes("last 7 days"))) {
        lines.push("Hiring surge: multiple new roles in a short window.");
      }
      if (type === "engineering_hiring" && !lines.some((l) => l.includes("engineering role"))) {
        lines.push("Engineering hiring detected.");
      }
      if (type === "ai_hiring" && !lines.some((l) => l.includes("AI-focused"))) {
        lines.push("AI-focused hiring detected.");
      }
      if (type === "remote_hiring" && !lines.some((l) => l.includes("remote or hybrid"))) {
        lines.push("Remote or hybrid hiring detected.");
      }
      if (type === "new_department_hiring" && !lines.some((l) => l.includes("expanded into"))) {
        lines.push("Hiring expanded into a new department.");
      }
      if (type === "leadership_hiring" && !lines.some((l) => l.includes("leadership role"))) {
        lines.push("Leadership hiring detected.");
      }
      if (type === "funding_event" && !lines.some((l) => l.includes("Funding"))) {
        lines.push("Funding event detected.");
      }
      if (type === "ft1000_growth" && !lines.some((l) => l.includes("FT1000"))) {
        lines.push("Listed in FT1000 fast growth ranking.");
      }
    }
  }
  return lines.length ? lines : ["No recent signals"];
}

/** One row in the score breakdown (label + points out of 10). */
export interface ScoreBreakdownRow {
  label: string;
  points: number;
  key: string;
}

/**
 * Build score breakdown for display: "Hiring momentum +4.0", "Funding signal +3.5", etc.
 * Uses stored component points (0–100 scale) and displays as X.X out of 10.
 * If component points are missing (e.g. before next score run), falls back to allocating totalScore by presence.
 */
export function getScoreBreakdown(
  scoreComponents: ScoreComponents,
  totalScore?: number
): ScoreBreakdownRow[] {
  const toPointsOutOf10 = (n: number | undefined) =>
    typeof n === "number" && n > 0 ? Math.round(n * 10) / 100 : 0;
  const hasJob = (scoreComponents.job_posts ?? 0) > 0 || !!scoreComponents.hiring_spike;
  const hasEngineering = !!scoreComponents.engineering_hiring || (scoreComponents.engineering_job_posts ?? 0) > 0;
  const hasAi = !!scoreComponents.ai_hiring || (scoreComponents.ai_job_posts ?? 0) > 0;
  const hasRemote = !!scoreComponents.remote_hiring || (scoreComponents.remote_job_posts ?? 0) > 0;
  const hasNewDepartment = !!scoreComponents.new_department_hiring;
  const hasLeadership = !!scoreComponents.leadership_hiring || (scoreComponents.leadership_job_posts ?? 0) > 0;
  const hasFunding = !!scoreComponents.funding_event;
  const hasFt1000 = !!scoreComponents.ft1000_listed;

  const job = toPointsOutOf10(scoreComponents.job_points);
  const spike = toPointsOutOf10(scoreComponents.hiring_spike_points);
  const engineering = toPointsOutOf10(scoreComponents.engineering_hiring_points);
  const ai = toPointsOutOf10(scoreComponents.ai_hiring_points);
  const remote = toPointsOutOf10(scoreComponents.remote_hiring_points);
  const newDepartment = toPointsOutOf10(scoreComponents.new_department_hiring_points);
  const leadership = toPointsOutOf10(scoreComponents.leadership_hiring_points);
  const funding = toPointsOutOf10(scoreComponents.funding_points);
  const ft1000 = toPointsOutOf10(scoreComponents.ft1000_points);

  const hasStoredBreakdown = job > 0 || spike > 0 || engineering > 0 || ai > 0 || remote > 0 || newDepartment > 0 || leadership > 0 || funding > 0 || ft1000 > 0;
  if (hasStoredBreakdown) {
    const rows: ScoreBreakdownRow[] = [];
    if (job > 0 || spike > 0 || remote > 0) {
      rows.push({ label: "Hiring momentum", points: job + spike + remote, key: "hiring" });
    }
    if (engineering > 0) {
      rows.push({ label: "Engineering buildout", points: engineering, key: "engineering" });
    }
    if (ai > 0) {
      rows.push({ label: "AI hiring", points: ai, key: "ai" });
    }
    if (newDepartment > 0) {
      rows.push({ label: "New department", points: newDepartment, key: "new_department" });
    }
    if (leadership > 0) {
      rows.push({ label: "Leadership hiring", points: leadership, key: "leadership" });
    }
    if (funding > 0) {
      rows.push({ label: "Funding signal", points: funding, key: "funding" });
    }
    if (ft1000 > 0) {
      rows.push({ label: "External recognition", points: ft1000, key: "ft1000" });
    }
    const sum = rows.reduce((a, r) => a + r.points, 0);
    const targetTotal = typeof totalScore === "number" && totalScore > 0
      ? Math.min(10, Math.round((totalScore / 10) * 10) / 10)
      : sum;
    if (sum > 0 && targetTotal > 0 && sum > targetTotal) {
      const scale = targetTotal / sum;
      rows.forEach((r) => { r.points = Math.round(r.points * scale * 10) / 10; });
    }
    return rows;
  }

  if (typeof totalScore !== "number" || totalScore <= 0) return [];
  const outOf10 = Math.min(10, Math.round((totalScore / 100) * 10) / 10);
  const parts: { label: string; share: number; key: string }[] = [];
  if (hasJob) parts.push({ label: "Hiring momentum", share: 0.5, key: "hiring" });
  if (hasEngineering) parts.push({ label: "Engineering buildout", share: 0.2, key: "engineering" });
  if (hasAi) parts.push({ label: "AI hiring", share: 0.2, key: "ai" });
  if (hasRemote || hasNewDepartment) parts.push({ label: "Expansion signals", share: 0.15, key: "expansion" });
  if (hasLeadership) parts.push({ label: "Leadership hiring", share: 0.2, key: "leadership" });
  if (hasFunding) parts.push({ label: "Funding signal", share: 0.35, key: "funding" });
  if (hasFt1000) parts.push({ label: "External recognition", share: 0.15, key: "ft1000" });
  const sum = parts.reduce((a, p) => a + p.share, 0);
  if (sum === 0) return [];
  return parts.map((p) => ({
    label: p.label,
    points: Math.round((outOf10 * (p.share / sum)) * 10) / 10,
    key: p.key,
  }));
}
