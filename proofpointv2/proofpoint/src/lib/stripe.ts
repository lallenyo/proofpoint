import Stripe from "stripe";

// ── Stripe server-side client (lazy initialization) ──────────────────────
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (!_stripe) {
          const key = process.env.STRIPE_SECRET_KEY;
          if (!key) {
                  throw new Error("STRIPE_SECRET_KEY is not configured");
          }
          _stripe = new Stripe(key, {
                  apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion,
                  typescript: true,
          });
    }
    return _stripe;
}

// Keep backward-compatible export as a getter proxy
export const stripe = new Proxy({} as Stripe, {
    get(_target, prop) {
          return (getStripe() as any)[prop];
    },
});

// ── Plan → Stripe Price ID mapping ────────────────────────────────────────
export const PLAN_PRICE_IDS: Record<string, string | undefined> = {
    starter: process.env.STRIPE_STARTER_PRICE_ID,
    growth: process.env.STRIPE_GROWTH_PRICE_ID,
    scale: process.env.STRIPE_SCALE_PRICE_ID,
};

// ── Tier lookup from Price ID ─────────────────────────────────────────────
export function tierFromPriceId(priceId: string): string {
    if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "starter";
    if (priceId === process.env.STRIPE_GROWTH_PRICE_ID) return "growth";
    if (priceId === process.env.STRIPE_SCALE_PRICE_ID) return "scale";
    return "starter";
}

// ── AI actions per seat by tier ───────────────────────────────────────────
export const AI_ACTIONS_PER_SEAT: Record<string, number> = {
    trial: 2000,
    starter: 500,
    growth: 1000,
    scale: 2000,
};
