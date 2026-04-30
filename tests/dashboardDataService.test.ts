import { describe, expect, it, vi } from "vitest";
import { DashboardDataService } from "../src/dashboard/dashboardData.js";
import type { BusinessConfig } from "../src/config/businessConfig.js";
import type { SheetsWebAppClient } from "../src/sheets/sheetsWebAppClient.js";
import type { LeadRecord } from "../src/types/lead.js";
import type { FollowUpRecord } from "../src/types/message.js";

describe("DashboardDataService admin actions", () => {
  it("sets up sheets through the Apps Script client", async () => {
    const sheets = createSheetsClient();
    const service = createService(sheets);

    await expect(service.setupSheets()).resolves.toEqual({
      tabs: ["Leads"],
      preservedExistingData: true,
    });
    expect(sheets.setupSheets).toHaveBeenCalled();
  });

  it("updates lead status, stage, notes, and updatedAt", async () => {
    const sheets = createSheetsClient();
    const service = createService(sheets);

    const updated = await service.updateLeadAdminFields("lead_1", {
      status: "Hot",
      stage: "closed",
      notesToAppend: "Called and left voicemail.",
    });

    expect(updated.status).toBe("Hot");
    expect(updated.stage).toBe("closed");
    expect(updated.notes).toContain("Admin note: Called and left voicemail.");
    expect(sheets.upsertLead).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: "lead_1",
        status: "Hot",
        stage: "closed",
      }),
    );
  });

  it("updates follow-up status and stamps sentAt when marked sent", async () => {
    const sheets = createSheetsClient();
    const service = createService(sheets);

    const updated = await service.updateFollowUpStatus("fu_1", "sent");

    expect(updated.status).toBe("sent");
    expect(updated.sentAt).toBeTruthy();
    expect(sheets.updateFollowUp).toHaveBeenCalledWith(
      expect.objectContaining({ followUpId: "fu_1", status: "sent" }),
    );
  });

  it("returns degraded diagnostics instead of throwing when Apps Script is unavailable", async () => {
    const sheets = createSheetsClient();
    sheets.diagnostics = vi
      .fn()
      .mockRejectedValue(new Error("Invalid Google Apps Script secret"));
    const service = createService(sheets);

    const diagnostics = await service.getAppsScriptDiagnostics();

    expect(diagnostics.ok).toBe(false);
    if (!diagnostics.ok) {
      expect(diagnostics.error.code).toBe("invalid-secret");
    }
  });

  it("returns Apps Script diagnostics when the deployment is healthy", async () => {
    const sheets = createSheetsClient();
    sheets.diagnostics = vi.fn().mockResolvedValue({
      ok: true,
      version: "2026-04-26-therapy-hardening",
      spreadsheetName: "MoveWell CRM",
      secretInitialized: true,
      actions: ["diagnostics", "setup"],
      tabs: {},
      missingTabs: [],
      missingHeaders: {},
      needsSetup: false,
      timestamp: "2026-04-26T00:00:00.000Z",
    });
    const service = createService(sheets);

    const diagnostics = await service.getAppsScriptDiagnostics();

    expect(diagnostics.ok).toBe(true);
    if (diagnostics.ok) {
      expect(diagnostics.data.version).toBe("2026-04-26-therapy-hardening");
    }
  });
});

function createService(sheets: Partial<SheetsWebAppClient>) {
  return new DashboardDataService(
    sheets as SheetsWebAppClient,
    businessConfig,
    {
      businessPreset: "physical-therapy",
      botMode: "polling",
      envPresence: {},
      appsScriptConfigured: true,
      openRouterModelConfigured: true,
      telegramTokenConfigured: true,
    },
  );
}

function createSheetsClient(): Partial<SheetsWebAppClient> {
  const lead = createLead();
  const followUp = createFollowUp();

  return {
    setupSheets: vi.fn().mockResolvedValue({
      tabs: ["Leads"],
      preservedExistingData: true,
    }),
    getLead: vi.fn().mockResolvedValue(lead),
    upsertLead: vi.fn().mockImplementation(async (value: LeadRecord) => value),
    listFollowUps: vi.fn().mockResolvedValue([followUp]),
    updateFollowUp: vi
      .fn()
      .mockImplementation(async (value: FollowUpRecord) => value),
  };
}

const businessConfig: BusinessConfig = {
  businessName: "MoveWell Physical Therapy Centers",
  businessType: "physical therapy center",
  language: "ar",
  services: ["Back pain physiotherapy"],
  workingHours: { timezone: "Africa/Cairo", weekly: {} },
  tone: "professional",
  defaultCurrency: "EGP",
  unavailableDays: [],
  adminContact: {},
  qualificationQuestions: {
    serviceRequested: "ما نوع الخدمة؟",
    timing: "متى ترغب في الزيارة؟",
    phone: "ما رقم الهاتف؟",
  },
  forbiddenClaims: [],
  fallbackReply: "شكرا لتواصلك معنا.",
};

function createLead(): LeadRecord {
  return {
    leadId: "lead_1",
    telegramUserId: "123",
    telegramUsername: "@customer",
    fullName: "Customer",
    phone: "+201000000000",
    serviceRequested: "Back pain physiotherapy",
    budget: "",
    timeline: "tomorrow",
    location: "Nasr City",
    status: "Warm",
    leadScore: 70,
    stage: "qualified",
    lastQuestionAsked: "",
    notes: "Initial note.",
    rawMessages: "[]",
    createdAt: "2026-04-25T09:00:00.000Z",
    updatedAt: "2026-04-25T09:00:00.000Z",
    followUpCount: 0,
    nextFollowUpAt: "",
  };
}

function createFollowUp(): FollowUpRecord {
  return {
    followUpId: "fu_1",
    leadId: "lead_1",
    telegramUserId: "123",
    status: "pending",
    scheduledAt: "2026-04-26T09:00:00.000Z",
    sentAt: "",
    message: "Follow up",
    attemptNumber: 1,
  };
}
