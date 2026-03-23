import { config } from "dotenv";
config({ path: ".env.local" });

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getTopRankedForWeeklyPost } from "@/lib/landing-data";

const DEFAULT_LIMIT = 25;

function getLimitArg(): number {
  const raw = process.argv[2];
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return parsed;
}

function buildPost(rows: Awaited<ReturnType<typeof getTopRankedForWeeklyPost>>, appUrl: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const header = `Signal Scout weekly funding-to-hiring ranking - ${today}`;
  const intro = [
    `Here are this week's top ${rows.length} recruiter opportunities by Signal Scout rank.`,
    "Ranking is funding-first: fresh Series A-C events lead, with hiring and expansion activity as supporting confirmation.",
    "",
  ];

  const body = rows.map((row) => {
    return `${row.rank}. ${row.name} | ${row.scoreOutOf10}/10 | ${row.signal} | ${row.insight}`;
  });

  const outro = [
    "",
    `Explore more live funding signals: ${appUrl}`,
    "Signals are derived from public sources and are not financial advice.",
    "#recruitment #businessdevelopment #sales #startups #hiring",
  ];

  return [header, "", ...intro, ...body, ...outro].join("\n");
}

async function main() {
  const limit = getLimitArg();
  const rows = await getTopRankedForWeeklyPost(limit);

  if (rows.length === 0) {
    console.error("No ranked companies found. Run scoring first and confirm Supabase env vars are set.");
    process.exit(1);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://signalscoutradar.com";
  const output = buildPost(rows, appUrl);

  const outputDir = path.join(process.cwd(), "docs", "generated");
  await mkdir(outputDir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const filename = `linkedin-weekly-top${rows.length}-${date}.txt`;
  const outputPath = path.join(outputDir, filename);
  await writeFile(outputPath, `${output}\n`, "utf8");

  process.stdout.write(`${output}\n`);
  console.error(`Saved draft to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
