# Online Course Demo

This demo presents SmartFlow AI as a Telegram enrollment assistant for an online course business. It uses safe fake data and does not guarantee jobs, income, certificates, discounts, or confirmed enrollment.

## Setup

Set these values in `.env`:

```env
BUSINESS_PRESET=online-course
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
/demo_course
```

## Business Profile

- Business name: SkillBridge Academy
- Business model: online courses, private coaching, and corporate training
- Services:
  - الاشتراك في كورس فردي
  - جلسات تدريب خاصة
  - تدريب فرق الشركات
  - باقة كورسات
  - استشارة اختيار مسار التعلم

## Live Customer Message

Send this from a non-admin Telegram account:

```text
عايز أشترك في كورس Data Analysis وأبدأ الأسبوع ده. ميزانيتي حوالي ٥ آلاف ورقمي 01033330001.
```

Expected outcome:

- The bot replies in Arabic.
- It identifies the request as الاشتراك في كورس فردي.
- It captures budget, timeline, and phone.
- It classifies the lead as Hot.
- It saves the lead, session, and messages in Google Sheets.
- It notifies the admin Telegram account.

## Talking Points

- The academy can qualify interested learners before a sales call.
- The bot asks one missing question at a time, so the chat feels natural.
- Hot leads go to the admin immediately; Warm leads are queued for follow-up.
- The same system can be reused for coaches, academies, training centers, and cohort-based courses.

## Safety Boundaries

The assistant must not:

- Promise job placement.
- Promise income outcomes.
- Confirm enrollment before admin approval.
- Offer discounts without admin approval.
- Promise certificates before confirming course requirements.
