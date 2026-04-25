import type { Context, Telegraf } from "telegraf";
import type { BusinessPreset } from "../config/businessConfig.js";
import type { SheetsWebAppClient } from "../sheets/sheetsWebAppClient.js";
import type { FollowUpService } from "../services/followUpService.js";
import type { LeadService } from "../services/leadService.js";
import type { ReportService } from "../services/reportService.js";
import type { LeadRecord } from "../types/lead.js";
import type { FollowUpRecord } from "../types/message.js";
import { logger } from "../utils/logger.js";
import { safeTelegramReply } from "../utils/telegram.js";

const LEAD_LIST_LIMIT = 10;
const FOLLOW_UP_LIST_LIMIT = 10;
export const NON_ADMIN_COMMAND_MESSAGE =
  "عذرا، هذا الأمر غير متاح لهذا الحساب.";

export interface AdminCommandDeps {
  adminTelegramId?: string;
  businessPreset?: BusinessPreset;
  sheets: SheetsWebAppClient;
  leadService: LeadService;
  followUpService: FollowUpService;
  reportService: ReportService;
}

export function registerAdminCommands(
  bot: Telegraf,
  deps: AdminCommandDeps,
): void {
  bot.start((ctx) => {
    const text = isAdminContext(ctx, deps.adminTelegramId)
      ? "SmartFlow admin is ready. Use /help to view commands."
      : "أهلا بك. أرسل لنا تفاصيل الخدمة التي تحتاجها وسنساعدك خطوة بخطوة.";
    return ctx.reply(text);
  });

  bot.help((ctx) => {
    if (!isAdminContext(ctx, deps.adminTelegramId)) {
      return ctx.reply(
        "أرسل تفاصيل طلبك، وسأسألك عن أي معلومة ناقصة حتى نساعدك بشكل أفضل.",
      );
    }

    return ctx.reply(formatAdminHelp());
  });

  bot.command(
    "setup_sheets",
    adminOnly(deps, async (ctx) => {
      const result = await deps.sheets.setupSheets();
      await replyInChunks(
        ctx,
        [
          "Sheets setup complete",
          `Tabs verified: ${result.tabs.join(", ")}`,
          `Existing data preserved: ${result.preservedExistingData ? "yes" : "unknown"}`,
        ].join("\n"),
      );
    }),
  );

  bot.command(
    "leads",
    adminOnly(deps, async (ctx) => {
      const leads = await deps.leadService.listLeads(LEAD_LIST_LIMIT);
      await replyInChunks(ctx, formatLeadList("Latest leads", leads));
    }),
  );

  bot.command(
    "hot",
    adminOnly(deps, async (ctx) => {
      const leads = await deps.leadService.listHotLeads(LEAD_LIST_LIMIT);
      await replyInChunks(ctx, formatLeadList("Latest Hot leads", leads));
    }),
  );

  bot.command(
    "warm",
    adminOnly(deps, async (ctx) => {
      const leads = await deps.leadService.listWarmLeads(LEAD_LIST_LIMIT);
      await replyInChunks(ctx, formatLeadList("Latest Warm leads", leads));
    }),
  );

  bot.command(
    "cold",
    adminOnly(deps, async (ctx) => {
      const leads = await deps.leadService.listColdLeads(LEAD_LIST_LIMIT);
      await replyInChunks(ctx, formatLeadList("Latest Cold leads", leads));
    }),
  );

  bot.command(
    "report",
    adminOnly(deps, async (ctx) => {
      const summary = await deps.reportService.getSummary();
      await replyInChunks(ctx, formatReportSummary(summary));
    }),
  );

  bot.command(
    "followups",
    adminOnly(deps, async (ctx) => {
      const followUps = await deps.followUpService.listFollowUps("pending");
      await replyInChunks(ctx, formatFollowUps(followUps));
    }),
  );

  bot.command(
    "demo",
    adminOnly(deps, async (ctx) => {
      const preset = deps.businessPreset ?? "custom";
      const result = await deps.sheets.seedDemoData(preset);
      await ctx.reply(formatDemoSeedResult(result, preset));
    }),
  );

  bot.command(
    "demo_dental",
    adminOnly(deps, async (ctx) => {
      const preset = "dental-clinic";
      const result = await deps.sheets.seedDemoData(preset);
      await ctx.reply(formatDemoSeedResult(result, preset));
    }),
  );

  bot.command(
    "demo_course",
    adminOnly(deps, async (ctx) => {
      const preset = "online-course";
      const result = await deps.sheets.seedDemoData(preset);
      await ctx.reply(formatDemoSeedResult(result, preset));
    }),
  );

  bot.command(
    "demo_physical",
    adminOnly(deps, async (ctx) => {
      const preset = "physical-therapy";
      const result = await deps.sheets.seedDemoData(preset);
      await ctx.reply(formatDemoSeedResult(result, preset));
    }),
  );

  bot.command(
    "clear_demo",
    adminOnly(deps, async (ctx) => {
      const result = await deps.sheets.clearDemoData();
      await ctx.reply(
        `Demo data cleared. Deleted rows: ${result.deletedRows ?? "unknown"}`,
      );
    }),
  );

  bot.hears(
    /^\/lead_(.+)$/i,
    adminOnly(deps, async (ctx) => {
      const leadId = extractLeadId(getText(ctx));
      if (!leadId) {
        await ctx.reply("Missing lead id. Use /lead_<id>.");
        return;
      }

      const lead = await findLeadByCommandId(deps.leadService, leadId);
      await replyInChunks(
        ctx,
        lead ? formatLeadDetails(lead) : `Lead not found: ${leadId}`,
      );
    }),
  );
}

