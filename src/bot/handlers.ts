import { message } from "telegraf/filters";
import type { Telegraf } from "telegraf";
import type { BusinessConfig } from "../config/businessConfig.js";
import { classifyLead } from "../ai/leadClassifier.js";
import { extractLeadInfo } from "../ai/leadExtractor.js";
import type { OpenRouterClient } from "../ai/openRouterClient.js";
import { generateArabicReply } from "../ai/replyGenerator.js";
import type { FollowUpService } from "../services/followUpService.js";
import {
  buildLeadRecord,
  formatLeadSummary,
  type LeadService,
} from "../services/leadService.js";
import type { MessageService } from "../services/messageService.js";
import {
  selectNextQualificationQuestion,
  type SessionService,
} from "../services/sessionService.js";
import { nowIso } from "../utils/date.js";
import { createLeadId } from "../utils/id.js";
import { logger } from "../utils/logger.js";
import {
  safeTelegramReply,
  safeTelegramSendMessage,
} from "../utils/telegram.js";

export interface MessageHandlerDeps {
  aiClient: OpenRouterClient;
  businessConfig: BusinessConfig;
  sessionService: SessionService;
  messageService: MessageService;
  leadService: LeadService;
  followUpService: FollowUpService;
  adminTelegramId?: string;
  demoMode?: boolean;
}

export function registerMessageHandlers(
  bot: Telegraf,
  deps: MessageHandlerDeps,
): void {
  bot.on(message("text"), async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text || text.startsWith("/")) {
      return;
    }

    const telegramUserId = String(ctx.from.id);
    const telegramUsername = ctx.from.username ? `@${ctx.from.username}` : "";
    const leadId = createLeadId(telegramUserId);

    try {
      await deps.messageService.appendMessage({
        leadId,
        telegramUserId,
        direction: "inbound",
        text,
        telegramMessageId: ctx.message.message_id,
      });
      await deps.followUpService.cancelPendingFollowUpsForUser(telegramUserId);

      const session =
        await deps.sessionService.getOrCreateSession(telegramUserId);
      const extraction = await extractLeadInfo({
        client: deps.aiClient,
        messageText: text,
        existingFields: session.collectedFields,
        businessConfig: deps.businessConfig,
      });
      const fields = extraction.merged;
      const contact = {
        telegramUserId,
        telegramUsername,
        phone: fields.phone,
      };
      const nextQuestion = selectNextQualificationQuestion(
        fields,
        contact,
        deps.businessConfig,
        session.lastQuestionAsked,
      );

      if (nextQuestion) {
        session.currentStep = "qualifying";
        session.collectedFields = fields;
        session.lastQuestionAsked = nextQuestion.question;
        session.lastMessageAt = nowIso();
        session.updatedAt = nowIso();
        await deps.sessionService.saveSession(session);
        await deps.followUpService.scheduleIncompleteQualificationFollowUp({
          leadId,
          telegramUserId,
        });

        const sent = await safeTelegramReply(ctx, nextQuestion.question, {
          telegramUserId,
          leadId,
          purpose: "qualification_question",
        });
        if (sent.ok) {
          await deps.messageService.appendMessage({
            leadId,
            telegramUserId,
            direction: "outbound",
            text: nextQuestion.question,
            telegramMessageId: sent.messageId,
          });
        }
        return;
      }

      const classification = await classifyLead({
        client: deps.aiClient,
        fields,
        rawMessages: [text],
      });
      const existingLead =
        await deps.leadService.getLeadByTelegramUserId(telegramUserId);
      const lead = buildLeadRecord({
        telegramUserId,
        telegramUsername,
        fields,
        classification,
        lastQuestionAsked: session.lastQuestionAsked,
        existingLead,
        latestMessageText: text,
        isDemo: deps.demoMode,
      });
      const savedLead = await deps.leadService.upsertLead(lead);

      if (!existingLead?.nextFollowUpAt && savedLead.nextFollowUpAt) {
        await deps.followUpService.appendInitialFollowUp(savedLead);
      }

      session.currentStep = "qualified";
      session.collectedFields = fields;
      session.lastQuestionAsked = "";
      session.lastMessageAt = nowIso();
      session.updatedAt = nowIso();
      await deps.sessionService.saveSession(session);

      const reply = await generateArabicReply({
        client: deps.aiClient,
        businessConfig: deps.businessConfig,
        fields,
        classification,
      });
      const sent = await safeTelegramReply(ctx, reply, {
        telegramUserId,
        leadId,
        purpose: "qualified_reply",
      });
      if (sent.ok) {
        await deps.messageService.appendMessage({
          leadId,
          telegramUserId,
          direction: "outbound",
          text: reply,
          telegramMessageId: sent.messageId,
        });
      }

      if (
        savedLead.status === "Hot" &&
        deps.adminTelegramId &&
        existingLead?.status !== "Hot"
      ) {
        await safeTelegramSendMessage(
          ctx.telegram.sendMessage.bind(ctx.telegram),
          deps.adminTelegramId,
          `Hot lead alert\n\n${formatLeadSummary(savedLead)}`,
          { telegramUserId, leadId, purpose: "hot_lead_admin_alert" },
        );
      }
    } catch (error) {
      logger.error("Customer message handling failed", {
        telegramUserId,
        error,
      });
      const errorReply =
        "حدث خطأ مؤقت أثناء تسجيل طلبك. من فضلك أرسل الرسالة مرة أخرى بعد قليل.";
      const sent = await safeTelegramReply(ctx, errorReply, {
        telegramUserId,
        leadId,
        purpose: "customer_error_reply",
      });
      if (sent.ok) {
        await deps.messageService
          .appendMessage({
            leadId,
            telegramUserId,
            direction: "outbound",
            text: errorReply,
            telegramMessageId: sent.messageId,
          })
          .catch((appendError) => {
            logger.error("Failed to save customer error reply", {
              telegramUserId,
              leadId,
              error: appendError,
            });
          });
      }
    }
  });
}
