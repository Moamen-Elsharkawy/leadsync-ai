import { message } from "telegraf/filters";
import type { Telegraf } from "telegraf";
import type { BusinessConfig } from "../config/businessConfig.js";
import { classifyLead } from "../ai/leadClassifier.js";
import { extractLeadInfo } from "../ai/leadExtractor.js";
import type { OpenRouterClient } from "../ai/openRouterClient.js";
import {
  generateArabicReply,
  type ConversationStage,
} from "../ai/replyGenerator.js";
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
import { decideConversationPolicy } from "./conversationPolicy.js";

export interface MessageHandlerDeps {
  aiClient: OpenRouterClient;
  businessConfig: BusinessConfig;
  sessionService: SessionService;
  messageService: MessageService;
  leadService: LeadService;
  followUpService: FollowUpService;
  adminTelegramId?: string;
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
      // Show typing indicator while processing
      await ctx.sendChatAction("typing").catch(() => {
        /* ignore typing errors */
      });

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
      const allowGreeting =
        session.currentStep === "new" &&
        !session.lastQuestionAsked &&
        Object.keys(session.collectedFields).length === 0;
      const policy = decideConversationPolicy(text, telegramUserId, {
        allowGreeting,
      });

      // Handle greeting responses
      if (policy.action === "greeting") {
        const sent = await safeTelegramReply(ctx, policy.reply, {
          telegramUserId,
          leadId,
          purpose: "greeting",
        });
        if (sent.ok) {
          await deps.messageService.appendMessage({
            leadId,
            telegramUserId,
            direction: "outbound",
            text: policy.reply,
            telegramMessageId: sent.messageId,
          });
        }
        return;
      }

      if (policy.action === "safe-refusal") {
        const sent = await safeTelegramReply(ctx, policy.reply, {
          telegramUserId,
          leadId,
          purpose: "safe_refusal",
        });
        if (sent.ok) {
          await deps.messageService.appendMessage({
            leadId,
            telegramUserId,
            direction: "outbound",
            text: policy.reply,
            telegramMessageId: sent.messageId,
          });
        }
        return;
      }

      const recentMessages = await deps.messageService.listRecentMessages(
        telegramUserId,
        10,
      );
      const extraction = await extractLeadInfo({
        client: deps.aiClient,
        messageText: text,
        existingFields: session.collectedFields,
        businessConfig: deps.businessConfig,
        recentMessages,
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
        session.questionAskCount,
      );

      // Determine conversation stage for context-aware replies
      const conversationStage: ConversationStage = nextQuestion
        ? "qualifying"
        : "qualified";

      if (nextQuestion) {
        // Track if we're asking the same question again
        const isSameQuestion =
          session.lastQuestionAsked === nextQuestion.question;

        session.currentStep = "qualifying";
        session.collectedFields = fields;
        session.lastQuestionAsked = nextQuestion.question;
        session.questionAskCount = isSameQuestion
          ? session.questionAskCount + 1
          : 0;
        session.lastMessageAt = nowIso();
        session.updatedAt = nowIso();
        await deps.sessionService.saveSession(session);
        await deps.followUpService.scheduleIncompleteQualificationFollowUp({
          leadId,
          telegramUserId,
        });

        const reply = await generateArabicReply({
          client: deps.aiClient,
          businessConfig: deps.businessConfig,
          fields,
          missingQuestion: nextQuestion.question,
          latestCustomerMessage: text,
          recentMessages,
          conversationStage,
        });
        const sent = await safeTelegramReply(ctx, reply, {
          telegramUserId,
          leadId,
          purpose: "qualification_question",
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
        return;
      }

      // Lead is fully qualified — classify and save
      const classification = await classifyLead({
        client: deps.aiClient,
        fields,
        rawMessages: recentMessages.map((item) => item.text).concat(text),
      });
      const existingLead =
        await deps.leadService.getLeadByTelegramUserId(telegramUserId);

      // If lead is already qualified and status hasn't changed, skip re-saving
      // to avoid unnecessary API calls and potential downgrade
      const shouldUpdateLead =
        !existingLead ||
        existingLead.status !== classification.status ||
        hasNewFields(existingLead, fields);

      const lead = buildLeadRecord({
        telegramUserId,
        telegramUsername,
        fields,
        classification: shouldUpdateLead
          ? classification
          : {
              status: existingLead!.status,
              leadScore: existingLead!.leadScore,
              stage: existingLead!.stage,
              notes: existingLead!.notes,
            },
        lastQuestionAsked: session.lastQuestionAsked,
        existingLead,
        latestMessageText: text,
      });
      const savedLead = await deps.leadService.upsertLead(lead);

      if (!existingLead?.nextFollowUpAt && savedLead.nextFollowUpAt) {
        await deps.followUpService.appendInitialFollowUp(savedLead);
      }

      session.currentStep = "qualified";
      session.collectedFields = fields;
      session.lastQuestionAsked = "";
      session.questionAskCount = 0;
      session.lastMessageAt = nowIso();
      session.updatedAt = nowIso();
      await deps.sessionService.saveSession(session);

      const reply = await generateArabicReply({
        client: deps.aiClient,
        businessConfig: deps.businessConfig,
        fields,
        classification,
        latestCustomerMessage: text,
        recentMessages,
        conversationStage,
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

/**
 * Check if extracted fields contain new information compared to existing lead.
 */
function hasNewFields(
  existingLead: {
    serviceRequested: string;
    branch?: string;
    phone: string;
    fullName: string;
  },
  fields: {
    serviceRequested?: string;
    branch?: string;
    phone?: string;
    fullName?: string;
  },
): boolean {
  if (fields.serviceRequested && fields.serviceRequested !== existingLead.serviceRequested) {
    return true;
  }
  if (fields.branch && fields.branch !== existingLead.branch) {
    return true;
  }
  if (fields.phone && fields.phone !== existingLead.phone) {
    return true;
  }
  if (fields.fullName && fields.fullName !== existingLead.fullName) {
    return true;
  }
  return false;
}
