import { describe, expect, it } from "vitest";
import { buildLeadRecord } from "../src/services/leadService.js";
import type { LeadClassification, LeadFields } from "../src/types/lead.js";

describe("leadService", () => {
  it("creates a new lead with provided fields and classification", () => {
    const lead = buildLeadRecord({
      telegramUserId: "123",
      telegramUsername: "@customer",
      fields: createFields(),
      classification: createClassification(),
      latestMessageText: "I need a Telegram bot this week.",
    });

    expect(lead.status).toBe("Hot");
    expect(lead.budget).toBe("25000 EGP");
  });

  it("merges updates into an existing lead", () => {
    const existingLead = buildLeadRecord({
      telegramUserId: "123",
      fields: createFields(),
      classification: createClassification(),
      latestMessageText: "Initial message",
    });

    const updatedLead = buildLeadRecord({
      telegramUserId: "123",
      fields: { ...createFields(), budget: "40000 EGP" },
      classification: createClassification(),
      existingLead,
      latestMessageText: "Budget is 40000 EGP.",
    });

    expect(updatedLead.budget).toBe("40000 EGP");
    expect(updatedLead.leadId).toBe(existingLead.leadId);
  });
});

function createFields(overrides: Partial<LeadFields> = {}): LeadFields {
  return {
    serviceRequested: "Telegram bot",
    budget: "25000 EGP",
    timeline: "this week",
    ...overrides,
  };
}

function createClassification(
  overrides: Partial<LeadClassification> = {},
): LeadClassification {
  return {
    status: "Hot",
    leadScore: 90,
    stage: "qualified",
    notes: "Ready to buy.",
    ...overrides,
  };
}
