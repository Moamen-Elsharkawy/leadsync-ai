# UI Quality Guidelines

The SmartFlow dashboard should feel like a practical SaaS operations panel for a real business owner.

## Dashboard Style

- Use a restrained neutral palette with one brand accent.
- Keep cards compact and purposeful.
- Use dense but readable tables.
- Avoid generic AI-looking layouts, random gradients, vague placeholder text, and oversized decorative sections.
- Make demo mode visible without making it distracting.

## Page Structure

- Every page should have a clear title, one-sentence context, and obvious actions.
- Empty states should explain why the data is missing and what the user can do.
- Error states should tell the admin to check Apps Script URL, shared secret, or deployment.
- Loading states should mirror the expected dashboard layout.

## Data Display

- Status badges are consistent:
  - Hot: urgent red
  - Warm: amber
  - Cold: neutral slate
- Dates should degrade safely to `-` when invalid.
- Long Arabic text should wrap cleanly.
- Missing fields should display `-`, not undefined or null.

## Copy

- Use business language:
  - "Lead pipeline overview"
  - "Follow-up queue"
  - "Owner report"
  - "Recommended next action"
- Avoid generic language:
  - "Here is your data"
  - "No data"
  - "Error"

## Accessibility

- Maintain readable contrast.
- Use semantic headings.
- Buttons and links should have clear labels.
- Forms should have visible labels or descriptive placeholders.
- Do not rely on color alone for status.
