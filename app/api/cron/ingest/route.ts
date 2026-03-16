/**
 * Cron-triggered pipeline: ingestion → signals → score.
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

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { run: runIngestion } = await import("@/workers/run-ingestion");
    await runIngestion();

    const { run: runSignals } = await import("@/workers/run-signals");
    await runSignals();

    const { run: runScore } = await import("@/workers/run-score");
    await runScore();

    return NextResponse.json({ ok: true, message: "Pipeline complete" });
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
