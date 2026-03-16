TECH_STACK.md
Purpose
This document defines the exact technology stack used to build Scout Signal. The goal is to remove ambiguity during development so the system can be built consistently using AI-assisted tools such as Cursor.
All major frameworks, tools, and dependencies are intentionally selected to keep the system simple, scalable, and maintainable for a solo founder.
The stack prioritizes:
rapid development
strong TypeScript typing
minimal infrastructure complexity
easy deployment
clean modular architecture

Architecture Overview
Scout Signal consists of three primary layers:
Frontend Application ↓ Application API Layer ↓ Database + Signal Engine
Separate scheduled workers ingest external data sources and generate events and signals.
External Sources ↓ Ingestion Workers ↓ Events ↓ Signals ↓ Company Scores ↓ Dashboard
The application itself never performs scraping directly during user requests.

Runtime Environment
Node.js 20.11.1
Reason:
stable LTS runtime
native fetch support
strong compatibility with Next.js

Core Web Framework
Next.js 14.2.x React 18.2.0 TypeScript 5.3.3
Next.js is used for both frontend and backend server routes. This keeps the system simple and avoids the need for separate backend frameworks.

Frontend Stack
Tailwind CSS 3.4.1 PostCSS 8.4.35 Autoprefixer 10.4.17 shadcn/ui (component generator) Lucide React 0.378.0 clsx 2.1.0
Reasons:
Tailwind allows rapid UI development.
shadcn/ui provides high quality components without a heavy UI framework.
Lucide supplies lightweight iconography.
clsx allows conditional class composition.

Design System

All frontend styling must follow:

docs/FRONTEND_GUIDELINES.md

Tailwind classes must implement the spacing, typography, and color system defined there.


State Management
React local state and URL query state.
No global state management library will be used in V1.
Avoid:
Redux MobX Zustand
The dashboard does not require complex global state.

Data Fetching
Native fetch (Next.js server side) TanStack Query 5.28.9
Responsibilities:
caching
background refresh
pagination
optimistic UI updates

Database
Supabase Postgres 15 Supabase JS client 2.39.7
Database responsibilities:
companies
events
signals
company_scores
users
saved_targets
Supabase is used because it provides hosted PostgreSQL, authentication, and row-level security with minimal operational overhead.

Authentication
Supabase Auth
Supported in V1:
email and password login
Authentication enforces:
user identity
subscription plan access
saved targets ownership

Background Ingestion Workers
Workers run outside the main web application request cycle.
Technology:
Node.js scripts with node-cron 3.0.3
Worker responsibilities:
fetch external source ↓ create raw events ↓ normalize events ↓ generate signals ↓ update company score
Example workers:
/workers
greenhouseWorker.ts
leverWorker.ts
fundingWorker.ts

Scraping and Source Fetching
Playwright 1.42.1 Cheerio 1.0.0-rc.12
Playwright is used for dynamic career pages.
Cheerio is used for fast HTML parsing of static pages.
Scrapers must only collect publicly accessible information.

Scheduling
node-cron 3.0.3
Typical schedule targets:
ATS ingestion every 30 minutes Funding ingestion every 2 hours Score recalculation every hour

Data Validation
Zod 3.22.4
Zod validates:
ingestion payloads
normalized events
API responses
This ensures malformed signals never enter the database.

Logging
Pino 8.19.0
Logging captures:
ingestion errors
connector failures
signal generation issues
Logs must include:
source company signal type timestamp error message

Payment Processing
Stripe 14.20.0
Stripe handles:
subscription billing
plan upgrades
webhook plan updates
Plans supported:
Basic Pro

Hosting
Vercel
Reasons:
first-class Next.js support
simple deployments
global CDN
environment variable management
Workers may run on Vercel cron jobs or a lightweight Node worker instance.

File Storage
Supabase Storage
Used optionally for:
ingestion artifacts
cached source responses

Environments
Three environments must exist:
local staging production
Required environment variables:
DATABASE_URL SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET

Folder Structure
/app /components /lib /workers /supabase /types /utils /docs
app
Next.js routes such as:
/dashboard /companies /saved /account /pricing
components
UI components such as:
company-card signal-badge filter-bar save-button dashboard-feed
lib
Core application logic:
signal-engine scoring-engine auth-utils plan-gating
workers
Background ingestion workers.
supabase
Database schema migrations.
types
TypeScript definitions for:
Company Event Signal Score

Testing
Vitest 1.4.0
Tests should cover:
scoring engine
signal generation
ingestion parsing
UI testing is not required in V1.

Performance Targets
Dashboard load time under 2.5 seconds.
Filter interaction under 500 milliseconds.
Feed queries must be indexed by:
company_score signal_timestamp company_id

Security Rules
Never expose:
service role keys database credentials private ingestion endpoints
All ingestion must run server-side.
Plan permissions must be checked server-side.

Technology Non-Goals
Do not introduce in V1:
microservices Kubernetes Kafka Redis queues GraphQL Elasticsearch heavy ORMs
The system must remain simple until scaling pressure proves otherwise.

Upgrade Paths
The stack allows later upgrades such as:
predictive hiring models
additional source connectors
more advanced signal classification
deeper historical analytics
V1 remains intentionally minimal and focused on validating the signal intelligence product.
