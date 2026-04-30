import { describe, expect, it, vi } from "vitest";
import {
  clearManagerChatbotFactsCache,
  ManagerChatbotService,
} from "../src/dashboard/managerChatbotService.js";
import type { OpenRouterClient } from "../src/ai/openRouterClient.js";
import type { SheetsWebAppClient } from "../src/sheets/sheetsWebAppClient.js";
import type { LeadRecord } from "../src/types/lead.js";

describe("ManagerChatbotService", () => {
  it("returns deterministic grounded summary for known intent", async () => {
    const service = new ManagerChatbotService({
      sheets: createSheetsClient() as SheetsWebAppClient,
      aiClient: createAiClient("Total leads are 2 with 1 pending follow-up."),
    });

    const response = await service.query({
      question: "Give me an overview summary",
      locale: "en",
      requestId: "req-12345678",
      sessionId: "session-12345678",
    });

    expect(response.refused).toBe(false);
    expect(response.provenance.source).toBe("google-sheets-webapp-only");
    expect(response.provenance.datasetsUsed).toContain("leads");
  });

  it("refuses unsupported question outside sheets-supported intents", async () => {
    const service = new ManagerChatbotService({
      sheets: createSheetsClient() as SheetsWebAppClient,
    });

    const response = await service.query({
      question: "What will happen in the market next year?",
      locale: "en",
      requestId: "req-12345679",
      sessionId: "session-12345679",
    });

    expect(response.refused).toBe(true);
    expect(response.citations).toHaveLength(0);
    expect(response.refusalReason).toContain("outside supported");
  });

  it("detects Arabic follow-up intent and returns grounded answer", async () => {
    const service = new ManagerChatbotService({
      sheets: createSheetsClient() as SheetsWebAppClient,
    });

    const response = await service.query({
      question: "كم عدد المتابعات المعلقة؟",
      locale: "ar",
      requestId: "req-12345680",
      sessionId: "session-12345680",
    });

    expect(response.refused).toBe(false);
    expect(response.citations[0]?.dataset).toBe("followups");
  });

  it("caches facts per intent for short interval", async () => {
    clearManagerChatbotFactsCache();
    const sheets = createSheetsClient();
    const service = new ManagerChatbotService({
      sheets: sheets as SheetsWebAppClient,
    });

    await service.query({
      question: "overview summary",
      locale: "en",
      requestId: "req-12345681",
      sessionId: "session-12345681",
    });
    await service.query({
      question: "total overview",
      locale: "en",
      requestId: "req-12345682",
      sessionId: "session-12345682",
    });

    expect(sheets.listLeads).toHaveBeenCalledTimes(1);
    expect(sheets.listFollowUps).toHaveBeenCalledTimes(1);
  });
});

function createAiClient(text: string): OpenRouterClient {
  return {
    generateText: vi.fn().mockResolvedValue({
      ok: true,
      text,
      source: "openrouter",
    }),
    generateJson: vi.fn(),
  };
}

function createSheetsClient(): {
  listLeads: ReturnType<typeof vi.fn>;
  listFollowUps: ReturnType<typeof vi.fn>;
  listMessages: ReturnType<typeof vi.fn>;
} {
  const leads: LeadRecord[] = [
    createLead("lead_1", "Hot", "Nasr City", "Manual Therapy"),
    createLead("lead_2", "Warm", "Maadi", "Back Pain Rehab"),
  ];

  return {
    listLeads: vi.fn().mockResolvedValue(leads),
    listFollowUps: vi
      .fn()
      .mockResolvedValue([{ followUpId: "f1", status: "pending" }]),
    listMessages: vi.fn().mockResolvedValue([]),
  };
}

function createLead(
  leadId: string,
  status: "Hot" | "Warm" | "Cold",
  branch: string,
  serviceRequested: string,
): LeadRecord {
  return {
    leadId,
    telegramUserId: leadId,
    telegramUsername: "",
    fullName: "Lead",
    phone: "",
    serviceRequested,
    budget: "",
    timeline: "",
    location: branch,
    branch,
    status,
    leadScore: 70,
    stage: "qualifying",
    lastQuestionAsked: "",
    notes: "",
    rawMessages: "[]",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    followUpCount: 0,
    nextFollowUpAt: "",
  };
}
