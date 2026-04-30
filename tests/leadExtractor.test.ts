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
  businessName: "MoveWell Physical Therapy Centers",
  businessType: "physical therapy center",
  language: "ar",
  branches: ["Nasr City Branch", "Maadi Branch", "New Cairo Branch"],
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
  workingHours: { timezone: "Africa/Cairo", weekly: {} },
  tone: "professional",
  defaultCurrency: "EGP",
  unavailableDays: [],
  adminContact: {},
  qualificationQuestions: {
    serviceRequested: "ما نوع خدمة العلاج الطبيعي التي تحتاجها؟",
    fullName: "ما هو اسمك الكريم؟",
    branch: "أي فرع أنسب لك؟",
    timing: "متى تفضل الزيارة؟",
    phone: "ما رقم الهاتف؟",
  },
  fallbackReply: "شكرا لتواصلك مع MoveWell.",
  forbiddenClaims: [
    "Do not diagnose medical conditions.",
    "Do not provide treatment advice.",
  ],
};

describe("leadExtractor", () => {
  it("parses valid structured physical therapy AI JSON content", () => {
    const result = parseLeadExtractionContent(
      JSON.stringify({
        fullName: null,
        phone: "01044440001",
        serviceRequested: "Back pain physiotherapy",
        branch: "Nasr City Branch",
        conditionArea: "lower back",
        urgency: "urgent",
        preferredDate: "tomorrow",
        preferredTime: "evening",
        contactPreference: "phone call",
        timeline: "tomorrow",
        location: "Nasr City Branch",
        notes: "Customer asked for lower back physiotherapy.",
        intent: "buying",
      }),
    );

    expect(result).toMatchObject({
      phone: "01044440001",
      serviceRequested: "Back pain physiotherapy",
      branch: "Nasr City Branch",
      preferredDate: "tomorrow",
      intent: "buying",
    });
  });

  it("returns empty fields for malformed or incomplete AI JSON", () => {
    expect(parseLeadExtractionContent("not json")).toEqual({});
    expect(
      parseLeadExtractionContent(
        '{"serviceRequested":"Back pain physiotherapy"}',
      ),
    ).toEqual({});
  });

  it("extracts Arabic physical therapy free-text with fallback logic", () => {
    const result = fallbackExtractLeadData(
      "أنا أحمد ومحتاج جلسة علاج طبيعي لأسفل الظهر في فرع مدينة نصر بكرة. رقمي 01044440001",
    );

    expect(result.fullName).toContain("احمد");
    expect(result.serviceRequested).toBe("Back pain physiotherapy");
    expect(result.branch).toBe("Nasr City Branch");
    expect(result.conditionArea).toBe("back");
    expect(result.preferredDate).toBe("tomorrow");
    expect(result.phone).toBe("01044440001");
    expect(result.intent).toBe("buying");
  });

  it("extracts mixed English and Arabic therapy intake safely", async () => {
    const client = createFailingClient();

    const result = await extractLeadInfo({
      client,
      messageText:
        "Need physiotherapy for neck pain in Maadi next week, please call 01044440005",
      existingFields: {},
      businessConfig,
    });

    expect(result.source).toBe("fallback");
    expect(result.merged.serviceRequested).toBe("Neck pain physiotherapy");
    expect(result.merged.branch).toBe("Maadi Branch");
    expect(result.merged.preferredDate).toBe("next week");
    expect(result.merged.phone).toBe("01044440005");
    expect(result.merged.notes ?? "").not.toMatch(
      /diagnose|exercise|sessions needed/i,
    );
  });

  it("normalizes Arabic variants while extracting branch and timing", () => {
    const result = fallbackExtractLeadData(
      "عايزة علاج طبيعي في مدينه نصر بكره واتصلي بيا على 201044440006",
    );

    expect(result.branch).toBe("Nasr City Branch");
    expect(result.preferredDate).toBe("tomorrow");
    expect(result.phone).toBe("01044440006");
  });

  it("merges new fields without deleting existing values", () => {
    const merged = mergeLeadFields(
      {
        serviceRequested: "Back pain physiotherapy",
        branch: "Nasr City Branch",
      },
      { preferredDate: "tomorrow", intent: "buying" },
    );

    expect(merged).toEqual({
      serviceRequested: "Back pain physiotherapy",
      branch: "Nasr City Branch",
      preferredDate: "tomorrow",
      intent: "buying",
    });
  });

  it("uses AI output when it matches the physical therapy schema", async () => {
    const generateJson = vi.fn().mockResolvedValue({
      ok: true,
      schemaName: "PhysicalTherapyLeadExtraction",
      data: {
        fullName: null,
        phone: "01044440003",
        serviceRequested: "Sports injury rehabilitation",
        branch: "New Cairo Branch",
        conditionArea: "sports injury",
        urgency: "urgent",
        preferredDate: "today",
        preferredTime: "afternoon",
        contactPreference: "phone call",
        timeline: "today",
        location: "New Cairo Branch",
        notes: "Football injury inquiry.",
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
      messageText: "Football injury in New Cairo today, call 01044440003",
      existingFields: {},
      businessConfig,
    });

    expect(result.source).toBe("ai");
    expect(result.merged).toMatchObject({
      serviceRequested: "Sports injury rehabilitation",
      branch: "New Cairo Branch",
      preferredDate: "today",
      intent: "buying",
    });
  });

  it("removes AI services that are not configured for MoveWell", async () => {
    const generateJson = vi.fn().mockResolvedValue({
      ok: true,
      schemaName: "PhysicalTherapyLeadExtraction",
      data: {
        fullName: null,
        phone: null,
        serviceRequested: "Hair transplant",
        branch: null,
        conditionArea: null,
        urgency: null,
        preferredDate: null,
        preferredTime: null,
        contactPreference: null,
        timeline: null,
        location: null,
        notes: "Customer asked for an unsupported service.",
        intent: "asking",
      },
      source: "openrouter",
    });
    const client = {
      generateJson,
      generateText: vi.fn(),
    } as unknown as OpenRouterClient;

    const result = await extractLeadInfo({
      client,
      messageText: "I need a hair transplant this week",
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
        schemaName: "PhysicalTherapyLeadExtraction",
        data: { serviceRequested: "Back pain physiotherapy" },
        source: "openrouter",
      }),
      generateText: vi.fn(),
    } as unknown as OpenRouterClient;

    const result = await extractLeadInfo({
      client,
      messageText: "need shoulder physiotherapy tomorrow in Maadi 01044440008",
      existingFields: {},
      businessConfig,
    });

    expect(result.source).toBe("ai");
    expect(result.merged.serviceRequested).toBe("Shoulder rehabilitation");
    expect(result.merged.branch).toBe("Maadi Branch");
  });

  it("keeps memory by filling missing AI fields from fallback extraction", async () => {
    const client = {
      generateJson: vi.fn().mockResolvedValue({
        ok: true,
        schemaName: "PhysicalTherapyLeadExtraction",
        data: {
          fullName: null,
          phone: null,
          serviceRequested: null,
          branch: null,
          conditionArea: null,
          urgency: null,
          preferredDate: null,
          preferredTime: null,
          contactPreference: null,
          timeline: null,
          location: null,
          notes: null,
          intent: "asking",
        },
        source: "openrouter",
      }),
      generateText: vi.fn(),
    } as unknown as OpenRouterClient;

    const result = await extractLeadInfo({
      client,
      messageText: "عندي مشكلة في الرقبة",
      existingFields: {},
      businessConfig,
    });

    expect(result.source).toBe("ai");
    expect(result.merged.serviceRequested).toBe("Neck pain physiotherapy");
    expect(result.merged.conditionArea).toBe("neck");
  });
});

function createFailingClient(): OpenRouterClient {
  return {
    generateJson: vi.fn().mockResolvedValue({ ok: false }),
    generateText: vi.fn(),
  } as unknown as OpenRouterClient;
}
