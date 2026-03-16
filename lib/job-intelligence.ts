const ENGINEERING_KEYWORDS = [
  "engineer",
  "engineering",
  "developer",
  "software",
  "platform",
  "backend",
  "front end",
  "frontend",
  "full stack",
  "fullstack",
  "devops",
  "sre",
  "site reliability",
  "mobile",
  "ios",
  "android",
  "qa",
  "quality assurance",
  "test automation",
  "security engineer",
  "architect",
];

const SALES_KEYWORDS = ["sales", "account executive", "business development", "bdr", "sdr", "partnerships"];
const MARKETING_KEYWORDS = ["marketing", "growth", "brand", "content", "seo", "crm"];
const PRODUCT_KEYWORDS = ["product manager", "product owner", "product design", "ux", "ui", "designer", "design"];
const DATA_KEYWORDS = ["data", "analytics", "analyst", "scientist", "bi", "intelligence"];
const OPERATIONS_KEYWORDS = ["operations", "supply chain", "logistics", "procurement", "strategy", "program manager"];
const CUSTOMER_KEYWORDS = ["customer success", "support", "customer service", "implementation", "onboarding"];
const FINANCE_KEYWORDS = ["finance", "accounting", "controller", "fp&a", "treasury"];
const PEOPLE_KEYWORDS = ["people", "talent", "recruit", "human resources", "hr", "learning and development"];
const LEGAL_KEYWORDS = ["legal", "compliance", "privacy", "risk", "regulatory"];

const AI_KEYWORDS = [
  " ai ",
  "ai/",
  "artificial intelligence",
  "machine learning",
  "ml ",
  "ml/",
  "llm",
  "large language model",
  "generative ai",
  "genai",
  "computer vision",
  "nlp",
  "deep learning",
];

const REMOTE_KEYWORDS = [
  "remote",
  "hybrid",
  "distributed",
  "work from home",
  "anywhere",
];

export type JobDepartment =
  | "engineering"
  | "sales"
  | "marketing"
  | "product"
  | "data"
  | "operations"
  | "customer"
  | "finance"
  | "people"
  | "legal"
  | "other";

export interface JobListingInput {
  title: string;
  location?: string | null;
}

export interface ClassifiedJob {
  title: string;
  department: JobDepartment;
  is_ai: boolean;
  is_remote: boolean;
  is_leadership: boolean;
  leadership_role: string | null;
}

export interface JobPortfolioSummary {
  job_count: number;
  engineering_job_count: number;
  ai_job_count: number;
  remote_job_count: number;
  leadership_job_count: number;
  department_counts: Partial<Record<JobDepartment, number>>;
  departments: JobDepartment[];
  sample_titles: string[];
}

const LEADERSHIP_RULES: Array<{ label: string; needles: string[] }> = [
  { label: "cto", needles: ["chief technology officer", "cto"] },
  { label: "vp_engineering", needles: ["vp engineering", "vice president engineering", "vp of engineering"] },
  { label: "head_of_ai", needles: ["head of ai", "head of machine learning", "director of ai", "ai lead", "ml lead"] },
  { label: "vp_sales", needles: ["vp sales", "vice president sales", "head of sales", "sales director"] },
  { label: "executive", needles: ["chief", "vp ", "vice president", "head of ", "director"] },
];

function normalize(value: string | null | undefined): string {
  return ` ${String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim()} `;
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

export function classifyJobListing(input: JobListingInput): ClassifiedJob {
  const title = input.title.trim();
  const haystack = `${normalize(input.title)} ${normalize(input.location)}`;
  const leadershipRole =
    LEADERSHIP_RULES.find((rule) => includesAny(haystack, rule.needles))?.label ?? null;

  let department: JobDepartment = "other";
  if (includesAny(haystack, ENGINEERING_KEYWORDS)) department = "engineering";
  else if (includesAny(haystack, SALES_KEYWORDS)) department = "sales";
  else if (includesAny(haystack, MARKETING_KEYWORDS)) department = "marketing";
  else if (includesAny(haystack, PRODUCT_KEYWORDS)) department = "product";
  else if (includesAny(haystack, DATA_KEYWORDS)) department = "data";
  else if (includesAny(haystack, OPERATIONS_KEYWORDS)) department = "operations";
  else if (includesAny(haystack, CUSTOMER_KEYWORDS)) department = "customer";
  else if (includesAny(haystack, FINANCE_KEYWORDS)) department = "finance";
  else if (includesAny(haystack, PEOPLE_KEYWORDS)) department = "people";
  else if (includesAny(haystack, LEGAL_KEYWORDS)) department = "legal";

  return {
    title,
    department,
    is_ai: includesAny(haystack, AI_KEYWORDS),
    is_remote: includesAny(haystack, REMOTE_KEYWORDS),
    is_leadership: leadershipRole != null,
    leadership_role: leadershipRole,
  };
}

export function summarizeJobPortfolio(listings: JobListingInput[]): JobPortfolioSummary {
  const classified = listings.map(classifyJobListing);
  const department_counts: Partial<Record<JobDepartment, number>> = {};

  for (const job of classified) {
    department_counts[job.department] = (department_counts[job.department] ?? 0) + 1;
  }

  const departments = Object.keys(department_counts)
    .filter((key) => key !== "other")
    .sort() as JobDepartment[];

  return {
    job_count: classified.length,
    engineering_job_count: classified.filter((job) => job.department === "engineering").length,
    ai_job_count: classified.filter((job) => job.is_ai).length,
    remote_job_count: classified.filter((job) => job.is_remote).length,
    leadership_job_count: classified.filter((job) => job.is_leadership).length,
    department_counts,
    departments,
    sample_titles: classified.slice(0, 5).map((job) => job.title),
  };
}

export function getDepartmentsFromMetadata(metadata: Record<string, unknown>): JobDepartment[] {
  const rawDepartments = metadata.departments;
  if (Array.isArray(rawDepartments)) {
    return rawDepartments.filter((value): value is JobDepartment => typeof value === "string");
  }

  const rawCounts = metadata.department_counts;
  if (rawCounts && typeof rawCounts === "object") {
    return Object.keys(rawCounts)
      .filter((key) => key !== "other")
      .filter((key) => typeof (rawCounts as Record<string, unknown>)[key] === "number") as JobDepartment[];
  }

  const rawDepartment = metadata.department;
  if (typeof rawDepartment === "string") {
    return [rawDepartment as JobDepartment];
  }

  return [];
}

export function getNumericMetadata(metadata: Record<string, unknown>, key: string): number {
  const value = metadata[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return 0;
}

export function getLeadershipRolesFromMetadata(metadata: Record<string, unknown>): string[] {
  const explicit = metadata.leadership_role;
  if (typeof explicit === "string" && explicit) return [explicit];

  const roles = metadata.leadership_roles;
  if (Array.isArray(roles)) {
    return roles.filter((value): value is string => typeof value === "string" && value.length > 0);
  }

  return [];
}
