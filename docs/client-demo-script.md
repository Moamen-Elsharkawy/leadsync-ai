# Client Demo Script

This script is for a live client or portfolio walkthrough using safe demo data. It now supports two productized demo paths: Dental Clinic and Online Course.

## Before The Call

- Set `DEMO_MODE=true` in `.env`.
- Choose one preset:
  - `BUSINESS_PRESET=dental-clinic`
  - `BUSINESS_PRESET=online-course`
- Confirm Apps Script is deployed and initialized.
- If you edited `google-apps-script/Code.gs`, paste it into Apps Script and redeploy the Web App.
- Run `npm run setup:sheets`.
- Start the app with `npm run dev`.
- Open the Google Sheet and keep the tabs visible.
- Open the dashboard URL with the admin password.
- Open Telegram from the admin account.

## Shared Demo Flow

1. Show the architecture in one sentence:

   "Telegram is the customer channel, OpenRouter handles AI understanding, and Google Sheets is the CRM through a Google Apps Script Web App. There is no database or Google Cloud setup."

2. In Telegram, send:

   ```text
   /setup_sheets
   ```

   Show that the bot verifies the Sheets tabs and headers.

3. Send:

   ```text
   /demo
   ```

   Explain that this seeds safe fake leads and Arabic messages for the active business preset.

4. Show the Google Sheet tabs:
   - Leads
   - Sessions
   - Messages
   - FollowUps
   - Reports
   - Settings

5. Open the dashboard:

   ```text
   http://localhost:3000/dashboard?password=YOUR_ADMIN_PASSWORD
   ```

   Point out total leads, Hot/Warm/Cold counts, demo lead count, and latest leads.

6. In Telegram, send:

   ```text
   /hot
   /warm
   /report
   ```

7. Inspect one full demo lead:

   ```text
   /lead_lead_demo_dental_clinic_001
   ```

   or:

   ```text
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

   Explain that only rows marked `isDemo=true` are deleted.

## Dental Clinic Demo Path

Use this for clinics, dentists, orthodontists, and local healthcare businesses.

1. Set:

   ```env
   BUSINESS_PRESET=dental-clinic
   DEMO_MODE=true
   ```

2. Seed with `/demo` or force it with:

   ```text
   /demo_dental
   ```

3. From a non-admin Telegram account, send:

   ```text
   مساء الخير، محتاج استشارة زراعة أسنان الأسبوع ده. عندي أشعة جاهزة وميزانيتي حوالي ٢٥ ألف. رقمي 01011110001.
   ```

4. Show that the bot captures:
   - Service: زراعة الأسنان
   - Timeline: this week
   - Budget: 25000 EGP
   - Phone: captured
   - Status: Hot
   - Admin alert: yes

5. Positioning line:

   "For clinics, this qualifies patient inquiries without giving medical diagnosis, final prices, or confirmed appointments before reception approval."

## Online Course Demo Path

Use this for academies, coaches, course creators, and training companies.

1. Set:

   ```env
   BUSINESS_PRESET=online-course
   DEMO_MODE=true
   ```

2. Seed with `/demo` or force it with:

   ```text
   /demo_course
   ```

3. From a non-admin Telegram account, send:

   ```text
   عايز أشترك في كورس Data Analysis وأبدأ الأسبوع ده. ميزانيتي حوالي ٥ آلاف ورقمي 01033330001.
   ```

4. Show that the bot captures:
   - Service: الاشتراك في كورس فردي
   - Timeline: this week
   - Budget: 5000 EGP
   - Phone: captured
   - Status: Hot
   - Admin alert: yes

5. Positioning line:

   "For course businesses, this filters serious learners, captures budget and start timeline, and avoids promising jobs, discounts, or confirmed enrollment."

## Client Positioning

- "This is lightweight enough for a small business to run without a database."
- "The business owner can inspect everything in Google Sheets."
- "The Apps Script bridge avoids service accounts and Google Cloud setup."
- "The same codebase can be sold as vertical templates for clinics, academies, agencies, and local service businesses."
