# Scout Signal Documentation

This folder contains the **canonical product and architecture specification** for Scout Signal.

All development decisions, implementation details, and AI-generated code must follow the documents defined here.

If any code or feature conflicts with these specifications, **the documentation takes precedence**.

---

# Documentation Priority Order

The following documents define the system. They should be read **in this order**, as earlier documents override later ones if conflicts arise.

### 1. PRD.md  
**Product Requirements Document**  
Defines what Scout Signal is, who it is for, the problem it solves, and the core product features and constraints.

### 2. APP_FLOW.md  
**Application Flow Specification**  
Documents every screen, route, and user navigation path through the application.

### 3. TECH_STACK.md  
**Technology Stack Specification**  
Defines the exact frameworks, packages, tools, and versions used to build the system.

### 4. FRONTEND_GUIDELINES.md  
**Design System and UI Rules**  
Defines the visual design system, layout rules, component standards, and styling conventions.

### 5. BACKEND_STRUCTURE.md  
**Backend Architecture and Database Schema**  
Defines the data model, tables, relationships, API structure, and ingestion pipeline.

### 6. IMPLEMENTATION_PLAN.md  
**Step-by-Step Build Plan**  
Defines the sequence for building the system from initialization through production-ready functionality.

### SETUP.md  
**Local setup**  
Environment, database migrations, and seed. Use this to fix "Could not find the table 'public.users'" and run the app locally.

### DEPLOY.md  
**Deployment Checklist**  
Step-by-step guide for deploying to Vercel, configuring Supabase and Stripe, running workers, and seeding demo data.

### VALIDATION.md  
**Phase 12 — First User Validation**  
Checklist for showing the app to recruiters, observing feedback, improving signal clarity, and aiming for the first paying customer.

---

# Related Root Files

The following important files exist at the **project root**, outside the `/docs` directory:

### CLAUDE.md  
Defines the rules, architecture constraints, and conventions that AI coding assistants must follow when working in this repository.

### progress.txt  
Tracks build progress, milestones, and completed implementation steps.

---

# Documentation Philosophy

Scout Signal is built using a **documentation-first architecture**.

This means:

- The product is specified before code is written.
- AI tools use these documents as the source of truth.
- The system can be rebuilt or extended without guesswork.

When adding features or modifying the architecture, **update the documentation first**.