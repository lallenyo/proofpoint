# Proofpoint — Full Audit & Architecture Plan

> Generated from review of all 8 project files + all 20 project conversations
> Date: March 1, 2026

---

## 1. FILE INVENTORY & STATUS

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `proofpoint-unified.jsx` | 6,426 | **Canonical app** — 11-tool platform with sidebar nav, onboarding wizard, demo data | ✅ KEEP — Primary deliverable |
| `proofpoint-landing.html` | ~900 | Marketing site — hero, features, pricing, blog (5 competitor posts), waitlist CTA | ✅ KEEP — Public-facing marketing |
| `proofpoint-signup.html` | ~400 | Signup page — Clerk auth, plan selection, trial logic | ✅ KEEP — Auth flow |
| `proofpoint-admin.html` | ~600 | Admin dashboard — waitlist viewer, Supabase connection | ✅ KEEP — Internal tool |
| `proofpoint-setup-plan.md` | 536 | Next.js deployment plan — phases 0-5 | ✅ KEEP — Deployment reference |
| `Customer_Success_Management_Research_2026.pdf` | — | Market research validating product positioning | ✅ KEEP — Strategic reference |
| `proofpoint-app.jsx` | 1,412 | **REDUNDANT** — Simpler 9-page version superseded by unified | ⚠️ DELETE |
| `proofpoint-sandbox.jsx` | 483 | **REDUNDANT** — Basic landing+signup demo, superseded by unified's onboarding | ⚠️ DELETE |

---

## 2. CRITICAL ISSUES FOUND

### 🔴 Issue 1: API Key Exposure (SECURITY — HIGH)

**Both JSX files** call the Anthropic API directly from the browser:

- `proofpoint-unified.jsx` line 154: `fetch("https://api.anthropic.com/v1/messages")`
- `proofpoint-app.jsx` line 147: same

The setup plan (Phase 1) specifies routing through `/api/anthropic`, but **neither JSX file has been updated**. In production, this exposes your API key in the browser's Network tab.

**Fix:** Change `callClaude()` URL to `/api/anthropic`, remove direct headers.

---

### 🔴 Issue 2: Pricing Inconsistency (BUSINESS — HIGH)

| Source | Tier 1 | Tier 2 | Correct? |
|--------|--------|--------|----------|
| `proofpoint-landing.html` | Starter $49/mo | Team $199/mo | ❌ Old pricing |
| `proofpoint-signup.html` | Solo $9/mo | Team $29/mo | ✅ Correct |
| Blog posts in landing | Mix of $49 and $199 | — | ❌ Stale |

**User's preference** (from SMB chat + testing chats): **$9/mo Solo, $29/mo Team** with 30-day free trial.

---

### 🟡 Issue 3: Missing Features in Unified

Features built in past chats but **NOT in** `proofpoint-unified.jsx`:

| Feature | Built In | Status |
|---------|----------|--------|
| **Email Drafting** — 8 templates, SendGrid, compose modal, 4 tabs | Latest chat | ❌ MISSING |
| **Enhanced PDF Export** — jsPDF, cover page, logo upload | PDF chat | ❌ MISSING |
| **HubSpot Auto-Fill** — Token input, company search in generator | SMB chat | ❌ MISSING |
| **Slide Deck Prompt Generator** | — | ✅ Present |

### 🟡 Issue 4: Landing ↔ App Disconnect

- No "Launch Sandbox" button on landing
- No "Log In" link on landing
- Landing CTA goes to waitlist, not signup
- No Terms/Privacy pages linked from landing

---

## 3. UNIFIED FILE — ALL 11 PANELS VERIFIED

| Nav Item | Component | Lines | Working |
|----------|-----------|-------|---------|
| My Dashboard | `CustomDashPanel` | 4869-5077 | ✅ |
| Portfolio | `DashboardPanel` | 733-885 | ✅ |
| Health Scores | `HealthScorePanel` | 1371-1764 | ✅ |
| Playbooks | `PlaybookPanel` | 2070-2459 | ✅ |
| Meetings AI | `MeetingIntelPanel` | 2700-3239 | ✅ |
| NPS / CSAT | `SurveyPanel` | 3481-4017 | ✅ |
| Stakeholders | `StakeholderPanel` | 5311-5670 | ✅ |
| QBR Decks | `QBRDeckPanel` | 4128-4539 | ✅ |
| Report Generator | `GeneratorPanel` | 889-1001 | ✅ |
| Next Actions | `NextActionPanel` | 1005-1081 | ✅ |
| CS ROI Calculator | `ROICalcPanel` | 1085-1166 | ✅ |

Cross-component data flow verified: accounts state passes to all panels, navigation works, report saving works, onboarding gates correctly, logout flow returns to login.

---

## 4. ARCHITECTURE PLAN

### 4A. Current → Target File Mapping

```
CURRENT:                                TARGET (Next.js):
├── proofpoint-landing.html      →      src/app/page.tsx
├── proofpoint-signup.html       →      src/app/sign-up/page.tsx
├── proofpoint-admin.html        →      src/app/admin/page.tsx
├── proofpoint-unified.jsx       →      src/app/dashboard/layout.tsx + pages
├── proofpoint-app.jsx           →      DELETE
├── proofpoint-sandbox.jsx       →      DELETE
├── proofpoint-setup-plan.md     →      KEEP as reference
└── Research PDF                 →      KEEP as reference
```

### 4B. Next.js Production Structure

