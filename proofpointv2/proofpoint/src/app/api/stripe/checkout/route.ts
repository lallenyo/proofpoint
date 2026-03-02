import { auth } from "@clerk/nextjs/server";
import { stripe, PLAN_PRICE_IDS } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { priceId, seats = 1, billingInterval = "monthly" } = body;

    // Validate priceId
    const validPriceIds = Object.values(PLAN_PRICE_IDS).filter(Boolean);
    if (!priceId || !validPriceIds.includes(priceId)) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }

    // Check if user already has a Stripe customer
    const supabase = getSupabaseAdmin();
    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_customer_id")
      .eq("owner_user_id", userId)
      .single();

    let customerId = org?.stripe_customer_id;

    if (!customerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        metadata: { clerk_user_id: userId },
      });
      customerId = customer.id;
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: seats,
        },
      ],
      subscription_data: {
        metadata: {
          clerk_user_id: userId,
          billing_interval: billingInterval,
          seats: String(seats),
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?checkout=canceled`,
      metadata: {
        clerk_user_id: userId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
