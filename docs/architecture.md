# Architecture

SmartFlow is now specialized for physical therapy centers.

## Runtime Flow

1. Customer sends a Telegram message.
2. Node.js Telegraf bot receives it in polling mode.
3. The inbound message is saved to the `Messages` sheet through the Apps Script Web App.
4. The bot loads the customer session from the `Sessions` sheet.
5. OpenRouter extracts physical therapy intake fields:
   - service requested
   - branch
   - condition area
   - urgency
   - preferred date and time
   - contact method and phone
6. Missing data is requested one question at a time in Arabic.
7. Qualified inquiries are classified as `Hot`, `Warm`, or `Cold`.
8. Leads, sessions, messages, follow-ups, and reports are written only through the Apps Script Web App.
9. The manager reviews everything in the Next.js dashboard.

## Storage Boundary

Node.js never talks directly to Google Sheets. The only storage path is:

```text
Node.js app -> HTTP POST -> Google Apps Script Web App -> Active Google Sheet
```

No database, Google Cloud, service account, Sheets API client, or credentials JSON is used.

## AI Boundary

OpenRouter is the only AI provider. The project uses the official `openai` npm package with the OpenRouter base URL. If OpenRouter fails, fallback logic keeps the conversation moving safely.

## Medical Safety

The assistant is an intake assistant, not a clinician. It must not diagnose, provide treatment advice, recommend exercises or medication, estimate session counts, promise outcomes, quote final prices, or confirm appointments before staff review.
