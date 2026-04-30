import { describe, expect, it, vi } from "vitest";
import type { Telegraf } from "telegraf";
import {
  buildFollowUpMessage,
  FollowUpService,
  getLeadFollowUpDecision,
  shouldScheduleFollowUpForStatus,
} from "../src/services/followUpService.js";
import type { SheetsWebAppClient } from "../src/sheets/sheetsWebAppClient.js";
import type { LeadRecord } from "../src/types/lead.js";
import type { FollowUpRecord } from "../src/types/message.js";

describe("followUpService", () => {
  it("schedules only Warm leads automatically", () => {
    expect(shouldScheduleFollowUpForStatus("Warm")).toBe(true);
    expect(shouldScheduleFollowUpForStatus("Hot")).toBe(false);
    expect(shouldScheduleFollowUpForStatus("Cold")).toBe(false);

    expect(
      getLeadFollowUpDecision(createLead({ status: "Warm" })).shouldSchedule,
    ).toBe(true);
    expect(
      getLeadFollowUpDecision(createLead({ status: "Hot" })).shouldSchedule,
    ).toBe(false);
    expect(
      getLeadFollowUpDecision(createLead({ status: "Cold" })).shouldSchedule,
    ).toBe(false);
  });

  it("uses polite Arabic follow-up messages", () => {
    expect(buildFollowUpMessage("warm_lead")).toContain("مرحبا");
    expect(buildFollowUpMessage("incomplete_qualification")).toContain(
      "التفاصيل الناقصة",
    );
  });

  it("queues a Warm lead follow-up through Apps Script storage", async () => {
    const sheets = createSheetsMock();
    const service = new FollowUpService(sheets);

    const followUp = await service.scheduleForLead(
      createLead({ status: "Warm" }),
    );

    expect(followUp?.status).toBe("pending");
    expect(sheets.appendFollowUp).toHaveBeenCalledOnce();
    expect(sheets.appendFollowUp.mock.calls[0]?.[0]).toMatchObject({
      leadId: "lead_123",
      telegramUserId: "123",
      attemptNumber: 1,
    });
  });

  it("does not queue Hot or Cold lead follow-ups", async () => {
    const sheets = createSheetsMock();
    const service = new FollowUpService(sheets);

    expect(
      await service.scheduleForLead(createLead({ status: "Hot" })),
    ).toBeNull();
    expect(
      await service.scheduleForLead(createLead({ status: "Cold" })),
    ).toBeNull();
    expect(sheets.appendFollowUp).not.toHaveBeenCalled();
  });



  it("does not exceed two follow-ups per lead", async () => {
    const sheets = createSheetsMock([
      createFollowUp({ attemptNumber: 1, status: "sent" }),
      createFollowUp({ attemptNumber: 2, status: "sent" }),
    ]);
    const service = new FollowUpService(sheets);

    const result = await service.scheduleForLead(
      createLead({ status: "Warm" }),
    );

    expect(result).toBeNull();
    expect(sheets.appendFollowUp).not.toHaveBeenCalled();
  });

  it("counts cancelled follow-ups toward the two-follow-up cap", async () => {
    const sheets = createSheetsMock([
      createFollowUp({ attemptNumber: 1, status: "cancelled" }),
    ]);
    const service = new FollowUpService(sheets);

    const second = await service.scheduleForLead(
      createLead({ status: "Warm" }),
    );

    expect(second?.attemptNumber).toBe(2);
    expect(
      await service.scheduleForLead(createLead({ status: "Warm" })),
    ).toBeNull();
  });

  it("cancels pending follow-ups when the user replies", async () => {
    const sheets = createSheetsMock([
      createFollowUp({ telegramUserId: "123", status: "pending" }),
      createFollowUp({ telegramUserId: "999", status: "pending" }),
    ]);
    const service = new FollowUpService(sheets);

    const cancelled = await service.cancelPendingFollowUpsForUser("123");

    expect(cancelled).toBe(1);
    expect(sheets.updateFollowUp).toHaveBeenCalledWith(
      expect.objectContaining({
        telegramUserId: "123",
        status: "cancelled",
      }),
    );
  });

  it("sends due follow-ups through a mockable sender", async () => {
    const due = createFollowUp({
      scheduledAt: "2020-01-01T00:00:00.000Z",
      status: "pending",
    });
    const sheets = createSheetsMock([due]);
    sheets.getLead.mockResolvedValue(createLead({ status: "Warm" }));
    const sender = vi.fn().mockResolvedValue(undefined);
    const service = new FollowUpService(sheets, sender);

    await service.processDueFollowUps();

    expect(sender).toHaveBeenCalledWith(due.telegramUserId, due.message);
    expect(sheets.updateFollowUp).toHaveBeenCalledWith(
      expect.objectContaining({
        followUpId: due.followUpId,
        status: "sent",
      }),
    );
  });

  it("catches cron processing failures and can stop the scheduled task", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const sheets = createSheetsMock();
    sheets.listFollowUps.mockRejectedValueOnce(
      new Error("Apps Script queue failed"),
    );
    const stop = vi.fn();
    let scheduledTask: (() => void) | undefined;
    const scheduler = vi.fn((_expression: string, task: () => void) => {
      scheduledTask = task;
      return { stop };
    });
    const service = new FollowUpService(sheets, undefined, { scheduler });
    const bot = {
      telegram: {
        sendMessage: vi.fn(),
      },
    } as unknown as Telegraf;

    service.start(bot);
    scheduledTask?.();
    await Promise.resolve();
    await Promise.resolve();
    service.stop();

    expect(scheduler).toHaveBeenCalledWith("* * * * *", expect.any(Function));
    expect(stop).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalled();
  });
});

function createSheetsMock(followUps: FollowUpRecord[] = []) {
  const queue = [...followUps];
  const sheets = {
    listFollowUps: vi
      .fn()
      .mockImplementation((status?: FollowUpRecord["status"]) =>
        Promise.resolve(
          status
            ? queue.filter((followUp) => followUp.status === status)
            : queue,
        ),
      ),
    appendFollowUp: vi.fn().mockImplementation((followUp: FollowUpRecord) => {
      queue.push(followUp);
      return Promise.resolve(followUp);
    }),
    updateFollowUp: vi
      .fn()
      .mockImplementation((followUp: FollowUpRecord) =>
        Promise.resolve(followUp),
      ),
    getLead: vi.fn().mockResolvedValue(null),
    upsertLead: vi
      .fn()
      .mockImplementation((lead: LeadRecord) => Promise.resolve(lead)),
  };

  return sheets as unknown as SheetsWebAppClient & typeof sheets;
}

function createLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    leadId: "lead_123",
    telegramUserId: "123",
    telegramUsername: "@customer",
    fullName: "Customer",
    phone: "+201000000000",
    serviceRequested: "Telegram bot",
    budget: "",
    timeline: "",
    location: "",
    status: "Warm",
    leadScore: 60,
    stage: "qualified",
    lastQuestionAsked: "",
    notes: "",
    rawMessages: "[]",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    followUpCount: 0,
    nextFollowUpAt: "",
    ...overrides,
  };
}

function createFollowUp(
  overrides: Partial<FollowUpRecord> = {},
): FollowUpRecord {
  return {
    followUpId: "fu_123",
    leadId: "lead_123",
    telegramUserId: "123",
    status: "pending",
    scheduledAt: "2026-01-01T00:00:00.000Z",
    sentAt: "",
    message: "مرحبا، هل ما زلت مهتما؟",
    attemptNumber: 1,
    ...overrides,
  };
}
