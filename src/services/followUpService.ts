import cron from "node-cron";
import type { Telegraf } from "telegraf";
import type { SheetsWebAppClient } from "../sheets/sheetsWebAppClient.js";
import type { LeadRecord, LeadStatus } from "../types/lead.js";
import type { FollowUpRecord } from "../types/message.js";
import { addHoursIso, isIsoDue, nowIso } from "../utils/date.js";
import { createFollowUpId } from "../utils/id.js";
import { logger } from "../utils/logger.js";
import { safeTelegramSendMessage } from "../utils/telegram.js";

export type FollowUpSender = (
  telegramUserId: string,
  message: string,
) => Promise<void>;

export type FollowUpReason = "warm_lead" | "incomplete_qualification";

export interface FollowUpDecision {
  shouldSchedule: boolean;
  reason?: FollowUpReason;
  scheduledAt?: string;
  message?: string;
}

export interface QualificationFollowUpInput {
  leadId: string;
  telegramUserId: string;
}

export interface FollowUpServiceOptions {
  demoMode?: boolean;
  scheduler?: CronScheduler;
}

export interface ScheduledTaskLike {
  stop(): void;
}

export type CronScheduler = (
  expression: string,
  task: () => void,
) => ScheduledTaskLike;

const MAX_FOLLOW_UP_ATTEMPTS = 2;
const WARM_FOLLOW_UP_DELAY_HOURS = 24;
const SECOND_FOLLOW_UP_DELAY_HOURS = 72;

export class FollowUpService {
  private cronTask?: ScheduledTaskLike;

  constructor(
    private readonly sheets: SheetsWebAppClient,
    private readonly defaultSender?: FollowUpSender,
    private readonly options: FollowUpServiceOptions = {},
  ) {}

  async scheduleForLead(lead: LeadRecord): Promise<FollowUpRecord | null> {
    if (this.options.demoMode) {
      return null;
    }

    const decision = getLeadFollowUpDecision(lead);
    if (
      !decision.shouldSchedule ||
      !decision.scheduledAt ||
      !decision.message
    ) {
      return null;
    }

    return this.appendIfAllowed({
      leadId: lead.leadId,
      telegramUserId: lead.telegramUserId,
      scheduledAt: decision.scheduledAt,
      message: decision.message,
      attemptNumber: 1,
    });
  }

  appendInitialFollowUp(lead: LeadRecord): Promise<FollowUpRecord | null> {
    return this.scheduleForLead(lead);
  }

  async scheduleIncompleteQualificationFollowUp(
    input: QualificationFollowUpInput,
  ): Promise<FollowUpRecord | null> {
    if (this.options.demoMode) {
      return null;
    }

    const scheduledAt = addHoursIso(WARM_FOLLOW_UP_DELAY_HOURS);
    return this.appendIfAllowed({
      leadId: input.leadId,
      telegramUserId: input.telegramUserId,
      scheduledAt,
      message: buildFollowUpMessage("incomplete_qualification"),
      attemptNumber: 1,
    });
  }

  async cancelPendingFollowUpsForUser(telegramUserId: string): Promise<number> {
    const pending = await this.sheets.listFollowUps("pending");
    const matching = pending.filter(
      (followUp) => followUp.telegramUserId === telegramUserId,
    );

    await Promise.all(
      matching.map((followUp) =>
        this.sheets.updateFollowUp({
          ...followUp,
          status: "cancelled",
          sentAt: followUp.sentAt || nowIso(),
        }),
      ),
    );

    return matching.length;
  }

  start(bot: Telegraf): ScheduledTaskLike {
    if (this.cronTask) {
      return this.cronTask;
    }

    const scheduler: CronScheduler =
      this.options.scheduler ??
      ((expression, task) => cron.schedule(expression, task));

    this.cronTask = scheduler("* * * * *", () => {
      void this.processDueFollowUps(async (telegramUserId, message) => {
        const sent = await safeTelegramSendMessage(
          bot.telegram.sendMessage.bind(bot.telegram),
          telegramUserId,
          message,
          { purpose: "follow_up" },
        );

        if (!sent.ok) {
          throw new Error("Telegram follow-up send failed.");
        }
      }).catch((error) => {
        logger.error("Follow-up cron processing failed", { error });
      });
    });

    return this.cronTask;
  }

  stop(): void {
    this.cronTask?.stop();
    this.cronTask = undefined;
  }

