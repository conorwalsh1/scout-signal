PRD.md
Product Name
Scout Signal
One-Line Description
A subscription SaaS for recruiters that detects, structures, and ranks public hiring signals so they know which companies to pitch for business.
Product Vision
Build a lean but compounding hiring‑intelligence platform for recruiters. The system automatically collects company events from multiple public sources, converts those events into standardized hiring signals, scores those signals, and ranks companies by hiring likelihood. Recruiters log in to see which companies are most likely hiring and why.
Over time the platform compounds into a proprietary time‑series dataset of company hiring behaviour. This dataset becomes the core moat and eventually enables predictive hiring scoring.
Problem Statement
Recruiters make money when they place candidates, but winning hiring clients is still highly manual. Today they rely on a fragmented workflow:
checking job boards manually
scanning ATS boards and company career pages
watching funding or expansion news
scrolling LinkedIn for hiring signals
tracking target companies in spreadsheets
This is slow, repetitive, and easy to do badly. Recruiters do not have a simple, recruiter-specific intelligence tool that tells them which companies are hiring now and are worth pitching.
Who This Is For
Primary User
Independent recruiters and small recruitment agencies who source their own clients and want a faster way to find companies currently hiring.
Secondary User
Higher-performing recruiters or agencies operating across multiple regions who want deeper filters, more market coverage, and better signal quality.
Excluded User for V1
job seekers
in-house recruiters
talent acquisition teams at companies
enterprise HR departments
general sales teams
Core User Job To Be Done
"Show me which companies are about to start hiring in my market so I know who to contact today."
Why Users Will Pay
A recruiter can make €5k–€20k+ on one successful placement. If the product helps a recruiter land even one extra client relationship or one extra placement per year, the subscription pays for itself many times over.
Product Principles
Data quality over feature count.
Recruiter-specific, not generic sales software.
Simple first, scalable later.
Derived intelligence over raw scraping.
Narrow scope in V1, modular architecture from day one.
No bloated CRM in V1.
No fake AI assistant gimmicks.
V1 Scope
Included in V1
User authentication.
Plan-based dashboard access (Basic or Pro).
Live feed of recent hiring signals.
Company records.
Event records detected from supported public sources.
Hiring signal generation from detected events.
Filtering by category, company, location, recency, and signal type.
Save / unsave companies or signals.
Daily or near-real-time feed refresh.
Admin-free automated ingestion from one or more source types.
Explicitly Out of Scope for V1
Outreach automation.
Sending emails from the platform.
Candidate sourcing.
Candidate CRM / ATS replacement.
Chrome extension.
Team collaboration.
Full mobile app.
AI chatbot assistant.
Raw data export API.
Enterprise reporting dashboards.
Revenue share or commission model.
Scraping private or protected profile data.
Product Structure
Core Objects
Company
Event
Hiring Signal
Company Score
User
Saved Target
Core Insight Types in V1
Signals are derived from underlying events detected across multiple sources.
V1 signal types:
new_job_post_detected
hiring_spike_detected (multiple jobs in a short window)
funding_event_detected
These signals are combined to calculate a company hiring score.
User Stories
As an independent recruiter
I want to see recent hiring signals so I can decide who to pitch.
I want to filter by job category so I only see relevant opportunities.
I want to save companies I care about so I can revisit them later.
I want to know why a company is being surfaced so I trust the signal.
As a high-volume recruiter
I want access to a broader feed of signals so I can find more opportunities.
I want to quickly identify the highest scoring companies.
I want to track companies I believe will become clients.
As the product owner
I want the system to ingest public hiring data on a schedule so the product stays fresh.
I want data stored historically so the moat compounds over time.
I want the backend modular so I can add more sources later without rewriting the app.
Signal Engine
The system must convert raw detected events into structured hiring signals and compute a company‑level hiring score.
Event
An event is a raw detected occurrence from a source such as:
job posting
funding announcement
company expansion indicator
Events are stored as factual records and never deleted.
Example event fields:
event_id
source_type
company_name_raw
event_type
source_url
detected_at
metadata_json
Signal
Signals are normalized recruiter‑relevant interpretations of events.
Example signal types in V1:
job_post
hiring_spike
funding_event
Signal fields:
signal_id
company_id
signal_type
weight
confidence
occurred_at
Company Score
A company score represents the likelihood that a company is currently hiring.
The score is calculated from weighted signals detected within a rolling time window.
Example scoring weights (V1):
job_post = +35
hiring_spike = +70
funding_event = +80
Signals decay in influence over time to prioritize recent activity.
Example decay model:
0–7 days: 100% weight
8–14 days: 75%
15–30 days: 40%
The dashboard ranks companies by this score.
Functional Requirements
FR1 Authentication
Users must be able to sign up, log in, log out, and access only the features their plan allows.
FR2 Dashboard Feed
Users must see a chronological feed of hiring signals. Each card must include:
company name
signal summary
job title(s) if applicable
location
category
timestamp
source link
FR3 Filtering
Users must filter the feed by:
category
location type
company name search
recency
signal type
FR4 Company Detail Page
Users must view a company page that includes:
company name
website or domain
recent detected events
recent signals
recent hiring signals
save state
FR5 Saved Targets
Users must save and remove saved companies or signals.
FR6 Ingestion
System must ingest jobs from at least one source class in V1:
ATS boards such as Greenhouse, Lever, or Ashby
or
public company career pages (starting here)
FR7 Signal Creation
System must derive hiring signals from job events and store them separately from raw jobs.
FR8 Subscription Gating
User plan (Basic or Pro) controls feature access such as:
number of signals visible per day
access to higher-scoring signals
saved company limits
FR9 Historical Storage
Events and signals must remain stored historically for longitudinal analysis, even after becoming inactive.
FR10 Source Freshness
System must refresh data on a schedule. V1 target: every 30 to 60 minutes per active source class.
Non-Functional Requirements
Performance
Dashboard first content under 2.5 seconds on normal broadband.
Filter interactions under 500ms after data fetch.
Reliability
Failed source fetches must not crash the app.
Ingestion errors must be logged and retryable.
Security
Authentication required for product access.
Server-side access checks for plan permissions.
No secrets exposed to the client.
Maintainability
Source connectors isolated from app UI.
Signal derivation isolated from fetch layer.
Clear typing and modular data models.
Scalability
Add sources without rewriting the dashboard.
Add new signal types and sources without redesigning the data model.
Add premium signal types later without schema breakage.
Success Criteria
Product Success for V1
User can sign up and log in.
User can view live feed of hiring signals.
Feed shows real companies and recent jobs.
Filters work correctly.
User can save targets.
Business Success for Early Validation
5 recruiters say the signals are useful.
1 recruiter uses it repeatedly.
1 stranger pays.
System collects clean historical signal data daily.
Pricing Model
Planned Tiers
Basic
access to the hiring signal dashboard
limited number of signals visible per day
limited saved companies
Pro
full signal feed
unlimited saved companies
priority access to highest scoring companies
V1 will launch with two plans: Basic and Pro.
V1 Non-Goals
replace LinkedIn Recruiter
replace Bullhorn or CRM tools
serve job seekers
provide candidate outreach automation
become a general sales intelligence tool
Risks
Low-quality signals reduce trust.
Scraped source reliability changes.
Overbuilding before first paying users.
Trying to ingest too many signal sources too early.
Confusing recruiters with too much data and not enough prioritization.
Strategic Long-Term Vision
Over time, Scout Signal becomes a proprietary hiring-intelligence dataset and intelligence layer. The app starts as a recruiter dashboard, then compounds into a data moat through:
hiring velocity tracking
company hiring persistence
regional trend data
category demand shifts
predictive hiring scoring
