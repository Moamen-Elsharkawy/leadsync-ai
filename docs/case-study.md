# SmartFlow AI Telegram Sales Agent Case Study

## Problem

Small businesses often receive customer inquiries through chat, but they lose context, forget follow-ups, and manually copy lead data into spreadsheets. A full CRM or database can be too heavy for an MVP.

## Solution

SmartFlow AI Telegram Sales Agent is a Telegram-based sales assistant that qualifies leads in Arabic and stores CRM data in Google Sheets through a Google Apps Script Web App.

## Architecture

- Telegram is the messaging channel.
- OpenRouter is the AI provider.
- Google Sheets is the CRM and storage layer.
- Google Apps Script Web App is the only bridge to Sheets.
- Node.js and TypeScript run the bot, follow-up worker, and admin dashboard.

The Node app never uses a direct Google Sheets API client, service account, credentials JSON, or database.

## Core Workflow

1. A customer sends a Telegram message.
2. The message is saved to the Messages sheet.
3. The session is loaded from the Sessions sheet.
4. OpenRouter extracts lead fields and intent.
5. The bot asks one missing qualification question at a time.
6. Qualified leads are classified as Hot, Warm, or Cold.
7. Lead data is upserted into the Leads sheet.
8. Warm leads can be queued for follow-up.
9. Hot leads notify the admin.
10. The owner can inspect leads through Telegram commands or the Express dashboard.
11. The owner can use the Next.js dashboard for analytics, conversations, reports, follow-ups, demo controls, and system health.

## Safety And Constraints

- No database.
- No Google Cloud setup.
- No Service Account.
- No credentials JSON.
- No direct Google Sheets API usage from Node.js.
- No standard OpenAI endpoint usage.
- Secrets are loaded from environment variables and redacted in logs.

## Demo Mode

Demo Mode is designed for portfolio and sales walkthroughs:

- Uses `BUSINESS_PRESET` to switch between custom, Physical Therapy, Dental Clinic, and Online Course versions.
- Seeds 10 fake realistic leads for the selected business type.
- Includes Arabic customer messages.
- Marks all demo rows with `isDemo=true`.
- Clears only demo rows.
- Disables automatic customer follow-up sends.

The productized presets make the project easier to sell as a vertical automation offer:

- Physical Therapy AI Sales Agent for therapy centers, rehab clinics, and multi-branch local healthcare businesses.
- Dental Clinic AI Sales Agent for clinics, dentists, orthodontists, and healthcare reception teams.
- Online Course AI Sales Agent for academies, coaches, cohort programs, and training companies.

For the physical therapy demo, SmartFlow collects intake details and routes leads to staff. It does not diagnose, provide treatment advice, recommend exercises, promise recovery outcomes, estimate required session counts, or confirm appointments before staff review.

## Business Value

The MVP gives a small business:

- Faster customer response.
- Consistent lead qualification.
- A spreadsheet CRM they already understand.
- Owner-friendly Telegram admin commands.
- A simple dashboard for pipeline visibility.
- A professional web dashboard for client-ready analytics and reporting.
- A deployable automation foundation without unnecessary infrastructure.
