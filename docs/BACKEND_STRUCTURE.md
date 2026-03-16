BACKEND_STRUCTURE.md
Purpose
This document defines the database schema and backend data model for Scout Signal. It specifies every table, column, and relationship required for the signal intelligence system described in the PRD.
The schema is designed around the core pipeline:
Sources → Events → Signals → Company Score → Dashboard
The database must store raw detected events permanently so the historical dataset compounds into a data moat.

Database Engine
PostgreSQL 15 (Supabase managed)
Postgres is the system of record for all application data.

Core Tables
companies
Represents a unique company entity.
Columns
id (uuid, primary key) name (text, required) domain (text, unique, nullable) website (text, nullable) created_at (timestamp) updated_at (timestamp)
Indexes
index_companies_domain

events
Raw detected occurrences from external sources.
Examples:
job_post_detected funding_event_detected
Columns
id (uuid, primary key) source_type (text) source_url (text) external_id (text, nullable) company_name_raw (text) company_id (uuid, nullable → companies.id) event_type (text) metadata_json (jsonb) detected_at (timestamp) created_at (timestamp)
Indexes
index_events_company index_events_type index_events_detected_at
Events are immutable and never deleted.

signals
Signals are recruiter-relevant interpretations of events.
Example signal types
job_post hiring_spike funding_event
Columns
id (uuid, primary key) company_id (uuid → companies.id) event_id (uuid → events.id) signal_type (text) weight (integer) confidence (text) occurred_at (timestamp) created_at (timestamp)
Indexes
index_signals_company index_signals_type index_signals_time

company_scores
Stores the calculated hiring score for each company.
Columns
company_id (uuid, primary key → companies.id) score (integer) last_calculated_at (timestamp) score_components_json (jsonb)
Example score components JSON
{ "job_posts": 2, "hiring_spike": true, "funding_event": false }
Indexes
index_company_scores_score

users
Application users.
Columns
id (uuid, primary key) email (text, unique) plan (text) // basic or pro created_at (timestamp)
Authentication is handled by Supabase Auth but mirrored here for application logic.

saved_targets
User watchlist of companies.
Columns
id (uuid, primary key) user_id (uuid → users.id) company_id (uuid → companies.id) created_at (timestamp)
Indexes
index_saved_targets_user index_saved_targets_company

company_sources
Tracks which source list a company came from.
Columns
id (uuid, primary key) company_id (uuid → companies.id) source_type (text) source_external_id (text, nullable) metadata_json (jsonb) created_at (timestamp)
Indexes
index_company_sources_company index_company_sources_type

company_web_sources
Tracks website/domain provenance and confidence.

monitored_sources
Tracks ATS boards and other monitored connector targets.
Columns
id (uuid, primary key) company_id (uuid, nullable → companies.id) company_name (text) company_domain (text, nullable) source_type (text) source_key (text) source_url (text, nullable) active (boolean) metadata_json (jsonb) last_checked_at (timestamp, nullable) last_status (text, nullable) last_result_count (integer, nullable) created_at (timestamp) updated_at (timestamp)
Indexes
index_monitored_sources_type index_monitored_sources_active index_monitored_sources_company

Relationships
companies ↳ events
companies ↳ signals
companies ↳ company_scores
companies ↳ company_sources
companies ↳ company_web_sources
companies ↳ monitored_sources
users ↳ saved_targets
companies ↳ saved_targets

Signal Engine Backend Flow
Ingestion worker fetches external data
Raw event inserted into events table
Event normalization links event to company
Signal generation creates one or more signals
Company score recalculated
Dashboard queries company_scores table

Score Calculation Logic
Score is calculated from signals within a rolling time window.
Example weights (V1)
job_post = 35 hiring_spike = 70 funding_event = 80
Signal decay
0–7 days → 100% 8–14 days → 75% 15–30 days → 40%
Signals older than 30 days may be excluded from score.

Dashboard Query Pattern
The dashboard should query companies ordered by score.
Example query concept
SELECT companies.*, company_scores.score FROM companies JOIN company_scores ON companies.id = company_scores.company_id ORDER BY company_scores.score DESC LIMIT 50

Future Tables (Not V1)
Potential future expansions
company_trends signal_history predicted_scores source_health
These are intentionally excluded from V1 to keep the system lean.

Data Retention Rules
Events → never deleted
Signals → retained indefinitely
Company scores → recalculated continuously
Historical data becomes the intelligence dataset.

Scaling Considerations
Indexes must exist on:
company_id signal_type occurred_at score
Future scale options
partition signals by time
archive old events
move ingestion workers to queue system
These are not required for V1.

Security Rules
Users may only access:
their own saved targets
Users cannot modify:
signals
events
company scores
Those are system generated.

Backend Definition of Done
Backend implementation is complete when:
tables are created
ingestion can insert events
signals are generated
company score updates correctly
dashboard queries return ranked companies
users can save companies
