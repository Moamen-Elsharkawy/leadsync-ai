import { describe, expect, it } from "vitest";
import {
  buildOwnerReportText,
  filterLeads,
  getDashboardSummary,
  getLeadAnalytics,
} from "../src/dashboard/analytics.js";
import type { LeadRecord } from "../src/types/lead.js";
import type { FollowUpRecord } from "../src/types/message.js";

describe("dashboard analytics", () => {
  const now = new Date("2026-04-25T12:00:00.000Z");

  it("counts lead statuses, follow-up statuses, conversion, and date metrics", () => {
    const summary = getDashboardSummary(
      [
        createLead({ leadId: "hot", status: "Hot", leadScore: 90 }),
        createLead({
          leadId: "warm",
          status: "Warm",
          leadScore: 60,
          createdAt: "2026-04-20T00:00:00.000Z",
        }),
        createLead({
          leadId: "cold",
          status: "Cold",
          leadScore: 20,
          createdAt: "2026-03-01T00:00:00.000Z",
        }),
      ],
      [
        createFollowUp({
          status: "pending",
          scheduledAt: "2026-04-24T00:00:00.000Z",
        }),
        createFollowUp({ status: "sent" }),
      ],
      now,
    );

    expect(summary).toMatchObject({
      totalLeads: 3,
      hotLeads: 1,
      warmLeads: 1,
      coldLeads: 1,
      pendingFollowUps: 1,
      sentFollowUps: 1,
      overdueFollowUps: 1,
      conversionRate: 33,
      leadsCreatedToday: 1,
      leadsCreatedThisWeek: 2,
      averageLeadScore: 57,
    });
  });

  it("filters leads by search, status, stage, demo flag, service, and sort order", () => {
    const leads = [
      createLead({
        leadId: "lead_1",
        fullName: "Mona Hassan",
        status: "Hot",
        stage: "qualified",
        serviceRequested: "زراعة الأسنان",
        isDemo: true,
        leadScore: 88,
      }),
      createLead({
        leadId: "lead_2",
        fullName: "Ahmed Ali",
        status: "Warm",
        stage: "qualifying",
        serviceRequested: "تبييض الأسنان",
        isDemo: false,
        leadScore: 50,
      }),
    ];

    expect(
      filterLeads(leads, {
        search: "mona",
        status: "Hot",
        stage: "qualified",
        serviceRequested: "زراعة الأسنان",
        isDemo: true,
      }).map((lead) => lead.leadId),
    ).toEqual(["lead_1"]);

    expect(
      filterLeads(leads, {
        sortBy: "leadScore",
        sortDirection: "asc",
      }).map((lead) => lead.leadId),
    ).toEqual(["lead_2", "lead_1"]);
  });

  it("builds chart-friendly analytics and business owner reports", () => {
    const leads = [
      createLead({ serviceRequested: "زراعة الأسنان", status: "Hot" }),
      createLead({ serviceRequested: "زراعة الأسنان", status: "Warm" }),
      createLead({ serviceRequested: "تبييض الأسنان", status: "Cold" }),
    ];
    const analytics = getLeadAnalytics(leads, [createFollowUp()], now);
    const report = buildOwnerReportText(leads, [createFollowUp()]);

    expect(analytics.leadsByStatus).toContainEqual({ name: "Hot", value: 1 });
    expect(analytics.topRequestedServices[0]).toEqual({
      service: "زراعة الأسنان",
      leads: 2,
    });
    expect(report).toContain("SmartFlow AI Sales Report");
    expect(report).toContain("Top requested services");
  });
});

function createLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    leadId: "lead_test",
    telegramUserId: "123",
    telegramUsername: "@customer",
    fullName: "Customer",
    phone: "+201000000000",
    serviceRequested: "زراعة الأسنان",
    budget: "25000 EGP",
    timeline: "this week",
    location: "Cairo",
    status: "Hot",
    leadScore: 90,
    stage: "qualified",
    lastQuestionAsked: "",
    notes: "Interested lead.",
    rawMessages: "[]",
    createdAt: "2026-04-25T09:00:00.000Z",
    updatedAt: "2026-04-25T09:00:00.000Z",
    followUpCount: 0,
    nextFollowUpAt: "",
    isDemo: false,
    ...overrides,
  };
}

function createFollowUp(
  overrides: Partial<FollowUpRecord> = {},
): FollowUpRecord {
  return {
    followUpId: "fu_1",
    leadId: "lead_test",
    telegramUserId: "123",
    status: "pending",
    scheduledAt: "2026-04-26T00:00:00.000Z",
    sentAt: "",
    message: "Follow up",
    attemptNumber: 1,
    ...overrides,
  };
}
