/**
 * Cron-triggered pipeline entry point.
 *
 * Default scheduled behavior is ingestion-only so the request stays within
 * Vercel's runtime limits. To run the full pipeline manually, call:
 *   GET /api/cron/ingest?full=1
 * or send header:
 *   x-run-full-pipeline: 1
 *
 * Call with: GET or POST, header Authorization: Bearer <CRON_SECRET>.
 * On Vercel, set CRON_SECRET in env and add a cron schedule in vercel.json.
 */
import { NextRequest, NextResponse } from "next/server";
import { completeCronRun, createCronRun, type CronTriggerSource } from "@/lib/cron-runs";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  // Vercel Cron requests include this header.
  const fromVercelCron = request.headers.get("x-vercel-cron") === "1";
  if (fromVercelCron) return true;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const fromQuery = request.nextUrl.searchParams.get("secret");
  if (fromQuery && fromQuery === secret) return true;

  return false;
}

function wantsFullPipeline(request: NextRequest): boolean {
  const fromQuery = request.nextUrl.searchParams.get("full");
  const fromHeader = request.headers.get("x-run-full-pipeline");
  return fromQuery === "1" || fromQuery === "true" || fromHeader === "1" || fromHeader === "true";
}

function getTriggerSource(request: NextRequest): CronTriggerSource {
  if (request.headers.get("x-vercel-cron") === "1") return "vercel_cron";
  if (request.headers.get("x-cron-source") === "github_actions") return "github_actions";
  if (request.headers.get("authorization")) return "manual_auth";
  if (request.nextUrl.searchParams.get("secret")) return "manual_query";
  return "unknown";
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fullPipeline = wantsFullPipeline(request);
  const runId = await createCronRun({
    jobName: fullPipeline ? "ingest_full" : "ingest",
    triggerSource: getTriggerSource(request),
    deploymentHost: request.headers.get("host"),
    details: {
      full_pipeline: fullPipeline,
      path: request.nextUrl.pathname,
    },
  });

  try {
    const { run: runIngestion } = await import("@/workers/run-ingestion");
    await runIngestion({ includeStaticConnectors: fullPipeline });

    if (!fullPipeline) {
      await completeCronRun({
        id: runId,
        status: "succeeded",
        details: {
          mode: "ingestion_only",
        },
      });
      return NextResponse.json({
        ok: true,
        mode: "ingestion_only",
        message: "Ingestion complete. Static FT1000 scans, signals, and scoring were skipped to keep cron runs within runtime limits.",
      });
    }

    const { run: runSignals } = await import("@/workers/run-signals");
    await runSignals();

    const { run: runScore } = await import("@/workers/run-score");
    await runScore();

    await completeCronRun({
      id: runId,
      status: "succeeded",
      details: {
        mode: "full_pipeline",
      },
    });
    return NextResponse.json({ ok: true, mode: "full_pipeline", message: "Pipeline complete" });
  } catch (e) {
    console.error("[cron/ingest]", e);
    await completeCronRun({
      id: runId,
      status: "failed",
      details: {
        error: e instanceof Error ? e.message : String(e),
      },
    });
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
