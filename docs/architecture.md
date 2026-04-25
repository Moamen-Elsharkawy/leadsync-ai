# Architecture

SmartFlow AI Telegram Sales Agent is intentionally small and inspectable.

## Runtime

- `src/index.ts` starts the bot, admin dashboard, and follow-up scheduler.
- Telegraf runs the Telegram bot in polling mode.
- Express serves a minimal password-protected dashboard and JSON API.
- node-cron checks pending follow-ups.

## AI

- The project uses the official `openai` package configured for OpenRouter.
- `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` configure AI access.
- Lead extraction and classification use structured JSON.
- Reply generation is constrained by `config/business.json`.
- Fallback logic keeps the conversation usable when AI fails.

## Storage

- Google Sheets is the CRM and storage layer.
- Node.js calls only the Apps Script Web App over HTTP POST.
- The request shape is `{ secret, action, payload }`.
- Apps Script validates `SMARTFLOW_SECRET`, then reads or writes the active spreadsheet.

## Sheets

- Leads
- Sessions
- Messages
- FollowUps
- Reports
- Settings

## Constraints

- No database.
- No direct Google Sheets API from Node.js.
- No Service Account.
- No credentials JSON.
- No Google Cloud setup.
