import "dotenv/config";
import { createSheetsWebAppClientFromEnv } from "../sheets/sheetsWebAppClient.js";

async function main(): Promise<void> {
  const client = createSheetsWebAppClientFromEnv();
  const result = await client.initSecret();

  console.log("Google Apps Script secret initialized.");
  console.log(`Initialized: ${result.initialized}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
