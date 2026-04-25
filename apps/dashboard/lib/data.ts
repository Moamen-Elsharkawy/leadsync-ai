import "server-only";
import path from "node:path";
import {
  loadBusinessConfig,
  resolveBusinessConfigPath,
} from "@smartflow/config/businessConfig";
import { DashboardDataService } from "@smartflow/dashboard/dashboardData";
import { SheetsWebAppClient } from "@smartflow/sheets/sheetsWebAppClient";
import { loadDashboardEnv, rootDir } from "./serverEnv";

export function getDashboardService(): DashboardDataService {
  const env = loadDashboardEnv();
  const sheets = new SheetsWebAppClient({
    webAppUrl: env.googleSheetsWebAppUrl,
    secret: env.googleSheetsWebAppSecret,
  });
  const businessConfig = loadBusinessConfig(
    path.resolve(rootDir, resolveBusinessConfigPath(env.businessPreset)),
  );

  return new DashboardDataService(sheets, businessConfig, {
    demoMode: env.demoMode,
    businessPreset: env.businessPreset,
    botMode: env.botMode,
    envPresence: env.envPresence,
    appsScriptConfigured: Boolean(env.googleSheetsWebAppUrl),
    openRouterModelConfigured: Boolean(process.env.OPENROUTER_MODEL),
    telegramTokenConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
  });
}
