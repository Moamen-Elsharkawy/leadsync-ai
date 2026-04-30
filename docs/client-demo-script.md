# Client Demo Script

Use this flow to demo SmartFlow to a physical therapy center owner or manager.

## Setup Before The Call

1. Set `DEMO_MODE=true`.
2. Confirm `BUSINESS_PRESET=physical-therapy`.
3. Copy the latest `google-apps-script/Code.gs` into Apps Script and redeploy.
4. Run `npm run setup:sheets`.
5. Start the bot with `npm run dev`.
6. Start the dashboard with `npm run dashboard:dev`.
7. Open `http://localhost:3001/login`.

## Demo Flow

1. Open **System Health**.
   - Show that Telegram, OpenRouter, Apps Script, and demo mode are configured.
   - Click **Setup Sheets** if needed.

2. Open **Demo**.
   - Click **Seed therapy demo data**.
   - Explain that all seeded rows are fake and marked `isDemo=true`.

3. Open **Overview**.
   - Show urgent inquiries, follow-up leads, branch demand, top services, and daily inquiry volume.

4. Open **Intake Leads**.
   - Filter for `Hot`.
   - Open a lead such as a lower back or post-surgery inquiry.
   - Show service, branch, urgency, preferred date/time, phone, notes, and lead score.

5. Open **Conversations**.
   - Show how customer and bot messages are stored as a readable chat history.

6. Open **Follow-ups**.
   - Show pending follow-ups and how the manager can update their status.

7. Open **Reports**.
   - Copy or print the report.
   - Explain how the manager can use it for daily review.

8. Send a live Telegram message from a non-admin account:

   ```text
   محتاج جلسة علاج طبيعي لأسفل الظهر في فرع مدينة نصر بكرة. رقمي 01044440001
   ```

9. Show the bot reply in Arabic and the new row in Google Sheets/dashboard.

10. Finish with **Demo -> Clear demo data**.
    - Explain that only `isDemo=true` rows are deleted.

## Positioning

SmartFlow is not a medical diagnosis system. It is an intake and lead management system that captures inquiries, routes them to the right branch/team, and helps the manager prioritize follow-up.
