import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/", url.origin), { status: 302 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value ?? null;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
        },
        remove(name: string, options: Record<string, unknown>) {
          response.cookies.set(name, "", { ...options, maxAge: 0 } as Parameters<typeof response.cookies.set>[2]);
        },
      },
    }
  );
  await supabase.auth.signOut();
  return response;
}
