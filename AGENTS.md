# AGENTS.md

Guidance for future Codex work on this repository.

## Project Intent

SmartFlow AI Telegram Sales Agent is a small-business Telegram sales assistant. It qualifies leads in Arabic, uses OpenRouter for AI, and stores CRM data only in Google Sheets through the Apps Script Web App.

## Constraints

- Do not add a database.
- Do not add Google Cloud service accounts.
- Do not add Google Sheets API credentials.
- Do not use SQLite, Prisma, Postgres, Supabase, Airtable, or Firebase.
- Keep customer-facing bot replies in Arabic.
- Keep code, comments, file names, and docs in English.
- Keep Telegram polling mode as the default.
- Never hardcode secrets.

## Commands

- `npm run dev` starts the local bot and admin server.
- `npm run typecheck` validates TypeScript.
- `npm test` runs Vitest.
- `npm run build` emits JavaScript into `dist`.
- `npm run format:check` checks formatting.

## Implementation Notes

- The Node app talks to Google Sheets only through `src/sheets/sheetsWebAppClient.ts`.
- The Apps Script contract is `{ secret, action, payload }`.
- Keep the spreadsheet headers in `google-apps-script/Code.gs` aligned with the TypeScript domain types.
- Tests should mock OpenRouter, Telegram, and Apps Script HTTP calls.
