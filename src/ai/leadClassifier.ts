import { z } from "zod";
import type {
  LeadClassification,
  LeadFields,
  LeadStage,
  LeadStatus,
} from "../types/lead.js";
import type { OpenRouterClient } from "./openRouterClient.js";

const classificationSchema = z.object({
  status: z.enum(["Hot", "Warm", "Cold"]),
  leadScore: z.number().min(0).max(100),
  stage: z.enum(["new", "qualifying", "qualified", "follow_up", "closed"]),
  notes: z.string().optional(),
});

export interface LeadClassificationOptions {
  client: OpenRouterClient;
  fields: LeadFields;
  rawMessages?: string[];
}

export async function classifyLead(
  options: LeadClassificationOptions,
): Promise<LeadClassification> {
  const prompts = buildClassificationPrompts(options);
  const result = await options.client.generateJson(
    prompts.systemPrompt,
    prompts.userPrompt,
    "LeadClassification",
  );

  if (result.ok) {
    return parseLeadClassificationData(result.data, options.fields);
  }

  return fallbackClassifyLead(options.fields);
}

export function parseLeadClassificationContent(
  content: string,
): LeadClassification {
  return parseLeadClassificationData(extractJsonObject(content));
}

export function parseLeadClassificationData(
  data: unknown,
  fallbackFields: LeadFields = {},
): LeadClassification {
  const parsed = classificationSchema.safeParse(data);

  if (!parsed.success) {
    return fallbackClassifyLead(fallbackFields);
  }

  return {
    status: parsed.data.status,
    leadScore: Math.round(parsed.data.leadScore),
    stage: parsed.data.stage,
    notes: parsed.data.notes ?? "",
  };
}

export function fallbackClassifyLead(fields: LeadFields): LeadClassification {
  if (fields.intent === "irrelevant" || fields.intent === "support") {
    return {
      status: "Cold",
      leadScore: fields.intent === "support" ? 25 : 5,
      stage: "qualifying",
      notes: `Fallback classification: ${fields.intent} intent is not a qualified sales lead.`,
    };
  }

  let score =
    fields.intent === "buying" ? 30 : fields.intent === "asking" ? 20 : 10;

  if (fields.serviceRequested) {
    score += 25;
  }

  if (fields.budget) {
    score += 20;
  }

  if (fields.timeline) {
    score += 15;
  }

  if (fields.phone) {
    score += 10;
  }

  if (isUrgent(fields.timeline) || isHighIntent(fields.notes)) {
    score += 20;
  }

  if (isVague(fields)) {
    score = Math.min(score, 35);
  }

  const leadScore = Math.min(score, 100);
  const status: LeadStatus =
    leadScore >= 75 ? "Hot" : leadScore >= 45 ? "Warm" : "Cold";
  const stage: LeadStage = leadScore >= 45 ? "qualified" : "qualifying";

  return {
    status,
    leadScore,
    stage,
    notes: "Fallback classification based on collected lead fields.",
  };
}

function buildClassificationPrompts(options: LeadClassificationOptions): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: [
      "Classify a small-business sales lead as Hot, Warm, or Cold.",
      "Return only compact JSON with keys: status, leadScore, stage, notes.",
      "Hot means: clear service need, wants to start soon, has budget or strong buying intent, and asks seriously for booking, call, quote, or price.",
      "Warm means: interested but missing budget or timeline, asking general questions, or likely needs follow-up.",
      "Cold means: vague, not ready, spam-like, support-only, or irrelevant.",
      "Do not invent prices, guarantees, discounts, deadlines, availability, or booking confirmation.",
    ].join(" "),
    userPrompt: JSON.stringify({
      fields: options.fields,
      rawMessages: options.rawMessages ?? [],
      examples: [
        {
          input: {
            serviceRequested: "Telegram bot",
            timeline: "this week",
            budget: "15000 EGP",
            intent: "buying",
          },
          output: {
            status: "Hot",
            leadScore: 90,
            stage: "qualified",
            notes: "Clear service, near timeline, budget, and buying intent.",
          },
        },
        {
          input: {
            serviceRequested: "Website",
            intent: "asking",
          },
          output: {
            status: "Warm",
            leadScore: 50,
            stage: "qualifying",
            notes: "Interested but missing timeline and budget.",
          },
        },
      ],
    }),
  };
}

function extractJsonObject(content: string): unknown {
  const stripped = content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return {};
  }

  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return {};
  }
}

function isUrgent(value?: string): boolean {
  return Boolean(
    value &&
    /(?:today|urgent|asap|now|اليوم|عاجل|حالا|حالاً|هذا الاسبوع|هذا الأسبوع)/iu.test(
      value,
    ),
  );
}

function isHighIntent(value?: string): boolean {
  return Boolean(
    value &&
    /(?:buy|start|book|demo|quote|call|price|اشتري|ابدأ|نبدأ|احجز|تواصل|محتاج|عرض سعر|مكالمة|سعر)/iu.test(
      value,
    ),
  );
}

function isVague(fields: LeadFields): boolean {
  return !fields.serviceRequested && !fields.timeline && !fields.budget;
}
