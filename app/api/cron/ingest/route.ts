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

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function wantsFullPipeline(request: NextRequest): boolean {
  const fromQuery = request.nextUrl.searchParams.get("full");
  const fromHeader = request.headers.get("x-run-full-pipeline");
  return fromQuery === "1" || fromQuery === "true" || fromHeader === "1" || fromHeader === "true";
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const fullPipeline = wantsFullPipeline(request);
    const { run: runIngestion } = await import("@/workers/run-ingestion");
    await runIngestion({ includeStaticConnectors: fullPipeline });

    if (!fullPipeline) {
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

    return NextResponse.json({ ok: true, mode: "full_pipeline", message: "Pipeline complete" });
  } catch (e) {
    console.error("[cron/ingest]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
