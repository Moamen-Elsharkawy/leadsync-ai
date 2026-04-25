# Professional Dashboard UI Skill

Use this guidance when polishing SmartFlow dashboard screens.

## Design Principles

- Build a quiet professional SaaS admin interface, not a marketing page.
- Prioritize scan speed, table readability, clear hierarchy, and repeat workflows.
- Keep spacing consistent: 16px for compact gaps, 24px for section rhythm, 32px for page-level separation.
- Use restrained color: neutral backgrounds, one brand accent, clear semantic colors for Hot/Warm/Cold.
- Avoid decorative gradients, oversized hero sections, and vague placeholder copy.
- Keep cards compact and information-dense. Do not nest cards inside cards.

## Typography And Layout

- Page titles should be concise and useful.
- KPI labels should be short; notes should explain business meaning.
- Tables should use readable row density, stable columns, and muted metadata.
- Long Arabic text must wrap safely and preserve direction readability.
- Mobile/tablet layouts must stack without horizontal content overlap.

## Components

- Use reusable PageHeader, Card, Section, StatusBadge, EmptyState, ErrorState, and Button patterns.
- Empty states must explain what data is needed and what action to take.
- Error states must be actionable: mention Apps Script URL, shared secret, or setup step without exposing secrets.
- Loading states should look like the final layout with skeleton blocks.

## Charts

- Chart cards need clear labels and simple axes.
- Handle empty datasets gracefully.
- Avoid too many colors; use consistent palette across pages.
- Pair charts with tables or summary text so the business owner knows what to do next.

## Client-Ready Copy

- Prefer: "Lead pipeline overview", "Follow-up queue", "Unable to load dashboard data".
- Avoid: "Here is your data", "No data", "Error".
- For regulated or sensitive services, include human-in-the-loop reminders and avoid guarantees.

## Demo Data

- Demo data must be realistic but fake.
- Mark demo records clearly.
- Never imply medical diagnosis, treatment advice, confirmed booking, final price, guaranteed outcome, or job/income result.
