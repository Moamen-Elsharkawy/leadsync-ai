# Suggested LinkedIn Post

I built a portfolio-ready MVP for a small-business AI sales assistant:

**SmartFlow AI Telegram Sales Agent**

What it does:

- Talks to customers on Telegram in Arabic
- Extracts lead data with OpenRouter
- Qualifies leads as Hot, Warm, or Cold
- Stores leads, sessions, messages, follow-ups, and reports in Google Sheets
- Uses Google Apps Script as the only bridge to Sheets
- Gives the business owner admin commands and a simple dashboard
- Includes a safe demo mode with fake Arabic customer conversations

Architecture:

- Node.js + TypeScript
- Telegraf
- OpenAI SDK configured for OpenRouter
- Google Apps Script Web App
- Google Sheets CRM
- Express dashboard
- Vitest tests

No database.
No Google Cloud service account.
No Google Sheets API credentials.

The goal was to build something realistic for small businesses: simple to deploy, easy to inspect, and useful without introducing infrastructure they do not need yet.

Demo Mode seeds 10 safe fake leads, marks them as demo data, and can clear only demo rows without touching real customer data.

This is the kind of lightweight automation layer that can help a small team respond faster, qualify better, and keep their CRM organized from day one.
