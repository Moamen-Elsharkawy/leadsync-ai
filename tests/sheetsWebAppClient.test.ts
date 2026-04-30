import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSheetsWebAppClientFromEnv,
  SheetsWebAppClient,
} from "../src/sheets/sheetsWebAppClient.js";

describe("SheetsWebAppClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("posts action, shared secret, and payload on every request", async () => {
    const fetchMock = mockFetchResponse({ tabs: ["Leads"] });
    const client = new SheetsWebAppClient({
      webAppUrl: "https://script.google.com/macros/s/test/exec",
      secret: "shared-secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const result = await client.setupSheets();
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);

    expect(result.tabs).toEqual(["Leads"]);
    expect(body).toEqual({
      action: "setup",
      secret: "shared-secret",
      payload: {},
    });
  });

  it("creates a client from GOOGLE_SHEETS_WEBAPP_URL and GOOGLE_SHEETS_WEBAPP_SECRET", async () => {
    vi.stubEnv(
      "GOOGLE_SHEETS_WEBAPP_URL",
      "https://script.google.com/macros/s/test/exec",
    );
    vi.stubEnv("GOOGLE_SHEETS_WEBAPP_SECRET", "env-secret-value");
    const fetchMock = mockFetchResponse({ initialized: true });

    const client = createSheetsWebAppClientFromEnv(
      fetchMock as unknown as typeof fetch,
    );
    await client.initSecret();

    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body).toEqual({
      action: "initSecret",
      secret: "env-secret-value",
      payload: {},
    });
  });

  it("validates Apps Script error responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: false,
        error: { message: "Invalid shared secret", code: "INVALID_SECRET" },
      }),
    });
    const client = new SheetsWebAppClient({
      webAppUrl: "https://script.google.com/macros/s/test/exec",
      secret: "bad-secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(client.setupSheets()).rejects.toThrow(
      "Invalid Google Apps Script secret",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid success response shapes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: { wrong: true } }),
    });
    const client = new SheetsWebAppClient({
      webAppUrl: "https://script.google.com/macros/s/test/exec",
      secret: "shared-secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(client.setupSheets()).rejects.toThrow("Required");
  });

  it("retries temporary HTTP failures up to 2 times", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, data: { tabs: ["Leads"] } }),
      });
    const client = new SheetsWebAppClient({
      webAppUrl: "https://script.google.com/macros/s/test/exec",
      secret: "shared-secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
      maxRetries: 2,
    });

    const result = await client.setupSheets();

    expect(result.tabs).toEqual(["Leads"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry permanent HTTP failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });
    const client = new SheetsWebAppClient({
      webAppUrl: "https://script.google.com/macros/s/test/exec",
      secret: "shared-secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
      maxRetries: 2,
    });

    await expect(client.setupSheets()).rejects.toThrow("HTTP 401");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("applies local list limits and passes limit in payload", async () => {
    const fetchMock = mockFetchResponse([
      { leadId: "lead_1" },
      { leadId: "lead_2" },
      { leadId: "lead_3" },
    ]);
    const client = new SheetsWebAppClient({
      webAppUrl: "https://script.google.com/macros/s/test/exec",
      secret: "shared-secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const leads = await client.listHotLeads(2);
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);

    expect(leads.map((lead) => lead.leadId)).toEqual(["lead_1", "lead_2"]);
    expect(body.payload).toEqual({ limit: 2 });
    expect(body.action).toBe("listHotLeads");
  });

  it("parses demo seed counts from Apps Script", async () => {
    const fetchMock = mockFetchResponse({
      seeded: true,
      createdLeads: 10,
      createdMessages: 30,
    });
    const client = new SheetsWebAppClient({
      webAppUrl: "https://script.google.com/macros/s/test/exec",
      secret: "shared-secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(client.seedDemoData()).resolves.toEqual({
      seeded: true,
      createdLeads: 10,
      createdMessages: 30,
    });
  });

  it("seeds physical therapy demo data without extra selection payload", async () => {
    const fetchMock = mockFetchResponse({
      seeded: true,
      preset: "physical-therapy",
      createdLeads: 10,
      createdMessages: 30,
    });
    const client = new SheetsWebAppClient({
      webAppUrl: "https://script.google.com/macros/s/test/exec",
      secret: "shared-secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await client.seedDemoData();
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);

    expect(body).toEqual({
      action: "seedDemoData",
      secret: "shared-secret",
      payload: {},
    });
  });

  it("lists messages with dashboard filters through Apps Script", async () => {
    const fetchMock = mockFetchResponse([
      {
        messageId: "msg_1",
        leadId: "lead_1",
        telegramUserId: "123",
        direction: "inbound",
        text: "hello",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const client = new SheetsWebAppClient({
      webAppUrl: "https://script.google.com/macros/s/test/exec",
      secret: "shared-secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const messages = await client.listMessages({ leadId: "lead_1" });
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);

    expect(messages).toHaveLength(1);
    expect(body).toEqual({
      action: "listMessages",
      secret: "shared-secret",
      payload: { leadId: "lead_1" },
    });
  });

  it("parses dashboard data responses", async () => {
    const fetchMock = mockFetchResponse({
      leads: [],
      messages: [],
      followUps: [],
      reports: [],
      settings: [{ key: "timezone", value: "Africa/Cairo" }],
      summary: {
        totalLeads: 0,
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
      },
    });
    const client = new SheetsWebAppClient({
      webAppUrl: "https://script.google.com/macros/s/test/exec",
      secret: "shared-secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(client.getDashboardData()).resolves.toMatchObject({
      settings: [{ key: "timezone", value: "Africa/Cairo" }],
      summary: { totalLeads: 0 },
    });
  });

  it("calls Apps Script diagnostics and validates the response", async () => {
    const fetchMock = mockFetchResponse({
      ok: true,
      version: "2026-04-26-therapy-hardening",
      spreadsheetName: "MoveWell CRM",
      secretInitialized: true,
      actions: ["diagnostics", "setup", "seedDemoData"],
      tabs: {
        Leads: {
          exists: true,
          rowCount: 1,
          columnCount: 24,
          missingHeaders: [],
        },
      },
      missingTabs: [],
      missingHeaders: {},
      needsSetup: false,
      timestamp: "2026-04-26T00:00:00.000Z",
    });
    const client = new SheetsWebAppClient({
      webAppUrl: "https://script.google.com/macros/s/test/exec",
      secret: "shared-secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const result = await client.diagnostics();
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);

    expect(result.version).toBe("2026-04-26-therapy-hardening");
    expect(result.needsSetup).toBe(false);
    expect(body).toEqual({
      action: "diagnostics",
      secret: "shared-secret",
      payload: {},
    });
  });

  it("treats unsupported diagnostics as an old Apps Script deployment", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: false,
        error: {
          message: "Unsupported action: diagnostics",
          code: "UNSUPPORTED_ACTION",
        },
      }),
    });
    const client = new SheetsWebAppClient({
      webAppUrl: "https://script.google.com/macros/s/test/exec",
      secret: "shared-secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
      maxRetries: 0,
    });

    await expect(client.diagnostics()).rejects.toThrow(
      "Unsupported action: diagnostics",
    );
  });

  it("logs failures without leaking the shared secret", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new Error("secret shared-secret"));
    const client = new SheetsWebAppClient({
      webAppUrl: "https://script.google.com/macros/s/test/exec",
      secret: "shared-secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
      maxRetries: 0,
    });

    await expect(client.setupSheets()).rejects.toThrow("[redacted]");
    const logged = consoleSpy.mock.calls
      .map((call) => call.join(" "))
      .join(" ");

    expect(logged).not.toContain("shared-secret");
    expect(logged).toContain("[redacted]");
  });
});

function mockFetchResponse(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, data }),
  });
}
