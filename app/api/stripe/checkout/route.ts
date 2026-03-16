import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe not configured (missing STRIPE_PRO_PRICE_ID)" },
      { status: 500 }
    );
  }

  try {
    const stripe = getStripe();
    const origin = request.headers.get("origin") ?? request.url.split("/").slice(0, 3).join("/");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/account?success=1`,
      cancel_url: `${origin}/pricing?canceled=1`,
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
    });

    if (session.url) {
      return NextResponse.redirect(session.url);
    }
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe checkout]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