  async processDueFollowUps(sender = this.defaultSender): Promise<void> {
    if (this.options.demoMode) {
      logger.info("Demo mode enabled; skipping customer follow-up sends");
      return;
    }

    if (!sender) {
      throw new Error("A follow-up sender is required.");
    }

    const followUps = await this.sheets.listFollowUps("pending");
    const dueFollowUps = followUps.filter((followUp) =>
      isIsoDue(followUp.scheduledAt),
    );

    for (const followUp of dueFollowUps) {
      await this.sendOneFollowUp(sender, followUp);
    }
  }

  listFollowUps(status?: FollowUpRecord["status"]): Promise<FollowUpRecord[]> {
    return this.sheets.listFollowUps(status);
  }

  private async appendIfAllowed(input: {
    leadId: string;
    telegramUserId: string;
    scheduledAt: string;
    message: string;
    attemptNumber: number;
  }): Promise<FollowUpRecord | null> {
    const allFollowUps = await this.sheets.listFollowUps();
    const related = allFollowUps.filter(
      (followUp) => followUp.leadId === input.leadId,
    );
    const hasPending = related.some(
      (followUp) => followUp.status === "pending",
    );
    const maxAttempt = Math.max(
      0,
      ...related.map((followUp) => Number(followUp.attemptNumber || 0)),
    );

    if (hasPending || maxAttempt >= MAX_FOLLOW_UP_ATTEMPTS) {
      return null;
    }

    return this.sheets.appendFollowUp(
      createFollowUp({
        ...input,
        attemptNumber: Math.max(input.attemptNumber, maxAttempt + 1),
      }),
    );
  }

  private async sendOneFollowUp(
    sender: FollowUpSender,
    followUp: FollowUpRecord,
  ): Promise<void> {
    try {
      await sender(followUp.telegramUserId, followUp.message);
      await this.sheets.updateFollowUp({
        ...followUp,
        status: "sent",
        sentAt: nowIso(),
      });

      const lead = await this.sheets.getLead(followUp.leadId);
      if (lead) {
        await this.updateLeadAfterFollowUp(lead, followUp.attemptNumber);
      }
    } catch (error) {
      logger.error("Failed to send follow-up", {
        followUpId: followUp.followUpId,
        error,
      });
      await this.sheets.updateFollowUp({
        ...followUp,
        status: "failed",
      });
    }
  }

  private async updateLeadAfterFollowUp(
    lead: LeadRecord,
    attemptNumber: number,
  ): Promise<void> {
    const nextAttempt = attemptNumber + 1;
    const nextFollowUpAt =
      nextAttempt <= MAX_FOLLOW_UP_ATTEMPTS
        ? addHoursIso(SECOND_FOLLOW_UP_DELAY_HOURS)
        : "";
    const updatedLead: LeadRecord = {
      ...lead,
      followUpCount: Number(lead.followUpCount ?? 0) + 1,
      nextFollowUpAt,
      updatedAt: nowIso(),
    };

    await this.sheets.upsertLead(updatedLead);

    if (nextFollowUpAt && lead.status === "Warm") {
      await this.appendIfAllowed({
        leadId: updatedLead.leadId,
        telegramUserId: updatedLead.telegramUserId,
        scheduledAt: nextFollowUpAt,
        message: buildFollowUpMessage("warm_lead"),
        attemptNumber: nextAttempt,
      });
    }
  }
}

export function getLeadFollowUpDecision(lead: LeadRecord): FollowUpDecision {
  if (lead.status !== "Warm") {
    return { shouldSchedule: false };
  }

  return {
    shouldSchedule: true,
    reason: "warm_lead",
    scheduledAt: lead.nextFollowUpAt || addHoursIso(WARM_FOLLOW_UP_DELAY_HOURS),
    message: buildFollowUpMessage("warm_lead"),
  };
}

export function buildFollowUpMessage(reason: FollowUpReason): string {
  if (reason === "incomplete_qualification") {
    return "مرحبا، أردنا المتابعة بخصوص طلبك. هل يمكنك إرسال التفاصيل الناقصة حتى نساعدك بشكل أفضل؟";
  }

  return "مرحبا، شكرا لتواصلك معنا سابقا. هل ما زلت مهتما بأن نساعدك في الخطوة التالية؟";
}

export function shouldScheduleFollowUpForStatus(status: LeadStatus): boolean {
  return status === "Warm";
}

function createFollowUp(input: {
  leadId: string;
  telegramUserId: string;
  scheduledAt: string;
  message: string;
  attemptNumber: number;
}): FollowUpRecord {
  return {
    followUpId: createFollowUpId(),
    leadId: input.leadId,
    telegramUserId: input.telegramUserId,
    status: "pending",
    scheduledAt: input.scheduledAt,
    sentAt: "",
    message: input.message,
    attemptNumber: input.attemptNumber,
  };
}
