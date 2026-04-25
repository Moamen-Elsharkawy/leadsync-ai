import { describe, expect, it, vi } from "vitest";
import type { Context, Telegraf } from "telegraf";
import type { BusinessConfig } from "../src/config/businessConfig.js";
import { registerMessageHandlers } from "../src/bot/handlers.js";
import type { MessageHandlerDeps } from "../src/bot/handlers.js";
import type { OpenRouterClient } from "../src/ai/openRouterClient.js";
import type { SessionState } from "../src/types/session.js";

describe("bot message flow", () => {
  it("asks one missing qualification question and stores inbound/outbound messages", async () => {
    const { handler, deps } = createRegisteredHandler();
    deps.aiClient.generateJson = vi.fn().mockResolvedValueOnce({
      ok: true,
      schemaName: "LeadExtraction",
      data: {
        fullName: null,
        phone: null,
        serviceRequested: "زراعة الأسنان",
        budget: null,
        timeline: null,
        location: null,
        notes: "Customer asks about dental implants.",
        intent: "asking",
      },
      source: "openrouter",
    });
    const ctx = createCustomerContext("محتاج أعرف تفاصيل زراعة الأسنان");

    await handler(ctx);

    expect(deps.messageService.appendMessage).toHaveBeenCalledTimes(2);
    expect(deps.sessionService.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        currentStep: "qualifying",
        collectedFields: expect.objectContaining({
          serviceRequested: "زراعة الأسنان",
        }),
      }),
    );
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("متى تحتاج"),
    );
    expect(
      deps.followUpService.scheduleIncompleteQualificationFollowUp,
    ).toHaveBeenCalledOnce();
    expect(deps.leadService.upsertLead).not.toHaveBeenCalled();
  });

  it("creates a Hot lead and notifies the admin when minimum data is complete", async () => {
    const { handler, deps } = createRegisteredHandler();
    deps.aiClient.generateJson = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        schemaName: "LeadExtraction",
        data: {
          fullName: null,
          phone: "01011110001",
          serviceRequested: "زراعة الأسنان",
          budget: "25000 EGP",
          timeline: "this week",
          location: "Cairo",
          notes: "Customer wants an implant consultation this week.",
          intent: "buying",
        },
        source: "openrouter",
      })
      .mockResolvedValueOnce({
        ok: true,
        schemaName: "LeadClassification",
        data: {
          status: "Hot",
          leadScore: 92,
          stage: "qualified",
          notes: "Clear service, budget, timeline, and buying intent.",
        },
        source: "openrouter",
      });
    deps.aiClient.generateText = vi.fn().mockResolvedValue({
      ok: true,
      text: "تمام، سجلت التفاصيل وسيراجعها فريق الاستقبال.",
      source: "openrouter",
    });
    const ctx = createCustomerContext(
      "محتاج استشارة زراعة هذا الأسبوع وميزانيتي ٢٥ ألف ورقمي 01011110001",
    );

    await handler(ctx);

    expect(deps.leadService.upsertLead).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Hot",
        serviceRequested: "زراعة الأسنان",
        phone: "01011110001",
      }),
    );
    expect(deps.sessionService.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({ currentStep: "qualified" }),
    );
    expect(ctx.reply).toHaveBeenCalledWith(
      "تمام، سجلت التفاصيل وسيراجعها فريق الاستقبال.",
    );
    expect(ctx.telegram.sendMessage).toHaveBeenCalledWith(
      "999",
      expect.stringContaining("Hot lead alert"),
    );
  });

  it("uses the safe Arabic error reply when Apps Script storage fails", async () => {
    const { handler, deps } = createRegisteredHandler();
    deps.messageService.appendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error("Apps Script failed"))
      .mockResolvedValueOnce({});
    const ctx = createCustomerContext("مرحبا");

    await expect(handler(ctx)).resolves.toBeUndefined();

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("حدث خطأ مؤقت"),
    );
  });
});

function createRegisteredHandler() {
  let handler: ((ctx: Context) => Promise<void>) | undefined;
  const bot = {
    on: vi.fn(
      (_filter: unknown, registered: (ctx: Context) => Promise<void>) => {
        handler = registered;
      },
    ),
  } as unknown as Telegraf;
  const deps = createDeps();

  registerMessageHandlers(bot, deps);

  if (!handler) {
    throw new Error("Message handler was not registered.");
  }

  return { handler, deps };
}

function createDeps(): MessageHandlerDeps & {
  aiClient: OpenRouterClient & {
    generateJson: ReturnType<typeof vi.fn>;
    generateText: ReturnType<typeof vi.fn>;
  };
} {
  const session = createSession();
  return {
    aiClient: {
      generateJson: vi.fn(),
      generateText: vi.fn(),
    },
    businessConfig: createBusinessConfig(),
    sessionService: {
      getOrCreateSession: vi.fn().mockResolvedValue(session),
      saveSession: vi.fn().mockResolvedValue({}),
    },
    messageService: {
      appendMessage: vi.fn().mockResolvedValue({}),
    },
    leadService: {
      getLeadByTelegramUserId: vi.fn().mockResolvedValue(null),
      upsertLead: vi.fn().mockImplementation((lead) => Promise.resolve(lead)),
    },
    followUpService: {
      cancelPendingFollowUpsForUser: vi.fn().mockResolvedValue(0),
      scheduleIncompleteQualificationFollowUp: vi.fn().mockResolvedValue(null),
      appendInitialFollowUp: vi.fn().mockResolvedValue(null),
    },
    adminTelegramId: "999",
    demoMode: false,
  } as unknown as MessageHandlerDeps & {
    aiClient: OpenRouterClient & {
      generateJson: ReturnType<typeof vi.fn>;
      generateText: ReturnType<typeof vi.fn>;
    };
  };
}

function createCustomerContext(text: string): Context {
  return {
    from: { id: 123, username: "customer" },
    message: { text, message_id: 42 },
    reply: vi.fn().mockResolvedValue({ message_id: 100 }),
    telegram: {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 101 }),
    },
  } as unknown as Context;
}

function createSession(): SessionState {
  return {
    telegramUserId: "123",
    currentStep: "new",
    collectedFields: {},
    lastQuestionAsked: "",
    lastMessageAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function createBusinessConfig(): BusinessConfig {
  return {
    businessName: "Pearl Smile Dental Center",
    businessType: "dental clinic",
    language: "ar",
    services: ["زراعة الأسنان", "تبييض الأسنان", "تنظيف وتلميع الأسنان"],
    workingHours: { timezone: "Africa/Cairo", weekly: {} },
    tone: "professional",
    defaultCurrency: "EGP",
    unavailableDays: [],
    adminContact: {},
    qualificationQuestions: {
      serviceRequested: "ما خدمة الأسنان التي تحتاجها؟",
      budgetOrTimeline: "متى ترغب في الزيارة أو ما الميزانية المتوقعة؟",
      phone: "هل يمكنك إرسال رقم هاتف للتواصل؟",
    },
    fallbackReply: "شكرا لتواصلك معنا.",
    forbiddenClaims: [],
  };
}
