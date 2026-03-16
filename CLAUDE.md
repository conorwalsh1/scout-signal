# CLAUDE.md
## Purpose
This file defines the operating rules for AI coding assistants working on the Scout Signal repository.
AI agents must read and follow this file before generating or modifying code.
The goal is to ensure that all AI-generated code follows the architecture, technology choices, and conventions defined for this project.
---
## Project Summary
Scout Signal is a hiring-signal intelligence SaaS for recruiters.
The system detects company events from public sources, converts those events into structured hiring signals, calculates company hiring scores, and surfaces ranked companies in a a dashboard.
Core pipeline:
Sources  
↓  
Events  
↓  
Signals  
↓  
Company Score  
↓  
Dashboard
AI must preserve this architecture.
---
## Authoritative Documentation
The `/docs` folder contains the canonical project specification.
AI must follow these documents in priority order:
1. PRD.md  
2. APP_FLOW.md  
3. TECH_STACK.md  
4. FRONTEND_GUIDELINES.md
5. BACKEND_STRUCTURE.md  
6. IMPLEMENTATION_PLAN.md  
If conflicts occur, earlier documents take precedence.
---
## Technology Stack (Locked)
Runtime  
Node.js 20.11.1
Framework  
Next.js 14.2.x (latest 14.x LTS)  
React 18.2.0  
TypeScript 5.3.3
Frontend  
Tailwind CSS  
shadcn/ui components  
Lucide icons  
clsx
Backend  
Supabase Postgres 15  
Supabase Auth
Workers  
Node.js worker scripts  
node-cron scheduling
Scraping / ingestion  
Playwright  
Cheerio
Validation  
Zod
Billing  
Stripe
Hosting  
Vercel
AI must not introduce alternative frameworks unless explicitly instructed.
---
## Forbidden Technologies
Do not introduce these in V1:
Express  
GraphQL  
Redis queues  
Kafka  
Elasticsearch  
Microservices  
Kubernetes  
Heavy ORMs
The system must remain a **single Next.js application with background workers**.
---
## Architecture Rules
The system must maintain the following layers:
Source ingestion  
↓  
Events  
↓  
Signals  
↓  
Company Score  
↓  
Dashboard
Rules:
Events are raw facts from sources.
Signals are interpretations of events.
Company scores are derived from signals.
The dashboard reads company scores.
The UI must **never generate signals or scores directly**.
---
## Data Model Authority
The schema defined in `BACKEND_STRUCTURE.md` is the source of truth.
Primary tables:
companies  
events  
signals  
company_scores  
users  
saved_targets  
Rules:
Events are immutable.
Signals are generated from events.
Company scores are derived from signals.
---
## File Structure Rules
Repository structure must follow:
/app  
/components  
/lib  
/workers  
/types  
/utils  
/supabase  
/docs  
Responsibilities:
app  
Next.js routes.
components  
Reusable UI components only.
lib  
Core business logic such as:
signal-engine  
scoring-engine  
auth-utils  
plan-gating  
workers  
Background ingestion and scoring jobs.
supabase  
Database migrations and schema.
types  
TypeScript data models.
---
## Coding Standards
All code must use **TypeScript strict mode**.
Rules:
Prefer small modular functions.
Avoid files larger than ~300 lines where possible.
Prefer explicit types for core data models.
Core models:
Company  
Event  
Signal  
CompanyScore  
User  
SavedTarget  
---
## Signal Engine Rules
Signal generation must occur inside the signal engine.
Valid V1 signals:
job_post  
hiring_spike  
funding_event  
Signal weights:
job_post = 35  
hiring_spike = 70  
funding_event = 80  
Signal decay rules:
0–7 days → 100%  
8–14 days → 75%  
15–30 days → 40%
---
## Dashboard Rules
The dashboard surfaces **ranked companies**, not raw events.
Feed ordering:
1. highest company score  
2. newest signal timestamp  
3. highest signal confidence  
Each company card must include a **signal explanation**.
Example:
Stripe — Hiring Score 88
Signals detected:
- 4 engineering jobs posted in last 48 hours
- recruiter role posted
- funding event detected
---
## Build Discipline
AI must prioritize building in this order:
1. working ingestion pipeline  
2. working event storage  
3. working signal engine  
4. working scoring engine  
5. dashboard displaying ranked companies  
Do not add additional product features until the signal pipeline works.
---
## V1 Non-Goals
Do not implement:
candidate sourcing tools  
outreach automation  
browser extensions  
mobile apps  
AI chat assistants  
enterprise analytics dashboards  
The goal of V1 is to validate the **hiring signal intelligence engine**.
