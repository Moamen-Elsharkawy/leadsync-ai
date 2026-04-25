import path from "node:path";
import { config as loadDotEnv } from "dotenv";
import type { BusinessPreset } from "@smartflow/config/businessConfig";

export const rootDir = path.resolve(process.cwd(), "../..");

loadDotEnv({ path: path.join(rootDir, ".env") });

const requiredKeys = [
  "TELEGRAM_BOT_TOKEN",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
  "OPENROUTER_SITE_URL",
  "OPENROUTER_APP_NAME",
  "ADMIN_TELEGRAM_ID",
  "GOOGLE_SHEETS_WEBAPP_URL",
  "GOOGLE_SHEETS_WEBAPP_SECRET",
  "ADMIN_PORT",
  "ADMIN_PASSWORD",
  "DEMO_MODE",
  "BOT_MODE",
  "BUSINESS_PRESET",
];

export interface DashboardEnv {
  adminPassword: string;
  dashboardSecret: string;
  demoMode: boolean;
  businessPreset: BusinessPreset;
  botMode: string;
  googleSheetsWebAppUrl: string;
  googleSheetsWebAppSecret: string;
  envPresence: Record<string, boolean>;
}

export function loadDashboardEnv(): DashboardEnv {
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  const dashboardSecret =
    process.env.DASHBOARD_SECRET || process.env.ADMIN_PASSWORD || "";
  const businessPreset = parseBusinessPreset(process.env.BUSINESS_PRESET);

  return {
    adminPassword,
    dashboardSecret,
    demoMode: parseBoolean(process.env.DEMO_MODE),
    businessPreset,
    botMode: process.env.BOT_MODE ?? "",
    googleSheetsWebAppUrl: process.env.GOOGLE_SHEETS_WEBAPP_URL ?? "",
    googleSheetsWebAppSecret: process.env.GOOGLE_SHEETS_WEBAPP_SECRET ?? "",
    envPresence: Object.fromEntries(
      requiredKeys.map((key) => [key, Boolean(process.env[key])]),
    ),
  };
}

function parseBusinessPreset(value: string | undefined): BusinessPreset {
  if (
    value === "dental-clinic" ||
    value === "online-course" ||
    value === "physical-therapy"
  ) {
    return value;
  }

  return "custom";
}

function parseBoolean(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}
