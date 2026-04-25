import { describe, expect, it, vi } from "vitest";
import type { BusinessConfig } from "../src/config/businessConfig.js";
import type { OpenRouterClient } from "../src/ai/openRouterClient.js";
import {
  extractLeadInfo,
  fallbackExtractLeadData,
  mergeLeadFields,
  parseLeadExtractionContent,
} from "../src/ai/leadExtractor.js";

const businessConfig: BusinessConfig = {
  businessName: "Test Business",
  businessType: "automation studio",
  language: "ar",
  services: ["Telegram bot", "Website"],
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
  forbiddenClaims: [],
};

const physicalTherapyConfig: BusinessConfig = {
  ...businessConfig,
  businessName: "MoveWell Physical Therapy Centers",
  businessType: "physical therapy center",
  services: [
    "Back pain physiotherapy",
    "Neck pain physiotherapy",
    "Sports injury rehabilitation",
    "Post-surgery rehabilitation",
    "Knee pain treatment",
    "Shoulder rehabilitation",
    "Home physiotherapy session",
    "Pediatric physiotherapy consultation",
    "Posture correction",
    "Manual therapy inquiry",
  ],
  forbiddenClaims: [
    "Do not diagnose medical conditions.",
    "Do not provide treatment advice.",
  ],
};

describe("leadExtractor", () => {
  it("parses valid structured AI JSON content", () => {
    const result = parseLeadExtractionContent(
      JSON.stringify({
        fullName: null,
        phone: "01012345678",
        serviceRequested: "Telegram bot",
        budget: "20000 EGP",
        timeline: "this week",
        location: null,
        notes: "Customer asked for a Telegram bot.",
        intent: "buying",
      }),
    );

    expect(result).toMatchObject({
      phone: "01012345678",
      serviceRequested: "Telegram bot",
      budget: "20000 EGP",
      timeline: "this week",
      intent: "buying",
    });
  });

  it("returns empty fields for malformed or incomplete AI JSON", () => {
    expect(parseLeadExtractionContent("not json")).toEqual({});
    expect(
      parseLeadExtractionContent('{"serviceRequested":"Website"}'),
    ).toEqual({});
  });

  it("extracts Arabic free-text fields with fallback logic", () => {
    const result = fallbackExtractLeadData(
      "أنا أحمد من القاهرة وعايز بوت تيليجرام خلال أسبوع. الميزانية 15000 جنيه ورقمي 01012345678",
    );

    expect(result.fullName).toContain("أحمد");
    expect(result.location).toBeTruthy();
    expect(result.serviceRequested).toBe("Telegram bot");
    expect(result.budget).toContain("15000");
    expect(result.phone).toContain("01012345678");
    expect(result.intent).toBe("asking");
  });

  it("extracts physical therapy intake without medical advice", async () => {
    const client = {
      generateJson: vi.fn().mockResolvedValue({ ok: false }),
      generateText: vi.fn(),
    } as unknown as OpenRouterClient;

    const result = await extractLeadInfo({
      client,
      messageText:
        "محتاج جلسة علاج طبيعي لأسفل الظهر في فرع مدينة نصر بكرة. رقمي 01044440001",
      existingFields: {},
      businessConfig: physicalTherapyConfig,
    });

    expect(result.source).toBe("fallback");
    expect(result.merged.serviceRequested).toBe("Back pain physiotherapy");
    expect(result.merged.timeline).toBe("بكرة");
    expect(result.merged.location).toContain("فرع مدينة نصر");
    expect(result.merged.phone).toBe("01044440001");
    expect(result.merged.notes).not.toMatch(/تشخيص|تمارين|جلسات لازمة/u);
  });

  it("merges new fields without deleting existing values", () => {
    const merged = mergeLeadFields(
      { serviceRequested: "Website", timeline: "next month" },
      { budget: "10000 EGP", intent: "buying" },
    );

    expect(merged).toEqual({
      serviceRequested: "Website",
      timeline: "next month",
      budget: "10000 EGP",
      intent: "buying",
    });
  });

  it("uses AI output when it matches the lead extraction schema", async () => {
    const generateJson = vi.fn().mockResolvedValue({
      ok: true,
      schemaName: "LeadExtraction",
      data: {
        fullName: null,
        phone: null,
        serviceRequested: "Website",
        budget: null,
        timeline: "next month",
        location: "Cairo",
        notes: "Customer wants a website next month.",
        intent: "buying",
      },
      source: "openrouter",
    });
    const client = {
      generateJson,
      generateText: vi.fn(),
    } as unknown as OpenRouterClient;

    const result = await extractLeadInfo({
      client,
      messageText: "I need a website next month in Cairo",
      existingFields: {},
      businessConfig,
    });

    expect(result.source).toBe("ai");
    expect(result.merged).toMatchObject({
      serviceRequested: "Website",
      timeline: "next month",
      location: "Cairo",
      intent: "buying",
    });
  });

  it("removes AI services that are not configured for the business", async () => {
    const generateJson = vi.fn().mockResolvedValue({
      ok: true,
      schemaName: "LeadExtraction",
      data: {
        fullName: null,
        phone: null,
        serviceRequested: "Dental implants",
        budget: null,
        timeline: "this week",
        location: null,
        notes: "Customer asked for a dental service.",
        intent: "buying",
      },
      source: "openrouter",
    });
    const client = {
      generateJson,
      generateText: vi.fn(),
    } as unknown as OpenRouterClient;

    const result = await extractLeadInfo({
      client,
      messageText: "I need dental implants this week",
      existingFields: {},
      businessConfig,
    });

    expect(result.merged.serviceRequested).toBeUndefined();
    expect(result.merged.notes).toContain("Unsupported requested service");
  });

  it("falls back when the AI call fails or returns invalid data", async () => {
    const client = {
      generateJson: vi.fn().mockResolvedValue({
        ok: true,
        schemaName: "LeadExtraction",
        data: { serviceRequested: "Website" },
        source: "openrouter",
      }),
      generateText: vi.fn(),
    } as unknown as OpenRouterClient;

    const result = await extractLeadInfo({
      client,
      messageText: "need website this week budget 5000 EGP",
      existingFields: {},
      businessConfig,
    });

    expect(result.source).toBe("fallback");
    expect(result.merged.serviceRequested).toBe("Website");
    expect(result.merged.budget).toContain("5000");
  });
});
