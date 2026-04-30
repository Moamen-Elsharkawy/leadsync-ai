# Manager Dashboard

The dashboard is the primary admin interface. It is built for a non-technical physical therapy center manager.

## Pages

- **Overview**: total inquiries, urgent leads, follow-up leads, daily inquiry volume, branch demand, service mix, and follow-up status.
- **Intake Leads**: searchable and filterable lead table with status badges and lead scores.
- **Lead Details**: full intake profile, manager next action, human review reminder, and controls for status, stage, and notes.
- **Conversations**: Telegram message history in chat-style bubbles.
- **Follow-ups**: queue visibility and status update controls.
- **Reports**: manager-friendly report text, top services, recommendations, copy, CSV, and print actions.
- **Center Profile**: read-only MoveWell business config.
- **Demo**: seed and clear fake MoveWell demo data.
- **System Health**: env presence and setup actions without exposing secret values.

## Run

```bash
npm run dashboard:dev
```

Open:

```text
http://localhost:3001/login
```

Use `ADMIN_PASSWORD` from `.env`.

## Data Source

The dashboard uses `src/sheets/sheetsWebAppClient.ts`. It does not read Google Sheets directly and does not use a database.

## Manager Actions

- Setup Sheets from System Health.
- Seed therapy demo data.
- Clear demo data only.
- Update lead status, stage, and notes.
- Update follow-up status.
- Review conversations and reports.

## UX Rules

Keep the dashboard focused on manager decisions: urgent inquiries, branch demand, follow-up queue, service demand, and staff review. Avoid technical implementation details unless they are needed for setup or troubleshooting.
