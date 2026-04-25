# SmartFlow AI Setup Checklist

Use this checklist before running the bot against real Telegram, OpenRouter, or Google Apps Script services.

## 1. Local Project

- Install Node.js 22 or newer.
- Run `npm install`.
- Copy `.env.example` to `.env`.
- Confirm `.env` is not committed. It is already ignored by `.gitignore`.

## 2. Telegram

- Create a bot with BotFather.
- Put the bot token in `.env` as `TELEGRAM_BOT_TOKEN`.
- Get your numeric Telegram user id from a trusted Telegram id helper bot.
- Put that id in `.env` as `ADMIN_TELEGRAM_ID`.

## 3. OpenRouter

- Create an OpenRouter API key.
- Put it in `.env` as `OPENROUTER_API_KEY`.
- Choose a model and set `OPENROUTER_MODEL`.
- Keep `OPENROUTER_SITE_URL` and `OPENROUTER_APP_NAME` set for OpenRouter attribution.
- Do not configure a separate OpenAI API key variable. This project uses OpenRouter only.

## 4. Google Sheet And Apps Script

- Create a Google Sheet for the CRM.
- Open **Extensions -> Apps Script** from that Sheet.
- Paste the full contents of `google-apps-script/Code.gs`.
- Save the Apps Script project.
- Deploy as Web App.
- Set **Execute as** to **Me**.
- Set **Who has access** to **Anyone**.
- Copy the Web App URL into `.env` as `GOOGLE_SHEETS_WEBAPP_URL`.

## 5. Shared Secret

- Choose a long private shared secret.
- Put it in `.env` as `GOOGLE_SHEETS_WEBAPP_SECRET`.
- Run `npm run init:secret` once after deploying the Apps Script Web App.
- Run `npm run setup:sheets` to create or verify tabs and headers.

## 6. Admin Dashboard

- Set `ADMIN_PORT`, usually `3000`.
- Set `ADMIN_PASSWORD` to a private dashboard password.
- Open `http://localhost:3000/dashboard?password=YOUR_PASSWORD` after starting the app.

## 7. Demo Mode

- Set `BUSINESS_PRESET=custom`, `BUSINESS_PRESET=dental-clinic`, or `BUSINESS_PRESET=online-course`.
- Use `dental-clinic` for the Dental Clinic demo and `online-course` for the Online Course demo.
- Set `DEMO_MODE=true` for portfolio demos.
- Set `DEMO_MODE=false` for real operation.
- In demo mode, customer follow-up sends are disabled, but admin notifications are still allowed.

## 8. Final Checks

Run:

```bash
npm test
npm run typecheck
npm run build
npm run format:check
```

Start locally:

```bash
npm run dev
```

If startup fails, check `.env`, Apps Script deployment, Telegram token, and the shared secret.
