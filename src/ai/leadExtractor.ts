import { z } from "zod";
import type { BusinessConfig } from "../config/businessConfig.js";
import type { LeadFields, LeadIntent } from "../types/lead.js";
import type { OpenRouterClient } from "./openRouterClient.js";

const extractedLeadSchema = z.object({
  fullName: z.string().nullable(),
  phone: z.string().nullable(),
  serviceRequested: z.string().nullable(),
  budget: z.string().nullable(),
  timeline: z.string().nullable(),
  location: z.string().nullable(),
  notes: z.string().nullable(),
  intent: z.enum(["buying", "asking", "support", "irrelevant", "unknown"]),
});

export interface LeadExtractionOptions {
  client: OpenRouterClient;
  messageText: string;
  existingFields?: LeadFields;
  businessConfig: BusinessConfig;
}

export interface LeadExtractionResult {
  extracted: LeadFields;
  merged: LeadFields;
  source: "ai" | "fallback";
}

export async function extractLeadInfo(
  options: LeadExtractionOptions,
): Promise<LeadExtractionResult> {
  const prompts = buildExtractionPrompts(options);
  const result = await options.client.generateJson(
    prompts.systemPrompt,
    prompts.userPrompt,
    "LeadExtraction",
  );

  if (result.ok) {
    const extracted = constrainLeadFieldsToBusiness(
      parseLeadExtractionData(result.data),
      options.businessConfig,
    );
    if (Object.keys(extracted).length > 0) {
      return {
        extracted,
        merged: mergeLeadFields(options.existingFields ?? {}, extracted),
        source: "ai",
      };
    }
  }

  const extracted = constrainLeadFieldsToBusiness(
    fallbackExtractLeadData(options.messageText),
    options.businessConfig,
  );
  return {
    extracted,
    merged: mergeLeadFields(options.existingFields ?? {}, extracted),
    source: "fallback",
  };
}

export function parseLeadExtractionContent(content: string): LeadFields {
  return parseLeadExtractionData(extractJsonObject(content));
}

export function parseLeadExtractionData(data: unknown): LeadFields {
  const parsed = extractedLeadSchema.safeParse(data);

  if (!parsed.success) {
    return {};
  }

  return cleanLeadFields({
    fullName: parsed.data.fullName ?? undefined,
    phone: parsed.data.phone ?? undefined,
    serviceRequested: parsed.data.serviceRequested ?? undefined,
    budget: parsed.data.budget ?? undefined,
    timeline: parsed.data.timeline ?? undefined,
    location: parsed.data.location ?? undefined,
    notes: parsed.data.notes ?? undefined,
    intent: parsed.data.intent,
  });
}

