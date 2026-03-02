import { stripe, tierFromPriceId, AI_ACTIONS_PER_SEAT } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Disable body parsing — Stripe needs raw body for signature verification
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    console.error("Webhook signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkUserId = session.metadata?.clerk_user_id;
        if (!clerkUserId) break;

        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.toString();

        // Fetch subscription details
        let tier = "starter";
        let seats = 1;
        let billingInterval = "monthly";
        let periodEnd: string | null = null;
        let aiLimit = 500;

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId) as unknown as Stripe.Subscription;
          const priceId = sub.items?.data?.[0]?.price?.id;
          if (priceId) tier = tierFromPriceId(priceId);
          seats = sub.items?.data?.[0]?.quantity || 1;
          billingInterval = sub.metadata?.billing_interval || "monthly";
          const periodEndTs = (sub as unknown as Record<string, unknown>).current_period_end as number | undefined;
          periodEnd = periodEndTs
            ? new Date(periodEndTs * 1000).toISOString()
            : null;
          aiLimit = (AI_ACTIONS_PER_SEAT[tier] || 500) * seats;
        }

        // Upsert organization
        await supabase.from("organizations").upsert(
          {
            owner_user_id: clerkUserId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId || null,
            plan_tier: tier,
            seats_purchased: seats,
            billing_interval: billingInterval,
            subscription_status: "active",
            current_period_end: periodEnd,
            ai_actions_limit: aiLimit,
            ai_actions_used: 0,
          },
          { onConflict: "owner_user_id" }
        );
        break;
      }

      case "customer.subscription.updated": {
        const subObj = event.data.object as unknown as Record<string, unknown>;
        const subMeta = (subObj.metadata || {}) as Record<string, string>;
        const clerkUserId = subMeta.clerk_user_id;
        if (!clerkUserId) break;

        const subItems = subObj.items as { data?: Array<{ price?: { id?: string }; quantity?: number }> } | undefined;
        const priceId = subItems?.data?.[0]?.price?.id;
        const tier = priceId ? tierFromPriceId(priceId) : "starter";
        const seats = subItems?.data?.[0]?.quantity || 1;
        const aiLimit = (AI_ACTIONS_PER_SEAT[tier] || 500) * seats;
        const periodEndTs = subObj.current_period_end as number | undefined;

        await supabase
          .from("organizations")
          .update({
            plan_tier: tier,
            seats_purchased: seats,
            subscription_status: subObj.status === "active" ? "active" : String(subObj.status || "active"),
            current_period_end: periodEndTs
              ? new Date(periodEndTs * 1000).toISOString()
              : null,
            ai_actions_limit: aiLimit,
          })
          .eq("owner_user_id", clerkUserId);
        break;
      }

      case "customer.subscription.deleted": {
        const delObj = event.data.object as unknown as Record<string, unknown>;
        const delMeta = (delObj.metadata || {}) as Record<string, string>;
        const clerkUserId = delMeta.clerk_user_id;
        if (!clerkUserId) break;

        await supabase
          .from("organizations")
          .update({
            plan_tier: "trial",
            subscription_status: "canceled",
            ai_actions_limit: 50, // Minimal free access
          })
          .eq("owner_user_id", clerkUserId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.toString();

        if (customerId) {
          await supabase
            .from("organizations")
            .update({ subscription_status: "past_due" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
