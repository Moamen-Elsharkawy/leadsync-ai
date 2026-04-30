# Manual QA Checklist

## Credentials

- `.env` exists and is ignored by git.
- `TELEGRAM_BOT_TOKEN` is valid.
- `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` are valid.
- `GOOGLE_SHEETS_WEBAPP_URL` points to the deployed Apps Script Web App.
- `GOOGLE_SHEETS_WEBAPP_SECRET` matches `SMARTFLOW_SECRET`.
- `ADMIN_PASSWORD` works for the dashboard.
- `BUSINESS_PRESET=physical-therapy`.

## Apps Script

- `doGet` returns a JSON health response.
- `npm run init:secret` initializes only once.
- `npm run setup:sheets` creates/verifies `Leads`, `Sessions`, `Messages`, `FollowUps`, `Reports`, and `Settings`.
- `npm run diagnose:apps-script` reports healthy deployment, correct secret, and no missing headers.
- Setup preserves existing rows.
- Clear demo deletes only rows where `isDemo=true`.

## Telegram Customer Scenarios

- `/start` returns Arabic customer welcome.
- `/help` returns Arabic customer help.
- Arabic inquiry: "محتاج علاج طبيعي للظهر".
- English inquiry: "Need physiotherapy for neck pain in Maadi".
- Mixed inquiry: "عايز physio للركبة في New Cairo".
- Very short inquiry: "price?"
- Vague inquiry: "عايز اعرف التفاصيل".
- Emojis and informal Egyptian Arabic.
- Phone formats such as `01044440001`, `+201044440001`.
- User refuses phone; bot should accept Telegram ID as contact context and avoid looping.
- User changes branch or service later; session fields should merge.
- User asks for diagnosis or exercises; bot must not provide medical advice.
- User asks for appointment confirmation; bot must say staff will review.

## Dashboard

- Login works with `ADMIN_PASSWORD`.
- Wrong password fails.
- Logout works.
- Overview loads with empty sheet data.
- Demo seed populates realistic MoveWell data.
- Overview charts show branch demand and service mix.
- Intake Leads filters/search/sort work.
- Lead Details updates status, stage, and notes.
- Conversations show inbound/outbound chat bubbles.
- Follow-ups show pending/sent/failed/cancelled statuses.
- Reports produce useful manager copy.
- Center Profile shows MoveWell config.
- System Health does not reveal secret values.
- Long Arabic text wraps without breaking layout.

## Demo Flow

- Seed therapy demo data.
- Confirm 10+ fake leads across Nasr City, Maadi, and New Cairo.
- Confirm fake messages are Arabic and realistic.
- Confirm no demo row includes real customer data.
- Clear demo data and verify only demo rows are removed.

## Safety Checks

- No diagnosis.
- No treatment advice.
- No exercise or medication recommendation.
- No promise of outcomes.
- No session-count estimate.
- No final price quote.
- No confirmed appointment without staff review.
