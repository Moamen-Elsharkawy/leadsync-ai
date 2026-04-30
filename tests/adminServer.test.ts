import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createAdminApp } from "../src/admin/adminServer.js";
import type { OpenRouterClient } from "../src/ai/openRouterClient.js";
import type { SheetsWebAppClient } from "../src/sheets/sheetsWebAppClient.js";
import type { FollowUpService } from "../src/services/followUpService.js";
import type { LeadService } from "../src/services/leadService.js";
import type { ReportService } from "../src/services/reportService.js";
import type { LeadRecord } from "../src/types/lead.js";
import type { FollowUpRecord } from "../src/types/message.js";

describe("adminServer", () => {
  it("exposes a public health endpoint", async () => {
    const app = createAdminApp(createDeps());

    const response = await request(app).get("/health").expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      service: "smartflow-admin",
    });
  });

  it("protects dashboard and API routes with ADMIN_PASSWORD", async () => {
    const app = createAdminApp(createDeps());

    await request(app).get("/leads").expect(401);
  });

  it("returns leads through the Apps Script-backed lead service", async () => {
    const deps = createDeps();
    const app = createAdminApp(deps);

    const response = await request(app)
      .get("/leads")
      .set("x-admin-password", "secret")
      .expect(200);

    expect(response.body[0].leadId).toBe("lead_1");
    expect(deps.leadService.listLeads).toHaveBeenCalledWith(50);
  });

  it("returns Hot leads", async () => {
    const deps = createDeps();
    const app = createAdminApp(deps);

    await request(app)
      .get("/leads/hot?limit=10")
      .set("x-admin-password", "secret")
      .expect(200);

    expect(deps.leadService.listHotLeads).toHaveBeenCalledWith(10);
  });

  it("returns one lead by id", async () => {
    const deps = createDeps();
    const app = createAdminApp(deps);

    const response = await request(app)
      .get("/leads/1")
      .set("x-admin-password", "secret")
      .expect(200);

    expect(response.body.leadId).toBe("lead_1");
    expect(deps.leadService.getLead).toHaveBeenCalledWith("lead_1");
  });

  it("returns the summary report", async () => {
    const app = createAdminApp(createDeps());

    const response = await request(app)
      .get("/report")
      .auth("admin", "secret")
      .expect(200);

    expect(response.body).toEqual({
      totalLeads: 3,
      hotLeads: 1,
      warmLeads: 1,
      coldLeads: 1,
    });
  });

  it("returns chatbot response for authenticated manager query", async () => {
    const app = createAdminApp(createDeps());
    const response = await request(app)
      .post("/chatbot/query")
      .set("x-admin-password", "secret")
      .send({
        question: "Give me an overview summary",
        locale: "en",
        requestId: "req-12345678",
        sessionId: "session-12345678",
      })
      .expect(200);

    expect(response.body.provenance.source).toBe("google-sheets-webapp-only");
    expect(typeof response.body.answer).toBe("string");
  });

  it("rejects invalid chatbot payload", async () => {
    const app = createAdminApp(createDeps());
    await request(app)
      .post("/chatbot/query")
      .set("x-admin-password", "secret")
      .send({ question: "x" })
      .expect(400);
  });


});

function createDeps() {
  const lead = createLead();
  const leadService = {
    listLeads: vi.fn().mockResolvedValue([lead]),
    listHotLeads: vi.fn().mockResolvedValue([lead]),
    getLead: vi
      .fn()
      .mockImplementation((leadId: string) =>
        Promise.resolve(leadId === "lead_1" ? lead : null),
      ),
  } as unknown as LeadService & {
    listLeads: ReturnType<typeof vi.fn>;
    listHotLeads: ReturnType<typeof vi.fn>;
    getLead: ReturnType<typeof vi.fn>;
  };

  return {
    port: 0,
    password: "secret",
    sheets: {
      listLeads: vi.fn().mockResolvedValue([lead]),
      listFollowUps: vi.fn().mockResolvedValue([createFollowUp()]),
      listMessages: vi.fn().mockResolvedValue([]),
    } as unknown as SheetsWebAppClient,
    aiClient: {
      generateText: vi.fn().mockResolvedValue({
        ok: true,
        text: "Grounded answer from sheets facts.",
        source: "openrouter",
      }),
      generateJson: vi.fn(),
    } as unknown as OpenRouterClient,
    leadService,
    followUpService: {
      listFollowUps: vi.fn().mockResolvedValue([]),
    } as unknown as FollowUpService,
    reportService: {
      getSummary: vi.fn().mockResolvedValue({
        totalLeads: 3,
        hotLeads: 1,
        warmLeads: 1,
        coldLeads: 1,
      }),
    } as unknown as ReportService,
  };
}

function createLead(): LeadRecord {
  return {
    leadId: "lead_1",
    telegramUserId: "1",
    telegramUsername: "@customer",
    fullName: "Customer",
    phone: "+201000000000",
    serviceRequested: "Telegram bot",
    budget: "15000 EGP",
    timeline: "this week",
    location: "Cairo",
    status: "Hot",
    leadScore: 90,
    stage: "qualified",
    lastQuestionAsked: "",
    notes: "Ready lead.",
    rawMessages: "[]",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    followUpCount: 0,
    nextFollowUpAt: "",
  };
}

function createFollowUp(): FollowUpRecord {
  return {
    followUpId: "fu_1",
    leadId: "lead_1",
    telegramUserId: "1",
    status: "pending",
    scheduledAt: "2026-01-02T00:00:00.000Z",
    sentAt: "",
    message: "Follow up",
    attemptNumber: 1,
  };
}
