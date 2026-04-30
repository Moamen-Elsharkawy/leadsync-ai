import { z } from "zod";
import type { BusinessConfig } from "../config/businessConfig.js";
import type { LeadFields, LeadIntent } from "../types/lead.js";
import type { MessageRecord } from "../types/message.js";
import type { OpenRouterClient } from "./openRouterClient.js";

const extractedLeadSchema = z.object({
  fullName: z.string().nullable(),
  phone: z.string().nullable(),
  serviceRequested: z.string().nullable(),
  branch: z.string().nullable(),
  conditionArea: z.string().nullable(),
  urgency: z.string().nullable(),
  preferredDate: z.string().nullable(),
  preferredTime: z.string().nullable(),
  contactPreference: z.string().nullable(),
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
  recentMessages?: MessageRecord[];
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
  const fallbackExtracted = constrainLeadFieldsToBusiness(
    fallbackExtractLeadData(options.messageText),
    options.businessConfig,
  );
  const result = await options.client.generateJson(
    prompts.systemPrompt,
    prompts.userPrompt,
    "PhysicalTherapyLeadExtraction",
  );

  if (result.ok) {
    const aiExtracted = constrainLeadFieldsToBusiness(
      parseLeadExtractionData(result.data),
      options.businessConfig,
    );
    const extracted = mergeLeadFields(fallbackExtracted, aiExtracted);
    if (Object.keys(extracted).length > 0) {
      return {
        extracted,
        merged: mergeLeadFields(options.existingFields ?? {}, extracted),
        source: "ai",
      };
    }
  }

  const extracted = fallbackExtracted;
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
    branch: parsed.data.branch ?? undefined,
    conditionArea: parsed.data.conditionArea ?? undefined,
    urgency: parsed.data.urgency ?? undefined,
    preferredDate: parsed.data.preferredDate ?? undefined,
    preferredTime: parsed.data.preferredTime ?? undefined,
    contactPreference: parsed.data.contactPreference ?? undefined,
    timeline: parsed.data.timeline ?? parsed.data.preferredDate ?? undefined,
    location: parsed.data.location ?? parsed.data.branch ?? undefined,
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
    [keyof LeadFields, LeadFields[keyof LeadFields]]
  >) {
    if (!value) {
      continue;
    }

    if (key === "notes") {
      merged.notes = String(value);
      continue;
    }

    if (key === "intent") {
      if (isLeadIntent(value)) {
        merged.intent = value;
      }
      continue;
    }

    if (typeof value === "string") {
      merged[key] = value;
    }
  }

  return merged;
}

export function fallbackExtractLeadData(messageText: string): LeadFields {
  const normalizedText = normalizeArabicText(messageText);
  const branch = extractBranch(normalizedText);
  const conditionArea = extractConditionArea(normalizedText);
  const serviceRequested = extractService(normalizedText);
  const preferredDate = extractPreferredDate(normalizedText);
  const preferredTime = extractPreferredTime(normalizedText);
  const phone = extractPhone(normalizedText);
  const fullName = extractFullName(normalizedText);
  const urgency = extractUrgency(normalizedText, preferredDate);
  const contactPreference = extractContactPreference(normalizedText, phone);
  const intent = extractIntent(normalizedText);

  // Only set notes if there's meaningful extracted information,
  // not the raw message text itself.
  const meaningfulNotes = buildMeaningfulNotes(
    messageText,
    serviceRequested,
    conditionArea,
  );

  return cleanLeadFields({
    fullName,
    phone,
    serviceRequested,
    branch,
    conditionArea,
    urgency,
    preferredDate,
    preferredTime,
    contactPreference,
    timeline: preferredDate,
    location: branch ?? extractLocation(normalizedText),
    notes: meaningfulNotes,
    intent,
  });
}

function buildMeaningfulNotes(
  messageText: string,
  serviceRequested?: string,
  conditionArea?: string,
): string | undefined {
  // Only create notes for messages that contain useful extra context
  // beyond what's already captured in structured fields
  if (messageText.length > 100 && (serviceRequested || conditionArea)) {
    return `Customer message: ${messageText.slice(0, 200)}`;
  }
  return undefined;
}

