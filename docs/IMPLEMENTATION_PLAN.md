IMPLEMENTATION_PLAN.md
Purpose
This document translates the PRD, APP_FLOW, TECH_STACK, and BACKEND_STRUCTURE into a build order that is practical for a solo founder using Cursor. The aim is to prevent overbuilding, keep the system lean, and ensure the signal engine is proven before adding complexity.
The build order follows one rule:
Build the smallest working version of the signal pipeline first, then expose it through a usable dashboard, then add billing and polish.

Phase 0 — Project Setup and Rules
0.1 Create project repository
create new git repo
create /docs folder
place PRD.md, APP_FLOW.md, TECH_STACK.md, FRONTEND_GUIDELINES.md, BACKEND_STRUCTURE.md, IMPLEMENTATION_PLAN.md inside /docs
0.2 Initialize app
create new Next.js app with TypeScript
configure Tailwind CSS
initialize shadcn/ui
install locked dependencies from TECH_STACK.md
0.3 Create project structure
Create folders:
/app
/components
/lib
/workers
/types
/supabase
/docs
0.4 Add environment configuration
Create .env.local and set:
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
0.5 Add baseline developer tooling
configure ESLint
configure Prettier if desired
add TypeScript strict mode
0.6 Commit baseline
Commit working empty scaffold.

Phase 1 — Database Foundation
1.1 Create Supabase project
create project in Supabase
connect local app
verify environment variables
1.2 Create initial schema migrations
Using BACKEND_STRUCTURE.md, create tables:
companies
events
signals
company_scores
users
saved_targets
1.3 Add indexes
Add all required indexes from BACKEND_STRUCTURE.md.
1.4 Add basic seed data
Seed minimal data if needed for local testing.
1.5 Verify schema
run migrations locally
inspect tables
confirm foreign keys work
1.6 Commit schema
Commit working database foundation.

Phase 2 — Authentication and App Shell
2.1 Integrate Supabase Auth
email/password auth
session handling
auth helpers
2.2 Build public pages
/
/login
/signup
/pricing
2.3 Build authenticated app shell
sidebar or nav
top header
protected route wrapper
2.4 Create /dashboard, /companies, /saved, /account
Skeleton pages only at first.
2.5 Build logout flow
user can sign out cleanly
2.6 Verify auth flow
Test:
sign up
log in
redirect to dashboard
log out
2.7 Commit auth and shell
Commit working auth + basic navigation.

Phase 3 — Source Connector Framework
3.1 Define source connector interface
Create a shared pattern for workers. Each connector should:
fetch source data
normalize raw event shape
return structured events
3.2 Define raw event format
Create TypeScript type for raw event ingestion.
3.3 Implement first connector
Start with one source class only.
Recommended first source:
public company career pages
Reason:
simpler to control
easier to verify
avoids overbuilding ATS-specific complexity too early
3.4 Add second connector (if first stable)
Recommended order:
Greenhouse
Lever
Ashby
Do not add all three before the first connector works end to end.
3.5 Add funding connector scaffold
Implement basic funding event ingestion with one structured source. This can initially be a simple feed parser.
3.6 Commit connector framework
Commit once one source produces events successfully.

Phase 4 — Event Ingestion Pipeline
4.1 Build worker runner
Create a worker script that:
fetches source data
converts source records into events
inserts events into database
4.2 Add company matching logic
For each event:
attempt company match by domain if available
otherwise attempt normalized name match
create company if none exists
4.3 Insert immutable events
Store all events in events table. Never delete them.
4.4 Add duplicate protection
Prevent duplicate event insertion using:
external_id if present
source_url + event_type fallback
4.5 Add ingestion logging
Log:
run start time
run end time
success/failure
count of events created
4.6 Test first end-to-end ingestion
Success criteria:
worker fetches source
events are written to database
companies are linked correctly
4.7 Commit ingestion pipeline
Commit when one connector reliably writes events.

Phase 5 — Signal Engine
5.1 Define signal generation rules
V1 signal types only:
job_post
hiring_spike
funding_event
5.2 Build event-to-signal mapper
Create logic that converts events to signals.
Examples:
job_post_detected → job_post
multiple job_post events in rolling window → hiring_spike
funding_event_detected → funding_event
5.3 Insert generated signals
Write signals to signals table.
5.4 Add confidence rules
Initial confidence values can be rule-based:
direct structured ATS event = high
inferred spike = medium-high
weakly matched funding event = medium
5.5 Add signal explanation builder
Create function that turns signals into recruiter-readable explanations.
5.6 Verify signal engine
Success criteria:
new events generate correct signals
duplicate signals are controlled
explanations are readable
5.7 Commit signal engine
Commit after signal creation works reliably.

