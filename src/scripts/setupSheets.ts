import "dotenv/config";
import { createSheetsWebAppClientFromEnv } from "../sheets/sheetsWebAppClient.js";

async function main(): Promise<void> {
  const client = createSheetsWebAppClientFromEnv();
  const result = await client.setupSheets();

  console.log("Google Sheets setup complete.");
  console.log(`Verified tabs: ${result.tabs.join(", ")}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
