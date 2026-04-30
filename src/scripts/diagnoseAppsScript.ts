import { config as loadDotEnv } from "dotenv";
import {
  SheetsWebAppClient,
  type AppsScriptDiagnosticsResult,
} from "../sheets/sheetsWebAppClient.js";
import { redactSecrets } from "../utils/logger.js";

loadDotEnv();

async function main(): Promise<void> {
  const webAppUrl = process.env.GOOGLE_SHEETS_WEBAPP_URL;

  if (!webAppUrl) {
    fail("GOOGLE_SHEETS_WEBAPP_URL is missing.");
    return;
  }

  if (!process.env.GOOGLE_SHEETS_WEBAPP_SECRET) {
    fail("GOOGLE_SHEETS_WEBAPP_SECRET is missing.");
    return;
  }

  console.log("SmartFlow Apps Script diagnostics");
  console.log(`Web App URL configured: ${maskUrl(webAppUrl)}`);

  await checkHealth(webAppUrl);
  await checkDiagnostics();
}

async function checkHealth(webAppUrl: string): Promise<void> {
  try {
    const response = await fetchWithTimeout(webAppUrl, { method: "GET" });
    const data = (await response.json()) as unknown;

    if (!response.ok) {
      fail(`doGet failed with HTTP ${response.status}.`);
      return;
    }

    const health = data as {
      ok?: boolean;
      data?: { status?: string; version?: string; actions?: string[] };
    };
    console.log(
      `doGet health: ${health.ok ? "ok" : "unexpected"} (${health.data?.status ?? "unknown"})`,
    );
    console.log(
      `Deployment version: ${health.data?.version ?? "not reported"}`,
    );

    if (!health.data?.actions?.includes("diagnostics")) {
      console.log(
        "Warning: this deployment does not report the diagnostics action. Paste and redeploy the latest Code.gs.",
      );
    }
  } catch (error) {
    fail(`doGet could not be reached: ${safeMessage(error)}`);
  }
}

async function checkDiagnostics(): Promise<void> {
  try {
    const diagnostics = await createDiagnosticClient().diagnostics();
    printDiagnostics(diagnostics);
  } catch (error) {
    const message = safeMessage(error);
    fail(`diagnostics action failed: ${message}`);

    if (/UNSUPPORTED_ACTION|Unsupported action/i.test(message)) {
      console.log(
        "Cause: deployed Apps Script is old. Paste the latest Code.gs and redeploy the Web App.",
      );
    } else if (
      /Invalid Google Apps Script secret|INVALID_SECRET/i.test(message)
    ) {
      console.log(
        "Cause: GOOGLE_SHEETS_WEBAPP_SECRET does not match SMARTFLOW_SECRET in Apps Script Properties.",
      );
    } else if (/SECRET_NOT_INITIALIZED/i.test(message)) {
      console.log(
        "Cause: SMARTFLOW_SECRET is not initialized. Run npm run init:secret after deployment.",
      );
    } else if (/timed out|TIMEOUT/i.test(message)) {
      console.log(
        "Cause: Apps Script timed out or network access is slow. Check deployment and script logs.",
      );
    } else if (/fetch failed|network|ENOTFOUND|ECONNRESET/i.test(message)) {
      console.log(
        "Cause: the Web App URL could not be reached. Check GOOGLE_SHEETS_WEBAPP_URL, internet access, and whether the Web App deployment is still active.",
      );
    }
  }
}

function createDiagnosticClient(): SheetsWebAppClient {
  return new SheetsWebAppClient({
    webAppUrl: process.env.GOOGLE_SHEETS_WEBAPP_URL ?? "",
    secret: process.env.GOOGLE_SHEETS_WEBAPP_SECRET ?? "",
    timeoutMs: 10000,
    maxRetries: 0,
  });
}

function printDiagnostics(diagnostics: AppsScriptDiagnosticsResult): void {
  console.log(`diagnostics: ${diagnostics.ok ? "ok" : "unexpected"}`);
  console.log(`Spreadsheet: ${diagnostics.spreadsheetName}`);
  console.log(`Version: ${diagnostics.version}`);
  console.log(`Secret initialized: ${diagnostics.secretInitialized}`);
  console.log(`Needs setup: ${diagnostics.needsSetup}`);

  if (diagnostics.missingTabs.length > 0) {
    console.log(`Missing tabs: ${diagnostics.missingTabs.join(", ")}`);
  }

  const missingHeaderEntries = Object.entries(diagnostics.missingHeaders);
  if (missingHeaderEntries.length > 0) {
    console.log("Missing headers:");
    for (const [tab, headers] of missingHeaderEntries) {
      console.log(`- ${tab}: ${headers.join(", ")}`);
    }
  }

  if (!diagnostics.needsSetup) {
    console.log("Apps Script and Sheet contract look ready.");
  } else {
    console.log(
      "Run npm run setup:sheets or use the dashboard Setup Sheets button.",
    );
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function fail(message: string): void {
  console.error(redactSecrets(message));
  process.exitCode = 1;
}

function safeMessage(error: unknown): string {
  return redactSecrets(error instanceof Error ? error.message : String(error));
}

function maskUrl(url: string): string {
  return url.replace(/\/s\/([^/]+)\//, "/s/****/");
}

void main().catch((error) => {
  fail(`Unexpected diagnostics failure: ${safeMessage(error)}`);
  process.exitCode = 1;
});
