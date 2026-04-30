import { Telegraf } from "telegraf";
import type { Env } from "../config/env.js";
import type { BusinessConfig } from "../config/businessConfig.js";
import type { OpenRouterClient } from "../ai/openRouterClient.js";
import { registerAdminCommands } from "./adminCommands.js";
import { registerMessageHandlers } from "./handlers.js";
import type { SheetsWebAppClient } from "../sheets/sheetsWebAppClient.js";
import type { FollowUpService } from "../services/followUpService.js";
import type { LeadService } from "../services/leadService.js";
import type { MessageService } from "../services/messageService.js";
import type { ReportService } from "../services/reportService.js";
import type { SessionService } from "../services/sessionService.js";
import { logger } from "../utils/logger.js";

export interface BotDeps {
  env: Env;
  businessConfig: BusinessConfig;
  aiClient: OpenRouterClient;
  sheets: SheetsWebAppClient;
  leadService: LeadService;
  sessionService: SessionService;
  messageService: MessageService;
  followUpService: FollowUpService;
  reportService: ReportService;
}

export function createBot(deps: BotDeps): Telegraf {
  const bot = new Telegraf(deps.env.TELEGRAM_BOT_TOKEN);

  registerAdminCommands(bot, {
    adminTelegramId: deps.env.ADMIN_TELEGRAM_ID,
    sheets: deps.sheets,
    leadService: deps.leadService,
    followUpService: deps.followUpService,
    reportService: deps.reportService,
  });

  registerMessageHandlers(bot, {
    aiClient: deps.aiClient,
    businessConfig: deps.businessConfig,
    sessionService: deps.sessionService,
    messageService: deps.messageService,
    leadService: deps.leadService,
    followUpService: deps.followUpService,
    adminTelegramId: deps.env.ADMIN_TELEGRAM_ID,
  });

  bot.catch((error) => {
    logger.error("Telegram bot error", error);
  });

  return bot;
}
