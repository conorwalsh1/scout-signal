# Evening Report — 16 March 2026

Summary of work completed today on Scout Signal (auth, payments, deployment, and fixes).

---

## 1. Password reset flow

**Issue:** Reset password link from email sent users to the landing page with no prompt to set a new password.

**Done:**
- Confirmed `/reset-password` exists; root cause was **Supabase Redirect URLs** not including it. Documented that `https://signalscoutradar.com/reset-password` and `http://localhost:3000/reset-password` must be added in Supabase Dashboard → Authentication → URL Configuration.
- After a successful password update, the app now **redirects to `/login?reset=success`** instead of staying on the reset page.
- Login page shows the message *"Password updated. You can log in with your new password now."* when opened with `?reset=success`.
- `onAuthStateChange` on the reset page now treats `SIGNED_IN` as well as `PASSWORD_RECOVERY` so the form appears as soon as the recovery session is established.

**Files:** `app/reset-password/page.tsx`, `app/login/page.tsx`

---

## 2. Email rate limiting (Supabase)

**Issue:** "Email rate limit exceeded" when using forgot-password or signup (limit was 2 emails/hour in Supabase).

**Done:**
- **Login** ("Forgot password?"): when Supabase returns a rate-limit error, the app now shows *"Too many reset emails sent. Please try again in an hour."*
- **Signup**: same pattern — *"Too many signup emails sent. Please try again in an hour."*
- You increased the rate limit in Supabase Dashboard → Authentication → Rate Limits (e.g. "Rate limit for sending emails").

**Files:** `app/login/page.tsx`, `app/signup/page.tsx`

---

## 3. Stripe Checkout (403 and URL handling)

**Issue:** "Access to checkout.stripe.com was denied" (HTTP 403) when opening the Stripe Checkout link (locally and deployed).

**Done:**
- Checkout session **success_url** and **cancel_url** now use a stable base URL: `NEXT_PUBLIC_APP_URL` or `VERCEL_URL`, then request origin. This ties the session to your real domain and can help avoid 403s.
- Documented **NEXT_PUBLIC_APP_URL** (e.g. `https://signalscoutradar.com`) in `docs/DEPLOY.md` and `.env.local.example`.
- You confirmed Checkout **sessions are created successfully** (200 in Stripe logs); the 403 was when the **browser** loaded the Checkout page — often browser/network or test vs live. You later got the Checkout page loading (e.g. via different browser/incognito).

**Files:** `app/api/stripe/checkout/route.ts`, `docs/DEPLOY.md`, `.env.local.example`

---

## 4. Dashboard "Something went wrong" (production)

**Issue:** Server Components render error on the Dashboard in production; generic "Something went wrong" with no details.

**Done:**
- Identified that **`SUPABASE_SERVICE_KEY`** was missing in the **deployed** environment (e.g. Vercel). The dashboard uses `getCompaniesList()` → `createServiceClient()`, which throws if the key is missing.
- Updated the app **error boundary** so that when the error message mentions `supabase_service_key` or `missing next_public_supabase`, it shows a short note to set `SUPABASE_SERVICE_KEY` and other server env vars from `.env.local` in the hosting dashboard (e.g. Vercel → Settings → Environment Variables).
- You were advised to add **SUPABASE_SERVICE_KEY** (and other server vars) in Vercel and redeploy.

**Files:** `app/(app)/error.tsx`

---

## 5. New account registration (signup + email confirmation)

**Issue:** Trouble registering new accounts; confirmation flow was broken.

**Root cause:** The confirmation link sent users to **`/dashboard`** with auth tokens in the **URL hash**. The server never sees the hash, so it treated the user as logged out and redirected to `/login`, and the hash was lost — session never established.

**Done:**
- Added **`/auth/callback`** route (`app/auth/callback/page.tsx`): client-only page that reads the hash, lets the Supabase client set the session, then redirects to `/dashboard` (or `?redirect=`).
- Updated **signup** so **`emailRedirectTo`** is **`/auth/callback`** instead of `/dashboard`.
- You must add these to **Supabase Redirect URLs**:  
  `https://signalscoutradar.com/auth/callback`  
  `http://localhost:3000/auth/callback`