function buildExtractionPrompts(options: LeadExtractionOptions): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: [
      "You extract intake and lead qualification data for a physical therapy center called MoveWell.",
      "Return only valid JSON with exactly these keys: fullName, phone, serviceRequested, branch, conditionArea, urgency, preferredDate, preferredTime, contactPreference, timeline, location, notes, intent.",
      'Each field except intent must be a string or null. intent must be one of: "buying", "asking", "support", "irrelevant", "unknown".',
      "",
      "CRITICAL RULES:",
      "- Extract ONLY what the customer actually said. Never invent data.",
      "- Use the existingFields and recentMessages to build cumulative context. If a field was provided in a previous message, keep it.",
      "- For fullName: extract Arabic or English names. Look for patterns like 'اسمي [name]', 'أنا [name]', or just a name provided in response to a name question.",
      "- For phone: extract Egyptian mobile (01x-xxxx-xxxx) or landline (02-xxxx-xxxx) numbers.",
      "- serviceRequested must match one configured service when possible.",
      "- branch should match one configured branch when possible.",
      "- If the customer says general 'علاج طبيعي' or 'فيزيو' without specifying body part, set serviceRequested to null and note they need general physiotherapy.",
      "- Do not diagnose or provide medical advice.",
    ].join("\n"),
    userPrompt: JSON.stringify({
      businessName: options.businessConfig.businessName,
      branches: options.businessConfig.branches,
      services: options.businessConfig.services,
      existingFields: options.existingFields ?? {},
      recentMessages: serializeRecentMessages(options.recentMessages),
      messageText: options.messageText,
      examples: [
        {
          input:
            "محتاج جلسة علاج طبيعي لأسفل الظهر في فرع مدينة نصر بكرة. رقمي 01044440001.",
          output: {
            fullName: null,
            phone: "01044440001",
            serviceRequested: "Back pain physiotherapy",
            branch: "Nasr City Branch",
            conditionArea: "lower back",
            urgency: "soon",
            preferredDate: "tomorrow",
            preferredTime: null,
            contactPreference: "phone call",
            timeline: "tomorrow",
            location: "Nasr City Branch",
            notes:
              "Customer wants lower back physiotherapy in Nasr City tomorrow.",
            intent: "buying",
          },
        },
        {
          input: "أنا أحمد ومحتاج جلسة للركبة",
          output: {
            fullName: "أحمد",
            phone: null,
            serviceRequested: "Knee pain treatment",
            branch: null,
            conditionArea: "knee",
            urgency: null,
            preferredDate: null,
            preferredTime: null,
            contactPreference: null,
            timeline: null,
            location: null,
            notes: null,
            intent: "buying",
          },
        },
      ],
    }),
  };
}

function serializeRecentMessages(
  recentMessages: MessageRecord[] | undefined,
): Array<{ direction: string; text: string }> {
  return (recentMessages ?? []).slice(-10).map((message) => ({
    direction: message.direction,
    text: String(message.text ?? "").slice(0, 500),
  }));
}

function constrainLeadFieldsToBusiness(
  fields: LeadFields,
  businessConfig: BusinessConfig,
): LeadFields {
  const constrained: LeadFields = { ...fields };

  if (constrained.serviceRequested && businessConfig.services.length > 0) {
    const matchingService = findConfiguredValue(
      constrained.serviceRequested,
      businessConfig.services,
    );

    if (matchingService) {
      constrained.serviceRequested = matchingService;
    } else {
      constrained.notes = [
        constrained.notes,
        `Unsupported requested service: ${constrained.serviceRequested}`,
      ]
        .filter(Boolean)
        .join("\n");
      constrained.serviceRequested = undefined;
    }
  }

  if (constrained.branch && (businessConfig.branches?.length ?? 0) > 0) {
    constrained.branch =
      findConfiguredValue(constrained.branch, businessConfig.branches) ??
      normalizeBranchAlias(constrained.branch) ??
      constrained.branch;
    constrained.location = constrained.branch;
  }

  return constrained;
}