export function isAdminTelegramUser(
  telegramUserId: number | string | undefined,
  adminTelegramId?: string,
): boolean {
  return Boolean(
    adminTelegramId &&
    telegramUserId !== undefined &&
    String(telegramUserId) === adminTelegramId,
  );
}

export function isAdminContext(
  ctx: Context,
  adminTelegramId?: string,
): boolean {
  return isAdminTelegramUser(ctx.from?.id, adminTelegramId);
}

export function adminOnly(
  deps: Pick<AdminCommandDeps, "adminTelegramId">,
  handler: (ctx: Context) => Promise<void>,
) {
  return async (ctx: Context): Promise<void> => {
    if (!isAdminContext(ctx, deps.adminTelegramId)) {
      await safeTelegramReply(ctx, NON_ADMIN_COMMAND_MESSAGE, {
        purpose: "non_admin_command",
      });
      return;
    }

    try {
      await handler(ctx);
    } catch (error) {
      logger.error("Admin command failed", error);
      await safeTelegramReply(ctx, "Command failed. Check the app logs.", {
        purpose: "admin_command_error",
      });
    }
  };
}

export function formatLeadList(title: string, leads: LeadRecord[]): string {
  const latestLeads = sortLatestLeads(leads).slice(0, LEAD_LIST_LIMIT);
  if (latestLeads.length === 0) {
    return `${title}\nNo leads found.`;
  }

  return [
    `${title} (${latestLeads.length})`,
    ...latestLeads.map((lead, index) =>
      [
        `${index + 1}. ${lead.status} (${lead.leadScore}) - ${lead.leadId}`,
        `Service: ${valueOrDash(lead.serviceRequested)}`,
        `Name: ${valueOrDash(lead.fullName)}`,
        `Phone: ${valueOrDash(lead.phone)}`,
        `Timeline: ${valueOrDash(lead.timeline)}`,
        `Budget: ${valueOrDash(lead.budget)}`,
        `Updated: ${valueOrDash(lead.updatedAt)}`,
      ].join("\n"),
    ),
  ].join("\n\n");
}

export function formatLeadDetails(lead: LeadRecord): string {
  return [
    `Lead details: ${lead.leadId}`,
    `Status: ${lead.status}`,
    `Score: ${lead.leadScore}`,
    `Stage: ${lead.stage}`,
    "",
    `Telegram ID: ${lead.telegramUserId}`,
    `Username: ${valueOrDash(lead.telegramUsername)}`,
    `Name: ${valueOrDash(lead.fullName)}`,
    `Phone: ${valueOrDash(lead.phone)}`,
    "",
    `Service: ${valueOrDash(lead.serviceRequested)}`,
    `Budget: ${valueOrDash(lead.budget)}`,
    `Timeline: ${valueOrDash(lead.timeline)}`,
    `Location: ${valueOrDash(lead.location)}`,
    "",
    `Last question: ${valueOrDash(lead.lastQuestionAsked)}`,
    `Follow-up count: ${lead.followUpCount}`,
    `Next follow-up: ${valueOrDash(lead.nextFollowUpAt)}`,
    `Created: ${valueOrDash(lead.createdAt)}`,
    `Updated: ${valueOrDash(lead.updatedAt)}`,
    "",
    `Notes:\n${valueOrDash(lead.notes)}`,
  ].join("\n");
}

