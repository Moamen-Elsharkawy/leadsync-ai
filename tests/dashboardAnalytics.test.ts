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

  it("counts intake statuses, follow-up statuses, urgency, and date metrics", () => {
    const summary = getDashboardSummary(
      [
        createLead({ leadId: "hot", status: "Hot", leadScore: 90 }),
        createLead({
          leadId: "warm",
          status: "Warm",
          urgency: "soon",
          leadScore: 60,
          createdAt: "2026-04-20T00:00:00.000Z",
        }),
        createLead({
          leadId: "cold",
          status: "Cold",
          urgency: "",
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
      urgentLeads: 1,
      leadsCreatedToday: 1,
      leadsCreatedThisWeek: 2,
      averageLeadScore: 57,
    });
  });

  it("filters leads by search, status, stage, service, and sort order", () => {
    const leads = [
      createLead({
        leadId: "lead_1",
        fullName: "Mona Hassan",
        status: "Hot",
        stage: "qualified",
        serviceRequested: "Back pain physiotherapy",
        branch: "Nasr City Branch",
        leadScore: 88,
      }),
      createLead({
        leadId: "lead_2",
        fullName: "Ahmed Ali",
        status: "Warm",
        stage: "qualifying",
        serviceRequested: "Neck pain physiotherapy",
        branch: "Maadi Branch",
        leadScore: 50,
      }),
    ];

    expect(
      filterLeads(leads, {
        search: "nasr",
        status: "Hot",
        stage: "qualified",
        serviceRequested: "Back pain physiotherapy",
      }).map((lead) => lead.leadId),
    ).toEqual(["lead_1"]);

    expect(
      filterLeads(leads, {
        sortBy: "leadScore",
        sortDirection: "asc",
      }).map((lead) => lead.leadId),
    ).toEqual(["lead_2", "lead_1"]);
  });

  it("builds chart-friendly therapy analytics and manager reports", () => {
    const leads = [
      createLead({
        serviceRequested: "Back pain physiotherapy",
        branch: "Nasr City Branch",
        status: "Hot",
      }),
      createLead({
        serviceRequested: "Back pain physiotherapy",
        branch: "Nasr City Branch",
        status: "Warm",
      }),
      createLead({
        serviceRequested: "Neck pain physiotherapy",
        branch: "Maadi Branch",
        status: "Cold",
      }),
    ];
    const analytics = getLeadAnalytics(leads, [createFollowUp()], now);
    const report = buildOwnerReportText(leads, [createFollowUp()]);

    expect(analytics.leadsByStatus).toContainEqual({ name: "Hot", value: 1 });
    expect(analytics.topRequestedServices[0]).toEqual({
      service: "Back pain physiotherapy",
      leads: 2,
    });
    expect(analytics.branchDemand[0]).toEqual({
      branch: "Nasr City Branch",
      leads: 2,
    });
    expect(report).toContain("MoveWell Physical Therapy Intake Report");
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
    serviceRequested: "Back pain physiotherapy",
    branch: "Nasr City Branch",
    conditionArea: "back",
    urgency: "urgent",
    preferredDate: "tomorrow",
    preferredTime: "evening",
    contactPreference: "phone call",
    budget: "",
    timeline: "tomorrow",
    location: "Nasr City Branch",
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
