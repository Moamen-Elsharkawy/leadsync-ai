import { describe, expect, it, vi } from "vitest";
import type { OpenRouterClient } from "../src/ai/openRouterClient.js";
import {
  classifyLead,
  fallbackClassifyLead,
  parseLeadClassificationContent,
} from "../src/ai/leadClassifier.js";

describe("leadClassifier", () => {
  it("classifies urgent therapy intake with service, branch, timing, and phone as Hot", () => {
    const result = fallbackClassifyLead({
      serviceRequested: "Back pain physiotherapy",
      branch: "Nasr City Branch",
      preferredDate: "tomorrow",
      phone: "+201044440001",
      urgency: "urgent",
      notes: "Customer wants a call and appointment review tomorrow",
      intent: "buying",
    });

    expect(result.status).toBe("Hot");
    expect(result.leadScore).toBeGreaterThanOrEqual(75);
  });

  it("classifies general therapy interest with missing data as Warm", () => {
    const result = fallbackClassifyLead({
      serviceRequested: "Manual therapy inquiry",
      intent: "asking",
    });

    expect(result.status).toBe("Warm");
  });

  it("classifies vague or irrelevant messages as Cold", () => {
    expect(fallbackClassifyLead({ intent: "irrelevant" }).status).toBe("Cold");
    expect(fallbackClassifyLead({ intent: "support" }).status).toBe("Cold");
    expect(fallbackClassifyLead({ notes: "hello" }).status).toBe("Cold");
  });

  it("parses AI classification JSON", () => {
    const result = parseLeadClassificationContent(
      '{"status":"Warm","leadScore":61,"stage":"qualified","notes":"Clear need."}',
    );

    expect(result).toEqual({
      status: "Warm",
      leadScore: 61,
      stage: "qualified",
      notes: "Clear need.",
    });
  });

  it("uses AI classification when OpenRouter succeeds", async () => {
    const generateJson = vi.fn().mockResolvedValue({
      ok: true,
      schemaName: "PhysicalTherapyLeadClassification",
      data: {
        status: "Hot",
        leadScore: 88,
        stage: "qualified",
        notes: "Ready for staff call.",
      },
      source: "openrouter",
    });
    const client = {
      generateJson,
      generateText: vi.fn(),
    } as unknown as OpenRouterClient;

    const result = await classifyLead({
      client,
      fields: {
        serviceRequested: "Sports injury rehabilitation",
        branch: "New Cairo Branch",
        preferredDate: "today",
      },
    });

    expect(generateJson).toHaveBeenCalledOnce();
    expect(result.status).toBe("Hot");
    expect(result.leadScore).toBe(88);
  });
});
