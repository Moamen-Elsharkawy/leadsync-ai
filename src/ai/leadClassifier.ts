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
    "PhysicalTherapyLeadClassification",
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
      notes: `Fallback classification: ${fields.intent} intent is not a qualified intake lead.`,
    };
  }

  let score =
    fields.intent === "buying" ? 30 : fields.intent === "asking" ? 20 : 10;

  if (fields.serviceRequested) {
    score += 25;
  }

  if (fields.branch || fields.location) {
    score += 12;
  }

  if (fields.preferredDate || fields.timeline || fields.urgency) {
    score += 15;
  }

  if (fields.phone || fields.contactPreference) {
    score += 12;
  }

  if (
    isUrgent(fields.urgency) ||
    isUrgent(fields.timeline) ||
    isHighIntent(fields.notes)
  ) {
    score += 15;
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
    notes:
      "Fallback classification based on physical therapy intake fields. Staff must review before confirming appointments or advice.",
  };
}

function buildClassificationPrompts(options: LeadClassificationOptions): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: [
      "Classify a physical therapy center intake lead as Hot, Warm, or Cold.",
      "Return only compact JSON with keys: status, leadScore, stage, notes.",
      "Hot means: clear therapy service or condition area, branch or location preference, wants contact/booking soon, has phone/contact method, or asks seriously for a call, appointment, branch availability, or price.",
      "Warm means: interested but missing branch, contact method, or preferred timing; asking general questions or price without readiness.",
      "Cold means: vague, not ready, spam-like, support-only, or irrelevant.",
      "Do not diagnose, give treatment advice, estimate sessions, promise outcomes, invent prices, or confirm appointments.",
    ].join(" "),
    userPrompt: JSON.stringify({
      fields: options.fields,
      rawMessages: options.rawMessages ?? [],
      examples: [
        {
          input: {
            serviceRequested: "Back pain physiotherapy",
            branch: "Nasr City Branch",
            preferredDate: "tomorrow",
            phone: "01044440001",
            intent: "buying",
          },
          output: {
            status: "Hot",
            leadScore: 90,
            stage: "qualified",
            notes:
              "Clear service, branch, near timing, contact details, and buying intent.",
          },
        },
        {
          input: {
            serviceRequested: "Manual therapy inquiry",
            intent: "asking",
          },
          output: {
            status: "Warm",
            leadScore: 50,
            stage: "qualifying",
            notes: "Interested but missing branch, timing, and contact method.",
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
    /(?:today|tomorrow|urgent|asap|soon|now|النهارده|اليوم|بكرة|بكره|عاجل|حالا|حالًا|قريب)/iu.test(
      value,
    ),
  );
}

function isHighIntent(value?: string): boolean {
  return Boolean(
    value &&
    /(?:book|booking|appointment|call|price|cost|reserve|احجز|حجز|موعد|كلموني|اتصال|مكالمة|سعر|تكلفة|محتاج|عايز|عاوز)/iu.test(
      value,
    ),
  );
}

function isVague(fields: LeadFields): boolean {
  return (
    !fields.serviceRequested &&
    !fields.conditionArea &&
    !fields.branch &&
    !fields.timeline &&
    !fields.preferredDate
  );
}