function findConfiguredValue(
  requested: string,
  configuredValues: string[],
): string | undefined {
  const normalizedRequested = normalize(requested);
  return configuredValues.find((value) => {
    const normalizedValue = normalize(value);
    return (
      normalizedRequested === normalizedValue ||
      normalizedRequested.includes(normalizedValue) ||
      normalizedValue.includes(normalizedRequested)
    );
  });
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

function extractPhone(messageText: string): string | undefined {
  // Match Egyptian mobile (01x) and landline (02) numbers
  const phone = firstMatch(
    messageText,
    /(?:\+?2?0[12]\d{8,9}|\+?\d[\d\s().-]{7,}\d)/u,
  )?.replace(/[^\d+]/g, "");
  return phone?.replace(/^(\+?20)/, "0");
}

function extractFullName(messageText: string): string | undefined {
  // Pattern 1: Explicit name introduction
  const explicitName = firstMatch(
    messageText,
    /(?:اسمي|انا|أنا|my name is|i am|اسم حضرتك|أنا اسمي)\s+([^\n،,.?؟]{2,40})/iu,
    1,
  );

  if (explicitName) {
    return normalizeExtractedName(explicitName);
  }

  // Pattern 2: Standalone Arabic name (2-4 words of Arabic letters only)
  // Only match if the entire message looks like just a name
  const trimmed = messageText.trim();
  if (
    trimmed.length >= 3 &&
    trimmed.length <= 50 &&
    /^[\u0600-\u06FF\s]+$/.test(trimmed) &&
    !/(?:مرحبا|السلام|سلام|أهلا|شكرا|تمام|اه|لا|أيوه|ماشي|حاضر|طيب)/.test(
      trimmed,
    ) &&
    trimmed.split(/\s+/).length <= 4
  ) {
    return trimmed;
  }

  return undefined;
}

function normalizeExtractedName(value: string): string | undefined {
  const [firstPart = ""] = value.split(
    /\s+(?:و?محتاج|و?محتاجة|و?عايز|و?عاوز|و?حابب|and|need|want)/iu,
  );
  const cleaned = firstPart.trim();

  return cleaned.length >= 2 ? cleaned : undefined;
}

function extractBranch(messageText: string): string | undefined {
  if (/(?:مدينة نصر|مدينه نصر|nasr city)/iu.test(messageText)) {
    return "Nasr City Branch";
  }

  if (/(?:المعادي|معادي|maadi)/iu.test(messageText)) {
    return "Maadi Branch";
  }

  if (
    /(?:التجمع|القاهرة الجديدة|القاهره الجديده|new cairo|tagamoa|tagamo3)/iu.test(
      messageText,
    )
  ) {
    return "New Cairo Branch";
  }

  if (/(?:اقرب فرع|أقرب فرع|nearest branch)/iu.test(messageText)) {
    return "nearest branch";
  }

  return undefined;
}

function normalizeBranchAlias(value: string): string | undefined {
  return extractBranch(value);
}

function extractConditionArea(messageText: string): string | undefined {
  const patterns: Array<[RegExp, string]> = [
    [/(?:أسفل الظهر|اسفل الظهر|الظهر|ضهر|ظهر|lower back|back)/iu, "back"],
    [/(?:الرقبة|رقبة|رقبه|neck)/iu, "neck"],
    [/(?:ركبة|الركبة|ركبه|الركبه|knee)/iu, "knee"],
    [/(?:كتف|الكتف|shoulder)/iu, "shoulder"],
    [
      /(?:رباط صليبي|acl|بعد عملية|بعد العمليه|جراحة|جراحه|surgery|post surgery|post-surgery)/iu,
      "post-surgery",
    ],
    [
      /(?:إصابة ملاعب|اصابة ملاعب|رياض|كورة|كرة|football|sports injury)/iu,
      "sports injury",
    ],
    [/(?:أطفال|اطفال|طفل|pediatric|kids)/iu, "pediatric"],
    [/(?:قوام|انحناء|وضعية|وضعيه|posture)/iu, "posture"],
    [/(?:مانيول|يدوي|manual therapy)/iu, "manual therapy"],
  ];

  return patterns.find(([pattern]) => pattern.test(messageText))?.[1];
}

function extractService(messageText: string): string | undefined {
  const services: Array<[RegExp, string]> = [
    [
      /(?:أسفل الظهر|اسفل الظهر|الظهر|ضهر|ظهر|lower back|back pain)/iu,
      "Back pain physiotherapy",
    ],
    [/(?:الرقبة|رقبة|رقبه|neck pain|neck)/iu, "Neck pain physiotherapy"],
    [
      /(?:إصابة ملاعب|اصابة ملاعب|رياض|كورة|كرة|football|sports injury)/iu,
      "Sports injury rehabilitation",
    ],
    [
      /(?:رباط صليبي|acl|بعد عملية|بعد العمليه|جراحة|جراحه|surgery|post surgery|post-surgery)/iu,
      "Post-surgery rehabilitation",
    ],
    [/(?:ركبة|الركبة|ركبه|الركبه|knee)/iu, "Knee pain treatment"],
    [/(?:كتف|الكتف|shoulder)/iu, "Shoulder rehabilitation"],
    [
      /(?:جلسة منزلية|جلسه منزليه|زيارة منزلية|زياره منزليه|في البيت|home physiotherapy|home session)/iu,
      "Home physiotherapy session",
    ],
    [
      /(?:أطفال|اطفال|طفل|pediatric|kids)/iu,
      "Pediatric physiotherapy consultation",
    ],
    [/(?:قوام|انحناء|وضعية|وضعيه|posture)/iu, "Posture correction"],
    [/(?:مانيول|يدوي|manual therapy)/iu, "Manual therapy inquiry"],
    // General physiotherapy without specific body part — do NOT default to back
    // Return undefined so the bot asks which service
  ];

  return services.find(([pattern]) => pattern.test(messageText))?.[1];
}

function extractPreferredDate(messageText: string): string | undefined {
  const patterns = [
    [/(?:النهارده|النهاردة|اليوم|today)/iu, "today"],
    [/(?:بكرة|بكره|غدا|غدًا|tomorrow)/iu, "tomorrow"],
    [/(?:عاجل|حالا|حالًا|مستعجل|urgent|asap)/iu, "urgent"],
    [
      /(?:الأسبوع ده|الاسبوع ده|هذا الأسبوع|هذا الاسبوع|this week)/iu,
      "this week",
    ],
    [/(?:الأسبوع الجاي|الاسبوع الجاي|next week)/iu, "next week"],
    [/(?:الشهر ده|هذا الشهر|this month)/iu, "this month"],
  ] as const;

  return patterns.find(([pattern]) => pattern.test(messageText))?.[1];
}

function extractPreferredTime(messageText: string): string | undefined {
  const patterns = [
    [/(?:الصبح|صباح|morning)/iu, "morning"],
    [/(?:بعد الظهر|بعد الضهر|afternoon)/iu, "afternoon"],
    [/(?:بالليل|المساء|مساء|evening|night)/iu, "evening"],
    [/(?:بعد\s*\d{1,2}|at\s*\d{1,2})/iu, undefined],
  ] as const;

  const direct = patterns.find(([pattern]) => pattern.test(messageText));
  if (direct?.[1]) {
    return direct[1];
  }

  return firstMatch(
    messageText,
    /(?:الساعة|الساعه|at)\s*([0-9]{1,2}(?::[0-9]{2})?\s?(?:am|pm)?)/iu,
    1,
  );
}

function extractUrgency(
  messageText: string,
  preferredDate: string | undefined,
): string | undefined {
  if (
    preferredDate === "today" ||
    preferredDate === "tomorrow" ||
    preferredDate === "urgent" ||
    /(?:عاجل|حالا|حالًا|مستعجل|urgent|asap|book|احجز|حجز|موعد)/iu.test(
      messageText,
    )
  ) {
    return "urgent";
  }

  if (preferredDate === "this week" || /(?:قريب|soon)/iu.test(messageText)) {
    return "soon";
  }

  return preferredDate ? "routine" : undefined;
}

function extractContactPreference(
  messageText: string,
  phone?: string,
): string | undefined {
  if (
    phone ||
    /(?:كلموني|اتصال|مكالمة|مكالمه|call|phone)/iu.test(messageText)
  ) {
    return "phone call";
  }

  if (/(?:تليجرام|تلجرام|telegram)/iu.test(messageText)) {
    return "Telegram";
  }

  return undefined;
}

function extractLocation(messageText: string): string | undefined {
  return firstMatch(
    messageText,
    /(?:في|من|location|city)\s+([^\n،,.]{2,40})/iu,
    1,
  );
}

function extractIntent(messageText: string): LeadIntent {
  if (
    /(?:spam|scam|free money|crypto giveaway|اعلان عشوائي)/iu.test(messageText)
  ) {
    return "irrelevant";
  }

  if (/(?:support|bug|refund|دعم|مشكلة تقنية|استرجاع)/iu.test(messageText)) {
    return "support";
  }

  if (
    /(?:احجز|حجز|موعد|كلموني|اتصال|مكالمة|مكالمه|السعر|سعر|تكلفة|تكلفه|price|cost|book|call|urgent|asap|need|want|عايز|عاوز|محتاج|محتاجة)/iu.test(
      messageText,
    )
  ) {
    return /(?:احجز|حجز|موعد|كلموني|اتصال|مكالمة|مكالمه|urgent|asap|book|call|مستعجل|عاجل|بكرة|بكره|النهارده|النهاردة)/iu.test(
      messageText,
    )
      ? "buying"
      : "asking";
  }

  if (messageText.trim().length < 12) {
    return "asking";
  }

  return "unknown";
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

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeArabicText(value: string): string {
  return value
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();
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
