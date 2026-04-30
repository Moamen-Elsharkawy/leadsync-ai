import "dotenv/config";
import { createSheetsWebAppClientFromEnv } from "../sheets/sheetsWebAppClient.js";

async function main(): Promise<void> {
  const client = createSheetsWebAppClientFromEnv();
  const result = await client.initSecret();

  console.log("Google Apps Script secret initialized.");
  console.log(`Initialized: ${result.initialized}`);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("secret is already initialized")) {
    console.log("Google Apps Script secret is already initialized.");
    console.log(
      "No action needed. Continue with npm run setup:sheets and npm run dev.",
    );
    process.exit(0);
  }

  console.error(message);
  process.exit(1);
});
