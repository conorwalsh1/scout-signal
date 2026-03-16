Cards appear in a vertical feed.

---

# Core Components

AI must only generate components from this list unless explicitly instructed.

company-card  
signal-badge  
score-badge  
filter-bar  
dashboard-feed  
save-button  
company-header  
signal-list  
empty-state  
loading-state

---

# Company Card Structure

Each company card contains:

Company name  
Hiring score badge  
Signal explanation  
Job titles if applicable  
Location  
Signal tags  
Timestamp  
Save button

Example structure:

Company Name

Hiring Score: 82

Signals detected:
- 4 engineering jobs posted
- recruiter role added
- funding announcement

Tags:
engineering • saas • remote

---

# Hiring Score Badge

Score range:

0–30 → low  
31–60 → medium  
61–100 → high

Color mapping:

Low → muted gray  
Medium → warning amber  
High → green

---

# Signal Tags

Signals appear as small tags.

Examples:

job_post  
hiring_spike  
funding_event

Style:

Small rounded badge  
JetBrains Mono font

---

# Filtering UI

Filters appear above the feed.

Filters include:

Region  
Category  
Location type  
Signal type  
Recency  
Search

Filters should be horizontally scrollable if space is limited.

---

# Navigation

Primary navigation items:

Dashboard  
Saved Targets  
Account  
Billing

Navigation appears in the left sidebar.

---

# Empty States

When no signals exist:

Display message:

"No hiring signals detected for your filters."

Include suggestion:

"Try widening your region or category filters."

---

# Loading States

While signals load:

Use skeleton loaders instead of spinners.

Cards should appear as gray blocks with animated shimmer.

---

# Responsive Rules

Desktop first design.

Breakpoints:

Mobile: 640px  
Tablet: 768px  
Desktop: 1024px  
Wide: 1280px

Behavior:

Sidebar collapses on mobile.

Cards stack vertically.

Filters become dropdown menus.

---

# Design Restrictions

AI must not introduce:

Material UI  
Bootstrap  
random component libraries  
gradients  
glassmorphism  
heavy animations

The UI must remain minimal and professional.

---

# Component Library

UI components should be built using:

shadcn/ui

Styling should be applied using:

Tailwind CSS

Avoid inline styles.

---

# Performance Rules

Frontend must:

Minimize re-renders  
Avoid large component trees  
Use server components where possible  
Lazy load heavy components

---

# Future UI Expansion

Future UI modules may include:

Company intelligence page  
Hiring trend graphs  
Market heatmaps  
Signal timeline visualizations
