# Google Apps Script Setup

This project uses Google Apps Script as the only bridge between Node.js and Google Sheets.

## Steps

1. Create a new clean Google Sheet for the physical therapy system.
2. Open **Extensions -> Apps Script** from the Sheet.
3. Paste the full contents of `google-apps-script/Code.gs`.
4. Save the Apps Script project.
5. Deploy as Web App.
6. Set **Execute as** to **Me**.
7. Set **Who has access** to **Anyone**.
8. Copy the Web App URL.
9. Put the URL in `.env` as `GOOGLE_SHEETS_WEBAPP_URL`.
10. Set a long shared secret in `.env` as `GOOGLE_SHEETS_WEBAPP_SECRET`.
11. Run `npm run init:secret`.
12. Run `npm run setup:sheets`.
13. Run `npm run diagnose:apps-script` to verify the active deployment and headers without changing any rows.

## Notes

- The script uses `SpreadsheetApp.getActiveSpreadsheet()`.
- The expected secret is stored in Script Properties as `SMARTFLOW_SECRET`.
- `setup` creates missing tabs and headers without clearing existing data.
- `clearDemoData` deletes only rows where `isDemo` is true.
- If you used an older generic SmartFlow sheet, create a new Sheet for the physical therapy version so the manager dashboard stays clean.
- The `diagnostics` action is read-only and reports missing tabs, missing headers, outdated deployment code, and secret status.