export function mergeLeadFields(
  existingFields: LeadFields,
  extractedFields: LeadFields,
): LeadFields {
  const merged: LeadFields = { ...cleanLeadFields(existingFields) };
  const cleanExtracted = cleanLeadFields(extractedFields);

  for (const [key, value] of Object.entries(cleanExtracted) as Array<
    [keyof LeadFields, string]
  >) {
    if (!value) {
      continue;
    }

    if (key === "notes" && merged.notes && merged.notes !== value) {
      merged.notes = `${merged.notes}\n${value}`;
      continue;
    }

    if (key === "intent") {
      if (isLeadIntent(value)) {
        merged.intent = value;
      }
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

export function fallbackExtractLeadData(messageText: string): LeadFields {
  const phone = firstMatch(messageText, /(?:\+?\d[\d\s().-]{7,}\d)/u)?.replace(
    /[^\d+]/g,
    "",
  );
  const budget = firstMatch(
    messageText,
    /(?:\$|usd|egp|جنيه|دولار)?\s?\d[\d,. ]{2,}\s?(?:\$|usd|egp|جنيه|دولار|k|الف|ألف)?/iu,
  );
  const fullName =
    firstMatch(
      messageText,
      /(?:اسمي|انا|أنا|my name is|i am)\s+([^\n،,.]+)/iu,
      1,
    ) ?? undefined;
  const timeline = extractTimeline(messageText);
  const location = extractLocation(messageText);
  const serviceRequested = extractService(messageText);
  const intent = extractIntent(messageText);

  return cleanLeadFields({
    fullName,
    phone,
    serviceRequested,
    budget,
    timeline,
    location,
    notes: messageText,
    intent,
  });
}

function buildExtractionPrompts(options: LeadExtractionOptions): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: [
      "You extract CRM lead qualification data for a small-business Arabic sales assistant.",
      "Return only valid JSON with exactly these keys: fullName, phone, serviceRequested, budget, timeline, location, notes, intent.",
      'Each field except intent must be a string or null. intent must be one of: "buying", "asking", "support", "irrelevant", "unknown".',
      "Extract only what the customer actually said. Never invent prices, guarantees, discounts, deadlines, availability, names, phone numbers, or booking confirmations.",
      "serviceRequested must match one item from the configured services list when possible. If the requested service is not in the configured list, set serviceRequested to null and mention it in notes.",
      "If a field is implied but not explicit, keep it null and mention the uncertainty in notes.",
    ].join(" "),
    userPrompt: JSON.stringify({
      businessName: options.businessConfig.businessName,
      businessType: options.businessConfig.businessType,
      services: options.businessConfig.services,
      existingFields: options.existingFields ?? {},
      messageText: options.messageText,
      examples: [
        {
          input:
            "I need a Telegram sales bot this week. Budget around 15000 EGP. My number is 01012345678.",
          output: {
            fullName: null,
            phone: "01012345678",
            serviceRequested: "Telegram sales bot",
            budget: "15000 EGP",
            timeline: "this week",
            location: null,
            notes:
              "Customer wants a Telegram sales bot and shared budget and phone.",
            intent: "buying",
          },
        },
        {
          input: "كام سعر الأتمتة؟",
          output: {
            fullName: null,
            phone: null,
            serviceRequested: "automation",
            budget: null,
            timeline: null,
            location: null,
            notes:
              "Customer is asking about price without sharing budget or timing.",
            intent: "asking",
          },
        },
      ],
    }),
  };
}

function constrainLeadFieldsToBusiness(
  fields: LeadFields,
  businessConfig: BusinessConfig,
): LeadFields {
  if (!fields.serviceRequested || businessConfig.services.length === 0) {
    return fields;
  }

  const normalizedRequested = normalize(fields.serviceRequested);
  const matchingService = businessConfig.services.find((service) => {
    const normalizedService = normalize(service);
    return (
      normalizedRequested === normalizedService ||
      normalizedRequested.includes(normalizedService) ||
      normalizedService.includes(normalizedRequested)
    );
  });

  if (matchingService) {
    return { ...fields, serviceRequested: matchingService };
  }

  return {
    ...fields,
    serviceRequested: undefined,
    notes: [
      fields.notes,
      `Unsupported requested service: ${fields.serviceRequested}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanLeadFields(fields: LeadFields): LeadFields {
  const clean: LeadFields = {};

  for (const [key, value] of Object.entries(fields) as Array<
    [keyof LeadFields, unknown]
  >) {
    if (key === "intent") {
      if (isLeadIntent(value)) {
        clean.intent = value;
      }
      continue;
    }

    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed) {
      clean[key] = trimmed.slice(0, 1000);
    }
  }

  return clean;
}

function isLeadIntent(value: unknown): value is LeadIntent {
  return (
    value === "buying" ||
    value === "asking" ||
    value === "support" ||
    value === "irrelevant" ||
    value === "unknown"
  );
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

function firstMatch(
  value: string,
  regex: RegExp,
  groupIndex = 0,
): string | undefined {
  const match = regex.exec(value);
  const matched = match?.[groupIndex];
  return matched?.trim();
}

function extractTimeline(messageText: string): string | undefined {
  const patterns = [
    /(?:اليوم|حالا|حالاً|عاجل|urgent|asap)/iu,
    /(?:هذا الاسبوع|هذا الأسبوع|اسبوع|أسبوع|week)/iu,
    /(?:شهر|month|30 days|٣٠ يوم|30 يوم)/iu,
    /(?:next month|الشهر القادم|الشهر الجاي)/iu,
  ];

  for (const pattern of patterns) {
    const match = firstMatch(messageText, pattern);
    if (match) {
      return match;
    }
  }

  return firstMatch(messageText, /(?:خلال|في خلال|within)\s+([^\n،,.]+)/iu, 1);
}

function extractLocation(messageText: string): string | undefined {
  return (
    firstMatch(
      messageText,
      /(?:في|من|location|city)\s+([^\n،,.]{2,40})/iu,
      1,
    ) ??
    firstMatch(
      messageText,
      /(?:القاهرة|الجيزة|الإسكندرية|alexandria|cairo|giza)/iu,
    )
  );
}

function extractService(messageText: string): string | undefined {
  const services: Array<[RegExp, string]> = [
    [/(?:زراعة|زرع|implant|implants)/iu, "زراعة الأسنان"],
    [/(?:تبييض|whitening)/iu, "تبييض الأسنان"],
    [/(?:تنظيف|تلميع|cleaning|polishing)/iu, "تنظيف وتلميع الأسنان"],
    [/(?:تقويم|orthodontic|braces)/iu, "تقويم الأسنان"],
    [/(?:كشف|استشارة أسنان|dental consultation)/iu, "كشف واستشارة أسنان"],
    [/(?:كورس|دورة|course|enroll|اشتراك)/iu, "الاشتراك في كورس فردي"],
    [/(?:تدريب خاص|جلسات تدريب|coaching|private)/iu, "جلسات تدريب خاصة"],
    [
      /(?:تدريب شركة|تدريب فرق|corporate training|team training)/iu,
      "تدريب فرق الشركات",
    ],
    [/(?:باقة|bundle)/iu, "باقة كورسات"],
    [
      /(?:مسار|استشارة اختيار|learning consultation)/iu,
      "استشارة اختيار مسار التعلم",
    ],
    [/(?:telegram|تيليجرام|تلجرام|بوت)/iu, "Telegram bot"],
    [/(?:طوارئ|ألم|emergency)/iu, "استفسار طوارئ الأسنان"],
    [/(?:automation|اوتوميشن|أتمتة|اتمتة)/iu, "AI automation"],
    [/(?:crm|عملاء|مبيعات)/iu, "CRM setup"],
    [/(?:website|web site|موقع|landing page)/iu, "Website"],
    [/(?:ads|marketing|اعلانات|إعلانات|تسويق)/iu, "Marketing automation"],
    [/(?:chatbot|شات بوت|ذكاء اصطناعي|ai)/iu, "AI chatbot"],
  ];

  for (const [pattern, service] of services) {
    if (pattern.test(messageText)) {
      return service;
    }
  }

  return firstMatch(
    messageText,
    /(?:احتاج|أحتاج|عايز|عاوز|need|want)\s+([^\n،,.]{3,80})/iu,
    1,
  );
}

function extractIntent(messageText: string): LeadIntent {
  if (/(?:spam|scam|free money|crypto giveaway)/iu.test(messageText)) {
    return "irrelevant";
  }

  if (
    /(?:support|help|bug|problem|issue|refund|دعم|مشكلة|استرجاع)/iu.test(
      messageText,
    )
  ) {
    return "support";
  }

  if (
    /(?:buy|start|book|call|quote|price|cost|demo|need|want|urgent|asap|اشتري|ابدأ|احجز|سعر|تكلفة|عرض سعر|محتاج|عايز)/iu.test(
      messageText,
    )
  ) {
    return /(?:book|call|quote|start|urgent|asap|buy|احجز|اتصال|مكالمة|عرض سعر|ابدأ|عاجل)/iu.test(
      messageText,
    )
      ? "buying"
      : "asking";
  }

  return "unknown";
}
