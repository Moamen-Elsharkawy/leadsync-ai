import { describe, expect, it, vi } from "vitest";
import type { OpenRouterClient } from "../src/ai/openRouterClient.js";
import {
  classifyLead,
  fallbackClassifyLead,
  parseLeadClassificationContent,
} from "../src/ai/leadClassifier.js";

describe("leadClassifier", () => {
  it("classifies clear buying intent with timing and budget as Hot", () => {
    const result = fallbackClassifyLead({
      serviceRequested: "Telegram bot",
      budget: "25000 EGP",
      timeline: "urgent",
      phone: "+201000000000",
      notes: "I want a quote and a call to start now",
      intent: "buying",
    });

    expect(result.status).toBe("Hot");
    expect(result.leadScore).toBeGreaterThanOrEqual(75);
  });

  it("classifies general interest with missing data as Warm", () => {
    const result = fallbackClassifyLead({
      serviceRequested: "Website",
      intent: "asking",
    });

    expect(result.status).toBe("Warm");
  });

  it("classifies irrelevant or support-only messages as Cold", () => {
    expect(fallbackClassifyLead({ intent: "irrelevant" }).status).toBe("Cold");
    expect(fallbackClassifyLead({ intent: "support" }).status).toBe("Cold");
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
      schemaName: "LeadClassification",
      data: {
        status: "Hot",
        leadScore: 88,
        stage: "qualified",
        notes: "Ready to buy.",
      },
      source: "openrouter",
    });
    const client = {
      generateJson,
      generateText: vi.fn(),
    } as unknown as OpenRouterClient;

    const result = await classifyLead({
      client,
      fields: { serviceRequested: "CRM", budget: "10000 EGP" },
    });

    expect(generateJson).toHaveBeenCalledOnce();
    expect(result.status).toBe("Hot");
    expect(result.leadScore).toBe(88);
  });
});