export function formatFollowUps(followUps: FollowUpRecord[]): string {
  const pending = followUps
    .filter((followUp) => followUp.status === "pending")
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, FOLLOW_UP_LIST_LIMIT);

  if (pending.length === 0) {
    return "Pending follow-ups\nNo pending follow-ups found.";
  }

  return [
    `Pending follow-ups (${pending.length})`,
    ...pending.map((followUp, index) =>
      [
        `${index + 1}. ${followUp.followUpId}`,
        `Lead: ${followUp.leadId}`,
        `Telegram ID: ${followUp.telegramUserId}`,
        `Scheduled: ${followUp.scheduledAt}`,
        `Attempt: ${followUp.attemptNumber}`,
        `Message: ${followUp.message}`,
      ].join("\n"),
    ),
  ].join("\n\n");
}

export function formatReportSummary(summary: {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
}): string {
  return [
    "Lead report",
    `Total leads: ${summary.totalLeads}`,
    `Hot leads: ${summary.hotLeads}`,
    `Warm leads: ${summary.warmLeads}`,
    `Cold leads: ${summary.coldLeads}`,
  ].join("\n");
}

function formatAdminHelp(): string {
  return [
    "Admin commands",
    "/leads - show latest 10 leads",
    "/hot - show latest Hot leads",
    "/warm - show latest Warm leads",
    "/cold - show latest Cold leads",
    "/report - show summary report",
    "/followups - show pending follow-ups",
    "/lead_<id> - show full lead details",
    "/setup_sheets - create missing sheets and headers",
    "/demo - seed demo data for the active business preset",
    "/demo_dental - seed Dental Clinic demo data",
    "/demo_course - seed Online Course demo data",
    "/demo_physical - seed Physical Therapy demo data",
    "/clear_demo - clear demo data only",
  ].join("\n");
}

function formatDemoSeedResult(
  result: { createdLeads?: number; createdMessages?: number; preset?: string },
  requestedPreset: BusinessPreset,
): string {
  return [
    `Demo data seeded for ${formatPresetName(result.preset ?? requestedPreset)}.`,
    `Leads: ${result.createdLeads ?? "unknown"}`,
    `Messages: ${result.createdMessages ?? "unknown"}`,
  ].join("\n");
}

function formatPresetName(preset: string): string {
  if (preset === "dental-clinic") {
    return "Dental Clinic";
  }

  if (preset === "online-course") {
    return "Online Course";
  }

  if (preset === "physical-therapy") {
    return "Physical Therapy";
  }

  return "Custom Business";
}

function sortLatestLeads(leads: LeadRecord[]): LeadRecord[] {
  return [...leads].sort((a, b) => {
    const left = Date.parse(a.updatedAt || a.createdAt || "");
    const right = Date.parse(b.updatedAt || b.createdAt || "");
    return (
      (Number.isFinite(right) ? right : 0) - (Number.isFinite(left) ? left : 0)
    );
  });
}

function extractLeadId(text: string): string | null {
  const match = /^\/lead_(.+)$/i.exec(text);
  return match?.[1]?.trim() || null;
}

async function findLeadByCommandId(
  leadService: LeadService,
  leadId: string,
): Promise<LeadRecord | null> {
  if (leadId.startsWith("lead_")) {
    return leadService.getLead(leadId);
  }

  return (
    (await leadService.getLead(`lead_${leadId}`)) ??
    (await leadService.getLead(leadId))
  );
}

async function replyInChunks(ctx: Context, text: string): Promise<void> {
  const maxLength = 3900;
  if (text.length <= maxLength) {
    await ctx.reply(text);
    return;
  }

  for (let index = 0; index < text.length; index += maxLength) {
    await ctx.reply(text.slice(index, index + maxLength));
  }
}

function getText(ctx: Context): string {
  const message = ctx.message;
  if (message && "text" in message && typeof message.text === "string") {
    return message.text;
  }

  return "";
}

function valueOrDash(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return String(value);
}
