# Dental Clinic Demo

This demo presents SmartFlow AI as a Telegram sales and reception assistant for a dental clinic. It uses safe fake data and does not provide medical diagnosis, final prices, medication advice, or confirmed appointments.

## Setup

Set these values in `.env`:

```env
BUSINESS_PRESET=dental-clinic
DEMO_MODE=true
```

Then run:

```bash
npm run setup:sheets
npm run dev
```

Seed the demo from the admin Telegram account:

```text
/demo
```

or:

```text
/demo_dental
```

## Business Profile

- Business name: Pearl Smile Dental Center
- Location style: Cairo-based clinic with online Telegram intake
- Services:
  - كشف واستشارة أسنان
  - تنظيف وتلميع الأسنان
  - تبييض الأسنان
  - زراعة الأسنان
  - تقويم الأسنان
  - استفسار طوارئ الأسنان

## Live Customer Message

Send this from a non-admin Telegram account:

```text
مساء الخير، محتاج استشارة زراعة أسنان الأسبوع ده. عندي أشعة جاهزة وميزانيتي حوالي ٢٥ ألف. رقمي 01011110001.
```

Expected outcome:

- The bot replies in Arabic.
- It identifies the service as زراعة الأسنان.
- It captures budget, timeline, and phone.
- It classifies the lead as Hot.
- It saves the lead, session, and messages in Google Sheets.
- It notifies the admin Telegram account.

## Talking Points

- The clinic can respond instantly without giving unsafe medical advice.
- Reception gets structured leads instead of scattered chat messages.
- Warm leads are queued for follow-up, but Demo Mode prevents accidental customer follow-up sends.
- Google Sheets remains the CRM, so the clinic team can inspect and edit rows directly.

## Safety Boundaries

The assistant must not:

- Diagnose a dental condition.
- Recommend medication.
- Guarantee treatment results.
- Confirm appointment availability.
- Quote final medical prices before clinic review.
