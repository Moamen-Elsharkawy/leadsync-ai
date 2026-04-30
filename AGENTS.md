# AGENTS.md

Guidance for future Codex work on this repository.

## Project Intent

SmartFlow is a physical therapy center intake and lead management system. Customers use Telegram, the assistant replies in Arabic, managers use the dashboard, OpenRouter is the only AI provider, and CRM data is stored only in Google Sheets through the Apps Script Web App.

## Constraints

- Do not add a database.
- Do not add Google Cloud service accounts.
- Do not add Google Sheets API credentials.
- Do not use SQLite, Prisma, Postgres, Supabase, Airtable, or Firebase.
- Keep customer-facing bot replies in Arabic.
- Keep code, comments, file names, and docs in English.
- Keep Telegram polling mode as the default.
- Never hardcode secrets.
- Do not let the bot diagnose, provide treatment advice, recommend exercises or medication, estimate session counts, promise outcomes, quote final prices, or confirm appointments before staff review.

## Commands

- `npm run dev` starts the local bot and admin server.
- `npm run dashboard:dev` starts the manager dashboard.
- `npm run typecheck` validates TypeScript.
- `npm test` runs Vitest.
- `npm run build` emits JavaScript into `dist`.
- `npm run dashboard:typecheck` validates the dashboard.
- `npm run dashboard:build` builds the dashboard.
- `npm run format:check` checks formatting.

## Implementation Notes

- The Node app talks to Google Sheets only through `src/sheets/sheetsWebAppClient.ts`.
- The Apps Script contract is `{ secret, action, payload }`.
- Keep the spreadsheet headers in `google-apps-script/Code.gs` aligned with the TypeScript domain types.
- Tests should mock OpenRouter, Telegram, and Apps Script HTTP calls.

## Chatbot Conversation Flow

The bot operates as a state machine with three main stages:
1. **Greeting**: Warm welcome, detects simple greetings without triggering extraction. Flood protection blocks rapid messaging.
2. **Qualifying**: Systematically asks for missing fields: Service -> Name -> Branch -> Timing -> Phone. It tracks `questionAskCount` to soften wording on repeated questions.
3. **Qualified**: All required data is collected. The bot passes the lead to the human team and stops asking questions, only answering queries and keeping the lead updated.
