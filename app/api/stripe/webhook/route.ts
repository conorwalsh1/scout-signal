import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

const relevant = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not set" }, { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: { type: string; data: { object?: { metadata?: { user_id?: string }; status?: string } } };
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, secret) as typeof event;
  } catch (e) {
    console.error("[stripe webhook] signature verification failed", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!relevant.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceClient();
  const obj = event.data?.object as { metadata?: { user_id?: string }; client_reference_id?: string; status?: string };
  const userId = obj?.metadata?.user_id ?? (event.type === "checkout.session.completed" ? obj?.client_reference_id : undefined);

  if (event.type === "checkout.session.completed" && userId) {
    const { error } = await supabase
      .from("users")
      .update({ plan: "pro" })
      .eq("id", userId);
    if (error) console.error("[stripe webhook] update user plan failed", error);
  }

  if (event.type === "customer.subscription.updated") {
    const status = obj?.status;
    if (userId && (status === "active" || status === "trialing")) {
      await supabase.from("users").update({ plan: "pro" }).eq("id", userId);
    }
    if (userId && (status === "canceled" || status === "unpaid" || status === "past_due")) {
      await supabase.from("users").update({ plan: "basic" }).eq("id", userId);
    }
  }

  if (event.type === "customer.subscription.deleted" && userId) {
    await supabase.from("users").update({ plan: "basic" }).eq("id", userId);
  }

  return NextResponse.json({ received: true });
}
