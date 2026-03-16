# Pricing table vs implementation audit

Comparison of what the pricing table promises vs what the app actually enforces or provides.

## Summary

| Status | Count |
|--------|--------|
| **Matches** | 4 |
| **Over-promise (table says Pro-only, app gives to all)** | 6 |
| **Over-promise (table says we have it, we don't)** | 2 |
| **Under-promise (table said 0, we allow 10)** | 1 (fixed: Saved companies Free = 10) |

---

## Row-by-row

### 1. Signal feed coverage — **Matches**
- **Table:** Free = "Live sample feed", Basic = "Top companies only", Pro = "Full"
- **Code:** `feedLimit(plan)`: Free 20, Basic 100, Pro 500. Dashboard and companies list cap by plan. **Accurate.**

### 2. Company intelligence pages — **Over-deliver**
- **Table:** Free = "1 example company", Basic/Pro = "Yes"
- **Code:** No limit on how many company detail pages a Free user can open. All plans can view any company. **We promise 1 for Free but don’t enforce it.**

### 3. Signal scoring — **Matches**
- **Table:** Free = "Read-only preview", Basic/Pro = "Yes"
- **Code:** Free users see scores in the feed and on company pages (read-only). **Accurate.**

### 4. Signal tags and events — **Matches**
- **Table:** Free = "Preview only", Basic/Pro = "Yes"
- **Code:** All plans see tags/events in feed and company detail. **Reasonable.**

### 5. Saved companies — **Matches** (after fix)
- **Table:** Free = 10, Basic = 25, Pro = Unlimited
- **Code:** `savedLimit(plan)`: Free 10, Basic 25, Pro **1000** (not infinite). **Table says "Unlimited"; code caps at 1000.** Acceptable for "Unlimited" in practice.

### 6. Search and ranking tools — **Over-deliver**
- **Table:** Free = "No", Basic/Pro = "Yes"
- **Code:** Companies page (search, sort by rank/score/updated, badge filter) has no plan check. Free users get full search and ranking. **We promise Basic/Pro only.**

### 7. Signal history timeline — **Over-deliver**
- **Table:** Free/Basic = "No", Pro = "Yes"
- **Code:** Company detail page shows timeline (signals + events) for all users. No plan gate. **We promise Pro only.**

### 8. Signal badges — **Over-deliver**
- **Table:** Free/Basic = "No", Pro = "Yes"
- **Code:** Badges shown on dashboard, companies list, company detail, saved list for all plans. **We promise Pro only.**

### 9. Signal alerts — **Over-deliver**
- **Table:** Free/Basic = "No", Pro = "Yes"
- **Code:** `/alerts` page and create/delete alerts available to all logged-in users. No plan check. **We promise Pro only.**

### 10. Advanced signal filters — **Over-deliver**
- **Table:** Free/Basic = "No", Pro = "Yes"
- **Code:** Dashboard has FilterBar (signal type, badge, search, high signal / hiring signals) for everyone. **We promise Pro only.**

### 11. Data export — **Over-promise**
- **Table:** Free/Basic = "No", Pro = "Yes"
- **Code:** No user-facing export (e.g. CSV/Excel) for companies or signals. Only admin/scripts (e.g. export-missing-websites). **We promise Pro has it but the feature doesn’t exist.**

### 12. Hiring trend analytics — **Over-promise**
- **Table:** Free = "No", Basic = "—", Pro = "Yes"
- **Code:** No dedicated "hiring trend analytics" view. Company detail has hiring activity (e.g. job post sparkline). **Vague promise; no clear Pro-only analytics feature.**

### 13. Signal score breakdown — **Over-deliver**
- **Table:** (in code) Free/Basic = "No"/"—", Pro = "Yes"
- **Code:** Company detail shows score breakdown for all users via `getScoreBreakdown`. **We promise Pro only.**

---

## Recommendations

1. **Make the table match the app** so we don’t over-promise or under-state:
   - Set **Search and ranking**, **Signal badges**, **Signal history timeline**, **Signal alerts**, **Advanced signal filters**, **Signal score breakdown** to **Yes** for all plans (or at least Basic + Pro if we add Free limits later).
   - Set **Data export** and **Hiring trend analytics** to **No** or **Coming soon** for Pro until we build them.
   - Set **Company intelligence pages** Free to **Yes** (or implement "1 example company" and link to it).

2. **Or** implement real plan gates and build missing features so the current table is accurate (Pro-only badges, timeline, alerts, filters, breakdown, export, analytics).

This file can be updated as we add gates or features.
