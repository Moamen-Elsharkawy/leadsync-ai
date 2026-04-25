# Client Demo Script

This script is for a live client or portfolio walkthrough using safe demo data. It supports Dental Clinic, Online Course, and Physical Therapy demo paths.

## Before The Call

- Set `DEMO_MODE=true` in `.env`.
- Choose one preset:
  - `BUSINESS_PRESET=physical-therapy`
  - `BUSINESS_PRESET=dental-clinic`
  - `BUSINESS_PRESET=online-course`
- Confirm Apps Script is deployed and initialized.
- If you edited `google-apps-script/Code.gs`, paste it into Apps Script and redeploy the Web App.
- Run `npm run setup:sheets`.
- Start the bot with `npm run dev`.
- Start the dashboard with `npm run dashboard:dev`.
- Open the Google Sheet and keep the tabs visible.
- Open `http://localhost:3001/login` and sign in with `ADMIN_PASSWORD`.
- Open Telegram from the admin account.

## Shared Demo Flow

1. Say:

   "Telegram is the customer channel, OpenRouter handles AI understanding, and Google Sheets is the CRM through a Google Apps Script Web App. There is no database or Google Cloud setup."

2. In Telegram, send:

   ```text
   /setup_sheets
   ```

3. Send:

   ```text
   /demo
   ```

   This seeds safe fake leads and Arabic messages for the active business preset.

4. Show the Google Sheet tabs: Leads, Sessions, Messages, FollowUps, Reports, Settings.

5. Open the dashboard and show Overview, Leads, Conversations, Follow-ups, Reports, Demo, and System Health.

6. In Telegram, send:

   ```text
   /hot
   /warm
   /report
   ```

7. Inspect one full demo lead:

   ```text
   /lead_lead_demo_physical_therapy_001
   /lead_lead_demo_dental_clinic_001
   /lead_lead_demo_online_course_001
   ```

8. Explain follow-up behavior:
   - Hot leads notify the admin.
   - Warm leads are queued in the FollowUps sheet.
   - Demo mode disables automatic customer follow-up sends to avoid accidental spam.

9. End with cleanup:

   ```text
   /clear_demo
   ```

   Only rows marked `isDemo=true` are deleted.

## Physical Therapy Demo Path

Use this for physical therapy centers, clinics, sports rehab centers, and local healthcare service businesses.

1. Set:

   ```env
   BUSINESS_PRESET=physical-therapy
   DEMO_MODE=true
   ```

2. Seed with `/demo` or force it with:

   ```text
   /demo_physical
   ```

3. From a non-admin Telegram account, send:

   ```text
   محتاج جلسة علاج طبيعي لأسفل الظهر في فرع مدينة نصر بكرة. رقمي 01044440001.
   ```

4. Show that the bot captures:
   - Service: Back pain physiotherapy
   - Location: Nasr City Branch
   - Timeline: tomorrow
   - Phone: captured
   - Status: Hot
   - Admin alert: yes

5. Positioning line:

   "For healthcare services, this qualifies intake requests without diagnosing, recommending treatment, promising recovery, or confirming appointments before staff review."

## Dental Clinic Demo Path

1. Set:

   ```env
   BUSINESS_PRESET=dental-clinic
   DEMO_MODE=true
   ```

2. Seed with `/demo` or `/demo_dental`.

3. Sample customer message:

   ```text
   مساء الخير، محتاج استشارة زراعة أسنان الأسبوع ده. عندي أشعة جاهزة وميزانيتي حوالي ٢٥ ألف. رقمي 01011110001.
   ```

4. Positioning line:

   "For clinics, this qualifies patient inquiries without giving medical diagnosis, final prices, or confirmed appointments before reception approval."

## Online Course Demo Path

1. Set:

   ```env
   BUSINESS_PRESET=online-course
   DEMO_MODE=true
   ```

2. Seed with `/demo` or `/demo_course`.

3. Sample customer message:

   ```text
   عايز أشترك في كورس Data Analysis وأبدأ الأسبوع ده. ميزانيتي حوالي ٥ آلاف ورقمي 01033330001.
   ```

4. Positioning line:

   "For course businesses, this filters serious learners, captures budget and start timeline, and avoids promising jobs, discounts, or confirmed enrollment."

## Client Positioning

- "This is lightweight enough for a small business to run without a database."
- "The business owner can inspect everything in Google Sheets."
- "The Apps Script bridge avoids service accounts and Google Cloud setup."
- "The same engine can be sold as vertical templates for clinics, therapy centers, academies, agencies, and local service businesses."
