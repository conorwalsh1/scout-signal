APP_FLOW.md
Purpose
This document defines every user-facing page, route, major interaction, and navigation path in Scout Signal. It exists to prevent implementation drift and to ensure the product is built as a focused hiring-signal intelligence platform rather than a generic dashboard or job board.
The app should feel simple, fast, and obvious. A recruiter should understand within seconds:
what companies are being surfaced
why they are being surfaced
what they can do next
App Model
Scout Signal is a logged-in SaaS product with a lightweight public marketing layer.
There are two product plans:
Basic
Pro
The primary user journey is:
discover the product
sign up or log in
land on the dashboard
review ranked companies and signals
inspect company detail
save targets
return regularly to monitor new opportunities
All screens described in this document must follow the visual system defined in:

docs/FRONTEND_GUIDELINES.md

Route Inventory
Public Routes
/
/login
/signup
/pricing
Authenticated Routes
/dashboard
/companies
/companies/[id]
/saved
/account
Internal / Optional Admin Route
/admin/ingestion (optional, internal only, not required for customer-facing V1)

Route Definitions
/
Landing page.
Purpose:
explain what Scout Signal does
explain who it is for
explain how it helps recruiters
route users toward signup or login
Primary actions:
Start free / Sign up
Log in
View pricing
Content sections:
hero statement
how it works
example signal explanation
product benefits
pricing summary
Success outcome:
user clicks signup or login
Failure mode:
none beyond normal page load issues

/login
Login page for existing users.
Inputs:
email
password
Actions:
submit login
navigate to signup if no account
Success outcome:
redirect to /dashboard
Error states:
invalid credentials
empty fields
auth service failure

/signup
Signup page for new users.
Inputs:
email
password
optional name field
Actions:
create account
navigate to login if already registered
Success outcome:
account created
user redirected to onboarding step or directly to /dashboard
V1 recommendation: Skip complex onboarding. Redirect directly to dashboard after account creation.
Error states:
email already exists
invalid password requirements
auth service failure

/pricing
Pricing and plan comparison page.
Purpose:
explain Basic vs Pro clearly
drive upgrades
Plan comparison must show:
dashboard access
number of visible signals
saved company limits
priority access to highest-scoring companies
Primary actions:
sign up for Basic
upgrade to Pro
Success outcome:
new user starts signup
existing user starts checkout
Error states:
payment initialization failure

/dashboard
Primary product page.
Purpose:
show ranked hiring opportunities
explain why they are ranked
allow filtering and saving
This is the single most important page in the app.
Core layout:
top header
filter bar
signal/company feed
optional plan notice / usage notice for Basic users
Primary content: Each feed item represents a company surfaced by the scoring engine.
Each card must include:
company name
hiring score
signal explanation summary
recent relevant signal count
category tags
location or market metadata if available
timestamp of latest signal
save button
click-through to company page
Primary actions:
filter feed
click company
save company
review reasoning behind company score
Success outcome:
user identifies companies worth pitching
user saves companies
user clicks through to detail pages
Error states:
feed fetch failed
no signals available
user exceeded Basic plan visibility cap
Special Basic plan behavior:
if Basic user hits view limit, show locked state with upgrade CTA
locked items should still imply value without giving away full Pro feed

/companies
Searchable companies list.
Purpose:
allow browsing or searching surfaced companies outside the dashboard feed
V1 scope:
simple searchable list
optional sort by score or latest signal
Primary actions:
search by company name
click company detail
save company
Success outcome:
user finds target company directly
Error states:
empty search results
fetch failure

/companies/[id]
Company detail page.
Purpose:
show full context for why a company is surfaced
give recruiter enough information to decide whether to pitch
Sections:
Company header
Hiring score summary
Signal explanation list
Recent detected events
Save status / actions
Company Header
Must show:
company name
domain or website
optional short descriptor if available
save button
Hiring Score Summary
Must show:
current hiring score
summary explanation
latest signal timestamp
Signal Explanation List
Must show recruiter-readable reasons, for example:
4 engineering jobs posted in the last 48 hours
hiring spike detected
funding event detected
Recent Detected Events
This is lower-level context, below the signal summary. Examples:
raw job posting events
funding event source record
Primary actions:
save / unsave company
open source links in new tab
return to dashboard
Success outcome:
user understands why company is worth contacting
Error states:
company not found
linked source unavailable

/saved
Saved companies page.
Purpose:
let users keep a watchlist of targets
Contents:
saved company cards
hiring score for each
latest signal summary
remove/save toggle
Primary actions:
open company detail
remove saved company
Success outcome:
user builds persistent target list
Error states:
no saved companies yet
fetch failure
Basic plan behavior:
if save limit reached, show upgrade CTA

/account
User account and billing page.
Purpose:
display account info
display current plan
allow billing actions
Sections:
account email
current plan
usage / plan limits
manage subscription
logout
Primary actions:
upgrade to Pro
manage billing
log out
Error states:
billing portal init failure

