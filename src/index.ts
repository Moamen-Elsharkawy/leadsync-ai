import { startAdminServer } from "./admin/adminServer.js";
import { createOpenRouterClient } from "./ai/openRouterClient.js";
import { createBot } from "./bot/bot.js";
import { loadBusinessConfigForPreset } from "./config/businessConfig.js";
import { loadEnv } from "./config/env.js";
import { createSheetsWebAppClientFromEnv } from "./sheets/sheetsWebAppClient.js";
import { FollowUpService } from "./services/followUpService.js";
import { LeadService } from "./services/leadService.js";
import { MessageService } from "./services/messageService.js";
import { ReportService } from "./services/reportService.js";
import { createShutdownHandler } from "./runtime/shutdown.js";
import { SessionService } from "./services/sessionService.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  const env = loadEnv();

  if (env.BOT_MODE !== "polling") {
    throw new Error("Only Telegram polling mode is supported in this MVP.");
  }

  const businessConfig = loadBusinessConfigForPreset(env.BUSINESS_PRESET);
  const sheets = createSheetsWebAppClientFromEnv();
  const aiClient = createOpenRouterClient(env);
  const leadService = new LeadService(sheets);
  const sessionService = new SessionService(sheets);
  const messageService = new MessageService(sheets);
  const followUpService = new FollowUpService(sheets);
  const reportService = new ReportService(sheets);
  const bot = createBot({
    env,
    businessConfig,
    aiClient,
    sheets,
    leadService,
    sessionService,
    messageService,
    followUpService,
    reportService,
  });
  logger.info(`Starting admin server on port ${env.ADMIN_PORT}`);
  const adminServer = await startAdminServer({
    port: env.ADMIN_PORT,
    password: env.ADMIN_PASSWORD,
    sheets,
    aiClient,
    leadService,
    followUpService,
    reportService,
  });

  followUpService.start(bot);
  await bot.launch();

  logger.info("Physical therapy business config loaded");
  logger.info("Telegram bot started in polling mode");

  const shutdown = createShutdownHandler({
    bot,
    adminServer,
    followUpService,
  });

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", { error: reason });
    shutdown("unhandledRejection");
  });
  process.once("uncaughtException", (error) => {
    logger.error("Uncaught exception", { error });
    shutdown("uncaughtException");
  });
}

void main().catch((error) => {
  logger.error("Application failed to start", { error });
  process.exit(1);
});
