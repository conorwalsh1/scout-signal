import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  // Good-enough validation for UX; DB uniqueness prevents duplicates.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const maxDuration = 15;

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();

  try {
    const body = (await request.json()) as { email?: unknown; agency_name?: unknown };
    const emailRaw = typeof body?.email === "string" ? body.email : "";
    const agencyRaw = typeof body?.agency_name === "string" ? body.agency_name : "";

    const email = normalizeEmail(emailRaw);
    const agency_name = agencyRaw.trim();

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (agency_name.length < 2) {
      return NextResponse.json({ error: "Agency name is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("beta_requests")
      .upsert(
        {
          email,
          agency_name,
        },
        { onConflict: "email" }
      );

    if (error) {
      // If the row already exists, treat it as success (idempotent).
      // Any real error will still be returned.
      return NextResponse.json({ error: error.message ?? "Failed to save request" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed" },
      { status: 500 }
    );
  }
}