```
proofpoint/
├── src/app/
│   ├── page.tsx                        ← Landing page
│   ├── sign-up/page.tsx                ← Signup with Clerk
│   ├── sign-in/page.tsx                ← Login with Clerk
│   ├── blog/page.tsx                   ← Blog + competitor posts
│   ├── terms/page.tsx                  ← Terms of Service
│   ├── privacy/page.tsx                ← Privacy Policy
│   ├── admin/page.tsx                  ← Waitlist admin
│   ├── sandbox/page.tsx                ← Public demo (no auth)
│   │
│   ├── dashboard/                      ← PROTECTED by Clerk
│   │   ├── layout.tsx                  ← Sidebar + nav shell
│   │   ├── page.tsx                    ← Custom Dashboard
│   │   ├── portfolio/page.tsx
│   │   ├── health/page.tsx
│   │   ├── playbooks/page.tsx
│   │   ├── meetings/page.tsx
│   │   ├── surveys/page.tsx
│   │   ├── stakeholders/page.tsx
│   │   ├── qbr/page.tsx
│   │   ├── generator/page.tsx
│   │   ├── actions/page.tsx
│   │   ├── roi/page.tsx
│   │   └── email/page.tsx              ← NEEDS INTEGRATION
│   │
│   └── api/
│       ├── anthropic/route.ts          ← Claude proxy (key hidden)
│       ├── hubspot/route.ts            ← HubSpot proxy
│       ├── reports/route.ts            ← Supabase reports
│       └── email/route.ts              ← SendGrid delivery
│
├── middleware.ts                        ← Clerk auth guard
└── .env.local                          ← All secrets
```

### 4C. User Flow

```
[Landing] → "Try Free" → [Signup] → [Clerk] → [Onboarding Wizard] → [Dashboard]
    ├── "How it works" → scroll
    ├── "Pricing" → scroll ($9/$29)
    ├── "Blog" → Blog page
    ├── "Log In" → Clerk → Dashboard
    └── "Sandbox" → Demo mode (no auth)
```

### 4D. Data Flow

```
[Clerk] → userId → [Supabase] → reports, profiles, usage
                        ↕
                   [Dashboard]
                   ├── /api/anthropic  ← AI generation
                   ├── /api/hubspot    ← CRM data
                   ├── /api/reports    ← Persistence
                   └── /api/email      ← SendGrid
```

---

## 5. REQUIRED FIXES (PRIORITY ORDER)

### P0 — Before Any Demo/Deploy

| # | Issue | Fix |
|---|-------|-----|
| 1 | API key exposure in `callClaude()` | Change URL to `/api/anthropic` |
| 2 | Landing page pricing ($49/$199) | Update to $9/$29 everywhere |

### P1 — Missing Features

| # | Feature | Action |
|---|---------|--------|
| 3 | Email Drafting (8 templates, SendGrid) | Integrate 700-line module + add nav item |
| 4 | Enhanced PDF Export (cover page, logo) | Add jsPDF/html2canvas to GeneratorPanel |
| 5 | HubSpot Auto-Fill in Generator | Add HubSpotPanel to GeneratorPanel Step 2 |

### P2 — Content & Navigation

| # | Fix |
|---|-----|
| 6 | Add "Launch Sandbox" button to landing page |
| 7 | Add "Log In" link to landing nav |
| 8 | Update all blog pricing references to $9/$29 |
| 9 | Add Terms of Service page |
| 10 | Add Privacy Policy page |

### P3 — Cleanup

| # | Action |
|---|--------|
| 11 | Delete `proofpoint-app.jsx` |
| 12 | Delete `proofpoint-sandbox.jsx` |

---

## 6. CHAT REQUEST → STATUS TRACKER

| Chat | Request | Status |
|------|---------|--------|
| CS officer challenges | Industry benchmarks with citations | ✅ |
| Next action layer (x2) | AI next actions with talking points | ✅ |
| CS program ROI calc (x2) | VP/Director ROI tool | ✅ |
| SMB market strategy | HubSpot auto-fill in generator | ❌ Missing |
| File synchronization | Consistent branding | ✅ |
| Competitive analysis | Blog with 5 competitor posts | ✅ |
| Dashboard sandbox | 20 mock clients | ⚠️ Reduced to 6 |
| PDF output | jsPDF cover page, logo upload | ❌ Missing |
| Supabase setup | DB schema + waitlist | ✅ |
| Unified sync | Single file combining tools | ✅ |
| Next.js port | Secure API architecture | ⚠️ Plan only |
| SMB landing | $9/$29 pricing, trial | ✅ Signup / ❌ Landing |
| Complete website | Terms, Privacy, Login, Blog | ⚠️ Partial |
| Website testing (x2) | Cohesive nav, pricing | ⚠️ Pricing wrong |
| Email drafting (latest) | 8 templates, SendGrid | ❌ Not in unified |

---

## 7. ENV VARIABLES FOR PRODUCTION

```bash
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://aqjipvwouguqjuibqdmz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=...
SENDGRID_API_KEY=...
```

---

## 8. BOTTOM LINE

**Unified file is solid** — 11 tools, consistent design, proper nav, demo data flowing correctly, polished onboarding. The core platform works.

**3 biggest gaps:**
1. Email drafting system (fully built, not merged)
2. PDF export + HubSpot auto-fill (built in earlier chats, not carried forward)
3. Landing page pricing contradicts SMB strategy

**Path to production:** Fix API proxy → integrate missing features → align pricing → deploy via Next.js plan.