Phase 6 — Company Score Engine
6.1 Implement V1 weighted scoring
Weights from PRD:
job_post = 35
hiring_spike = 70
funding_event = 80
6.2 Implement recency decay
Use simple rule-based decay:
0–7 days = 100%
8–14 days = 75%
15–30 days = 40%
6.3 Build score recalculation job
For each company:
gather active/recent signals
calculate weighted score
store in company_scores
6.4 Store score component JSON
Store explanation-friendly summary of why score exists.
6.5 Verify ranking output
Success criteria:
companies receive non-zero scores
scores update when new signals arrive
top companies look plausible
6.6 Commit score engine
Commit once ranked data exists in DB.

Phase 7 — Dashboard MVP
7.1 Build /dashboard data query
Query:
companies
company_scores
latest related signals
Sort by:
highest score
latest signal timestamp
signal confidence
7.2 Build company feed cards
Each card must show:
company name
hiring score
explanation summary
latest signal timestamp
signal count or signal tags
save button
7.3 Add filter bar
V1 filters:
category
signal type
recency
company search
location metadata if available
7.4 Add feed states
loading
empty
error
locked (for Basic if needed)
7.5 Verify dashboard usefulness
Success criteria:
user can identify top companies quickly
explanations make sense
filters work
7.6 Commit dashboard MVP
Commit when dashboard is usable end to end.

Phase 8 — Company Detail and Saved Targets
8.1 Build /companies
searchable list of surfaced companies
8.2 Build /companies/[id]
Show:
company header
current hiring score
signal explanation list
recent detected events
save button
8.3 Build save target flow
Implement save/unsave company.
8.4 Build /saved
List user saved companies.
8.5 Enforce Basic save limits
If Basic has save limits, show upgrade prompt when exceeded.
8.6 Verify save functionality
Success criteria:
user can save from dashboard
saved list persists
unsave works
8.7 Commit company detail + saved flow

Phase 9 — Billing and Plan Gating
9.1 Add Stripe products/prices
Create:
Basic
Pro
9.2 Build checkout flow
start checkout from /pricing
return to app after checkout
9.3 Build webhook processing
Update user plan after successful Stripe events.
9.4 Add plan gating logic
V1 suggested gating:
Basic: limited visible signals per day
Basic: limited saved companies
Pro: full access
9.5 Add upgrade prompts
Show upgrade prompts at meaningful friction points only.
9.6 Verify billing flow
Success criteria:
user can upgrade
plan updates correctly
gated features unlock
9.7 Commit billing

Phase 10 — Reliability Pass
10.1 Harden ingestion workers
retry failed source fetches
improve logs
prevent worker crashes from bad payloads
10.2 Harden signal generation
avoid duplicate spike creation
ensure score recalculation is stable
10.3 Harden UI states
loading
empty
error
locked
10.4 Test auth and permissions
unauthenticated user cannot access app pages
user cannot affect other users’ saved targets
10.5 Commit reliability pass

Phase 11 — Deploy and Seed Real Data
11.1 Deploy web app
Deploy to Vercel.
11.2 Set up production database
Run migrations on production Supabase.
11.3 Configure worker schedules
Run ingestion and score recalculation on schedule.
11.4 Seed enough real data
Ensure dashboard has enough live companies and signals to feel useful.
11.5 Smoke test production
signup
login
dashboard
company page
save target
upgrade flow
11.6 Commit deployment checklist / tag release

Phase 12 — First User Validation
12.1 Show to real recruiters
Target 3–5 people first.
12.2 Observe questions
Most important validation questions:
do they trust the signal explanations?
do surfaced companies feel worth pitching?
do they understand the score?
12.3 Improve signal clarity before adding features
Do not rush to add more connectors if explanation quality is weak.
12.4 Aim for first paying stranger
This is the validation milestone.

V1 Build Discipline
Do not build these before validation:
outreach automation
candidate sourcing tools
browser extension
mobile app
AI assistant chat layer
enterprise analytics
advanced ML scoring
The point of V1 is to prove: The automated signal engine surfaces companies recruiters want to pitch.

Definition of Done for V1
V1 is complete when:
users can sign up and log in
ingestion workers create events automatically
signals are generated from events
company scores are calculated and stored
dashboard ranks companies by score
users can inspect explanations and save companies
Basic and Pro plan gating works
the app is deployed and usable by real recruiters
