import { describe, expect, it, vi } from "vitest";
import type { Context } from "telegraf";
import {
  type AdminCommandDeps,
  adminOnly,
  formatFollowUps,
  formatLeadDetails,
  formatLeadList,
  formatReportSummary,
  isAdminTelegramUser,
  NON_ADMIN_COMMAND_MESSAGE,
  registerAdminCommands,
} from "../src/bot/adminCommands.js";
import type { LeadRecord } from "../src/types/lead.js";
import type { FollowUpRecord } from "../src/types/message.js";

describe("adminCommands", () => {
  it("recognizes only the configured admin Telegram id", () => {
    expect(isAdminTelegramUser(123, "123")).toBe(true);
    expect(isAdminTelegramUser("123", "123")).toBe(true);
    expect(isAdminTelegramUser(456, "123")).toBe(false);
    expect(isAdminTelegramUser(123, undefined)).toBe(false);
  });

  it("blocks non-admin command handlers with an Arabic message", async () => {
    const handler = vi.fn();
    const ctx = createContext(456);
    const wrapped = adminOnly({ adminTelegramId: "123" }, handler);

    await wrapped(ctx);

    expect(handler).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(NON_ADMIN_COMMAND_MESSAGE);
  });

  it("allows admin command handlers", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const ctx = createContext(123);
    const wrapped = adminOnly({ adminTelegramId: "123" }, handler);

    await wrapped(ctx);

    expect(handler).toHaveBeenCalledWith(ctx);
    expect(ctx.reply).not.toHaveBeenCalledWith(NON_ADMIN_COMMAND_MESSAGE);
  });

  it("formats latest leads clearly and limits output to 10", () => {
    const leads = Array.from({ length: 12 }, (_, index) =>
      createLead({
        leadId: `lead_${index + 1}`,
        updatedAt: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      }),
    );

    const text = formatLeadList("Latest leads", leads);

    expect(text).toContain("Latest leads (10)");
    expect(text).toContain("lead_12");
    expect(text).toContain("Service:");
    expect(text).not.toContain("lead_1\n");
  });

  it("formats full lead details", () => {
    const text = formatLeadDetails(createLead({ leadId: "lead_123" }));

    expect(text).toContain("Lead details: lead_123");
    expect(text).toContain("Telegram ID:");
    expect(text).toContain("Notes:");
  });

  it("formats only pending follow-ups", () => {
    const followUps: FollowUpRecord[] = [
      createFollowUp("fu_sent", "sent"),
      createFollowUp("fu_pending", "pending"),
    ];

    const text = formatFollowUps(followUps);

    expect(text).toContain("Pending follow-ups (1)");
    expect(text).toContain("fu_pending");
    expect(text).not.toContain("fu_sent");
  });

  it("formats report summary", () => {
    const text = formatReportSummary({
      totalLeads: 10,
      hotLeads: 3,
      warmLeads: 5,
      coldLeads: 2,
    });

    expect(text).toContain("Lead report");
    expect(text).toContain("Hot leads: 3");
  });

  it("seeds demo data for the active business preset", async () => {
    const { commands, deps } = registerMockedAdminCommands("online-course");
    const ctx = createContext(123);

    await commands.demo?.(ctx);

    expect(deps.sheets.seedDemoData).toHaveBeenCalledWith("online-course");
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Online Course"),
    );
  });

  it("supports explicit dental, course, and physical therapy demo commands", async () => {
    const { commands, deps } = registerMockedAdminCommands("custom");
    const ctx = createContext(123);

    await commands.demo_dental?.(ctx);
    await commands.demo_course?.(ctx);
    await commands.demo_physical?.(ctx);

    expect(deps.sheets.seedDemoData).toHaveBeenNthCalledWith(
      1,
      "dental-clinic",
    );
    expect(deps.sheets.seedDemoData).toHaveBeenNthCalledWith(
      2,
      "online-course",
    );
    expect(deps.sheets.seedDemoData).toHaveBeenNthCalledWith(
      3,
      "physical-therapy",
    );
  });
});

function registerMockedAdminCommands(
  businessPreset:
    | "custom"
    | "dental-clinic"
    | "online-course"
    | "physical-therapy",
) {
  const commands: Record<string, (ctx: Context) => Promise<void>> = {};
  const bot = {
    start: vi.fn(),
    help: vi.fn(),
    command: vi.fn((name: string, handler: (ctx: Context) => Promise<void>) => {
      commands[name] = handler;
    }),
    hears: vi.fn(),
  };
  const deps = {
    adminTelegramId: "123",
    businessPreset,
    sheets: {
      setupSheets: vi.fn(),
      seedDemoData: vi.fn().mockImplementation(async (preset: string) => ({
        seeded: true,
        preset,
        createdLeads: 10,
        createdMessages: 30,
      })),
      clearDemoData: vi.fn(),
    },
    leadService: {},
    followUpService: {},
    reportService: {},
  } as unknown as AdminCommandDeps;

  registerAdminCommands(bot as never, deps);

  return { commands, deps };
}

function createContext(telegramUserId: number): Context {
  return {
    from: { id: telegramUserId },
    reply: vi.fn().mockResolvedValue({ message_id: 1 }),
  } as unknown as Context;
}

function createLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    leadId: "lead_test",
    telegramUserId: "123",
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
    notes: "Interested lead.",
    rawMessages: "[]",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    followUpCount: 0,
    nextFollowUpAt: "",
    isDemo: false,
    ...overrides,
  };
}

function createFollowUp(
  followUpId: string,
  status: FollowUpRecord["status"],
): FollowUpRecord {
  return {
    followUpId,
    leadId: "lead_test",
    telegramUserId: "123",
    status,
    scheduledAt: "2026-01-01T00:00:00.000Z",
    sentAt: "",
    message: "Follow up",
    attemptNumber: 1,
  };
}
