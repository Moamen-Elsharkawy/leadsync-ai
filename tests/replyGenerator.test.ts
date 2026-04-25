import { describe, expect, it, vi } from "vitest";
import type { BusinessConfig } from "../src/config/businessConfig.js";
import type { OpenRouterClient } from "../src/ai/openRouterClient.js";
import { generateArabicReply } from "../src/ai/replyGenerator.js";

const businessConfig: BusinessConfig = {
  businessName: "Test Business",
  businessType: "automation studio",
  language: "ar",
  services: ["Telegram bot"],
  workingHours: { timezone: "Africa/Cairo", weekly: {} },
  tone: "professional",
  defaultCurrency: "EGP",
  unavailableDays: [],
  adminContact: {},
  qualificationQuestions: {
    serviceRequested: "ما الخدمة التي تحتاجها بالتحديد؟",
    budgetOrTimeline: "ما الميزانية المتوقعة أو الموعد المطلوب لتنفيذ الخدمة؟",
    phone: "هل يمكنك إرسال رقم هاتف للتواصل معك؟",
  },
  fallbackReply: "شكرا لتواصلك معنا.",
  forbiddenClaims: ["Do not confirm bookings."],
};

describe("replyGenerator", () => {
  it("returns the one missing question directly", async () => {
    const client = {
      generateJson: vi.fn(),
      generateText: vi.fn(),
    } as unknown as OpenRouterClient;

    const reply = await generateArabicReply({
      client,
      businessConfig,
      fields: {},
      missingQuestion: "ما الخدمة التي تحتاجها بالتحديد؟",
    });

    expect(reply).toBe("ما الخدمة التي تحتاجها بالتحديد؟");
    expect(client.generateText).not.toHaveBeenCalled();
  });

  it("falls back with Arabic text and no final booking confirmation", async () => {
    const client = {
      generateJson: vi.fn(),
      generateText: vi.fn().mockResolvedValue({
        ok: false,
        text: "",
        source: "fallback",
      }),
    } as unknown as OpenRouterClient;

    const reply = await generateArabicReply({
      client,
      businessConfig,
      fields: { serviceRequested: "Telegram bot" },
      classification: {
        status: "Hot",
        leadScore: 90,
        stage: "qualified",
        notes: "",
      },
    });

    expect(reply).toContain("شكرا");
    expect(reply).not.toContain("تم تأكيد");
    expect(reply).not.toContain("حجزك مؤكد");
  });

  it("does not mention an unsupported service in fallback replies", async () => {
    const client = {
      generateJson: vi.fn(),
      generateText: vi.fn().mockResolvedValue({
        ok: false,
        text: "",
        source: "fallback",
      }),
    } as unknown as OpenRouterClient;

    const reply = await generateArabicReply({
      client,
      businessConfig,
      fields: { serviceRequested: "Dental implants" },
      classification: {
        status: "Warm",
        leadScore: 55,
        stage: "qualified",
        notes: "",
      },
    });

    expect(reply).not.toContain("Dental implants");
    expect(reply).toContain("الخدمة المطلوبة");
  });
});