- Wrapped the callback page in `Suspense` (uses `useSearchParams`).

**Files:** `app/auth/callback/page.tsx` (new), `app/signup/page.tsx`

---

## 6. ChunkLoadError (companies detail page)

**Issue:** `ChunkLoadError: Loading chunk app/(app)/companies/[id]/page failed` on localhost.

**Done:**
- Cleared the **`.next`** build cache.
- Advised to **restart the dev server** and **hard refresh** the browser (e.g. Cmd+Shift+R) so the browser doesn’t request stale chunks.

---

## 7. CloudFront 403

**Issue:** 403 from CloudFront: "This distribution is not configured to allow the HTTP request method... supports only cachable requests."

**Done:**
- Clarified: that error means the distribution was only allowing cacheable methods (e.g. GET/HEAD); POST (login, signup, API) would be blocked.
- Since the app is on **Vercel** and the domain is on Vercel, traffic should go to **Vercel**, not CloudFront. If the domain points to CloudFront, update DNS to point to Vercel. If you intentionally use CloudFront, configure the behavior to allow all needed HTTP methods (GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE) and forward them to the origin.

---

## 8. Vercel Domains / DNS (A record)

**Issue:** Adding a DNS A record in Vercel (Name: "subdomain", Value: `76.76.21.21`) produced "Invalid request: 'value' should match format 'ipv4'".

**Done:**
- Clarified: with the domain on **Vercel** (registrar + nameservers), you usually **don’t** add a manual A record for the root; Vercel configures it.
- If adding a record: use the real **Name** (e.g. `@` for root, `www` for www), not the word "subdomain". For `www`, prefer a **CNAME** to `cname.vercel-dns.com`. Retype the value to avoid hidden characters.

---

## 9. High-level recap (for confusion)

**Done:** Wrote a short overview of how the stack fits together: app on Vercel, domain on Vercel, auth via Supabase (redirect URLs required), payments via Stripe (env and domain), and that CloudFront isn’t needed when the domain points to Vercel.

---

## Checklist for you (deployment / config)

- [ ] **Supabase Redirect URLs:** `https://signalscoutradar.com/auth/callback`, `http://localhost:3000/auth/callback`, `https://signalscoutradar.com/reset-password`, `http://localhost:3000/reset-password`
- [ ] **Vercel env vars:** `SUPABASE_SERVICE_KEY`, `NEXT_PUBLIC_APP_URL` (e.g. `https://signalscoutradar.com`), plus other server vars from `.env.local` (Stripe, CRON_SECRET, ADMIN_EMAIL, etc.)
- [ ] **Redeploy** after code changes so `/auth/callback` and updated signup/checkout/reset behaviour are live.
- [ ] **DNS:** No need to add a manual A record for the root domain when it’s on Vercel; leave Vercel to manage it.

---

## Tomorrow’s to-do list

**Deployment & config (finish from today)**  
- [ ] Confirm **Supabase Redirect URLs** include: `https://signalscoutradar.com/auth/callback`, `http://localhost:3000/auth/callback`, `https://signalscoutradar.com/reset-password`, `http://localhost:3000/reset-password`.  
- [ ] Confirm **Vercel** has `SUPABASE_SERVICE_KEY`, `NEXT_PUBLIC_APP_URL`, and other server vars from `.env.local`.  
- [ ] **Redeploy** if you haven’t yet (so `/auth/callback` and updated signup/checkout/reset are live).  
- [ ] **Smoke-test** on production: signup → confirm email → land on dashboard; password reset → set new password → redirect to login; upgrade to Pro → complete Checkout.

**Phase 12 (from progress.txt)**  
- [ ] Continue **manual verified website enrichment** for high-value FT1000 companies still missing website/domain.  
- [ ] Run through **docs/VALIDATION.md**: show to 3–5 recruiters, capture feedback on signal trust and score clarity, then iterate before adding features (aim for first paying stranger).  
- [ ] Use the cleaned FT1000 cohort to improve job-post, funding, and leadership-hire signal quality.  
- [ ] Keep **progress.txt** updated as data-quality work continues.

---

*Report generated from today’s session. All code changes are in the repo.*
