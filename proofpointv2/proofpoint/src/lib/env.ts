// ═══════════════════════════════════════════════════════════════════════════
// Environment Variable Validation
// ═══════════════════════════════════════════════════════════════════════════

interface EnvVar {
  name: string;
  required: boolean;
  isPublic: boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  {
    name: "ANTHROPIC_API_KEY",
    required: true,
    isPublic: false,
    description: "Anthropic API key for AI report generation",
  },
  {
    name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    required: true,
    isPublic: true,
    description: "Clerk publishable key for authentication",
  },
  {
    name: "CLERK_SECRET_KEY",
    required: true,
    isPublic: false,
    description: "Clerk secret key for server-side auth",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    isPublic: true,
    description: "Supabase project URL",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    isPublic: true,
    description: "Supabase anonymous key for client-side queries",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    isPublic: false,
    description: "Supabase service role key for admin operations",
  },
  {
    name: "STRIPE_SECRET_KEY",
    required: false,
    isPublic: false,
    description: "Stripe secret key for billing",
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    required: false,
    isPublic: false,
    description: "Stripe webhook endpoint secret",
  },
  {
    name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    required: false,
    isPublic: true,
    description: "Stripe publishable key for client-side checkout",
  },
  {
    name: "SENTRY_DSN",
    required: false,
    isPublic: false,
    description: "Sentry DSN for error tracking",
  },
  {
    name: "NEXT_PUBLIC_SENTRY_DSN",
    required: false,
    isPublic: true,
    description: "Sentry DSN for client-side error tracking",
  },
  {
    name: "HUBSPOT_ACCESS_TOKEN",
    required: false,
    isPublic: false,
    description: "HubSpot private app access token for CRM sync",
  },
];

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

export function validateEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];

    if (envVar.required && !value) {
      missing.push(`${envVar.name} — ${envVar.description}`);
    } else if (!envVar.required && !value) {
      warnings.push(`${envVar.name} — ${envVar.description} (optional, some features may be disabled)`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

// Helper to get a validated env var with a fallback
export function getEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (!value && fallback === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || fallback || "";
}