/admin/ingestion (optional internal route)
Not part of customer V1 but useful for internal debugging.
Purpose:
view ingestion run logs
inspect connector status
inspect error rates
This route must be internal only if implemented.

Primary User Flows
Flow 1: Visitor discovers the product
User lands on /
Reads product description and example signals
Clicks Sign up
Navigates to /signup
Success:
user begins account creation

Flow 2: New user signs up
User opens /signup
Enters email and password
Submits form
Account is created
Session is established
User is redirected to /dashboard
Success:
user reaches live product immediately
Error states:
invalid email
password too weak
email already exists

Flow 3: Existing user logs in
User opens /login
Enters credentials
Submits form
Session created
Redirect to /dashboard
Error states:
wrong credentials
auth outage

Flow 4: User reviews feed on dashboard
User lands on /dashboard
App fetches ranked companies
User scans top cards
User reviews signal explanations
User decides whether to save or inspect company
Success:
user quickly identifies promising targets

Flow 5: User filters dashboard
User changes one or more filters
App updates query state
Dashboard refreshes
Ranked results update
Filters supported in V1:
category
signal type
recency
company search
location metadata if available
Success:
narrowed list reflects filter state
Error state:
failed refresh shows inline retry

Flow 6: User opens a company detail page
User clicks a company card on /dashboard
App routes to /companies/[id]
Company details load
User reviews score explanation and event history
Success:
user understands why company was surfaced

Flow 7: User saves a company
User clicks save on dashboard or company page
Request sent to backend
UI updates immediately
Saved company appears in /saved
Success:
watchlist grows
Error states:
save request failed
Basic plan save limit reached

Flow 8: User reviews saved companies
User opens /saved
Sees saved target list
Opens company details or removes one
Success:
user uses Scout Signal as a recurring target tracker

Flow 9: User upgrades to Pro
User sees upgrade CTA from /pricing, /dashboard, /saved, or /account
User starts checkout
Payment succeeds
Plan updates to Pro
User returns to app
Pro features unlock immediately or on refresh
Success:
user receives expanded access
Error states:
payment failure
entitlement update delay

Feed Behavior Rules
Feed Unit
The main dashboard should surface companies, not raw events.
Each feed unit is:
one company
one current company score
one explanation bundle made from current signals
Feed Sorting
Use PRD ranking rules:
highest company score
most recent signal timestamp
highest signal confidence
Feed Pagination
V1 recommendation:
cursor-based or simple page-based pagination
default first page should feel rich enough to prove value immediately
Locked Feed Behavior for Basic
If Basic plan has visibility limits:
show unlocked feed items first
after limit, show blurred/locked cards
locked cards should show minimal teaser info and upgrade CTA

Screen States
Loading State
Every data-heavy page must have skeleton or loading state.
Pages requiring loading states:
dashboard
companies list
company detail
saved
account plan info
Empty States
Dashboard empty
Message: No relevant hiring signals found right now. Try broadening filters or check back later.
Companies empty
Message: No companies matched your search.
Saved empty
Message: You have not saved any companies yet.
Error States
Global fetch error
Show inline alert with retry action.
Auth expired
Redirect to /login and preserve destination if possible.
Not found
Company detail should show proper not-found state if invalid ID.

Navigation Rules
Top-Level Navigation
Authenticated user navigation:
Dashboard
Companies
Saved
Pricing
Account
Sidebar / Nav Behavior
Desktop:
persistent sidebar
Mobile:
slide-in nav drawer
Cross-Linking Rules
dashboard cards link to company detail
company detail can save company
saved links back to company detail
pricing and account both support upgrade flow

Background System Flow (Non-User)
Automated Ingestion Flow
scheduler triggers connector
connector fetches source data
raw events are created
events are normalized
signals are generated
company score is recalculated
updated ranked companies appear on dashboard
Company Score Update Flow
new event enters system
signal engine maps event to one or more signals
signal weights applied
recency decay applied
company score updated
feed ranking changes on next fetch
Historical Storage Flow
raw event stored
normalized signal stored
company score updated
event and signal retained historically for future analysis

Mobile Behavior
V1 is desktop-first but mobile-compatible.
Mobile Requirements
all pages usable on phone
dashboard cards stack vertically
filters collapse into drawer or panel
no complex tables required in V1
save button easy to tap
Mobile Non-Goal
Do not build a dedicated mobile app in V1.

UX Priorities
Dashboard must feel useful within 10 seconds.
Company explanation must be obvious.
Save flow must be frictionless.
Upgrade prompts must appear at clear value boundaries, not randomly.
The app must feel like an intelligence terminal, not a generic SaaS admin panel.

Definition of Correct App Behavior
The app flow is correct when:
a new recruiter can sign up and reach the dashboard without confusion
the dashboard clearly surfaces ranked companies rather than raw data dumps
users can understand why each company is shown
users can save companies and revisit them later
Basic and Pro behavior differs clearly and predictably
all major states are handled: loading, empty, error, locked
