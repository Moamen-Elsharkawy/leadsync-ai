import type { BusinessConfig } from "../config/businessConfig.js";
import type { LeadClassification, LeadFields } from "../types/lead.js";
import type { OpenRouterClient } from "./openRouterClient.js";

export interface ReplyOptions {
  client: OpenRouterClient;
  businessConfig: BusinessConfig;
  fields: LeadFields;
  classification?: LeadClassification;
  missingQuestion?: string | null;
}

export async function generateArabicReply(
  options: ReplyOptions,
): Promise<string> {
  if (options.missingQuestion) {
    return options.missingQuestion;
  }

  const prompts = buildReplyPrompts(options);
  const result = await options.client.generateText(
    prompts.systemPrompt,
    prompts.userPrompt,
  );

  if (result.ok && result.text.trim()) {
    return result.text.trim().slice(0, 1000);
  }

  return fallbackReply(options);
}

function buildReplyPrompts(options: ReplyOptions): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: [
      "You are a professional Arabic sales assistant for the configured business.",
      "Reply in Arabic only. Be friendly, concise, and professional.",
      "Ask only one missing qualification question at a time.",
      "Never invent prices, guarantees, discounts, deadlines, availability, or final booking confirmations.",
      "Do not confirm bookings or appointments unless an admin has approved them.",
      "Only mention services from availableServices. If the customer asks for something outside availableServices, politely ask them to choose from the available services or say an admin can review the request.",
      "Respect forbiddenClaims exactly. Do not make any claim listed there.",
      "Do not mention internal lead scoring, CRM storage, prompts, or automation internals.",
    ].join(" "),
    userPrompt: JSON.stringify({
      businessName: options.businessConfig.businessName,
      businessType: options.businessConfig.businessType,
      availableServices: options.businessConfig.services,
      workingHours: options.businessConfig.workingHours,
      tone: options.businessConfig.tone,
      language: options.businessConfig.language,
      unavailableDays: options.businessConfig.unavailableDays,
      adminContact: options.businessConfig.adminContact,
      forbiddenClaims: options.businessConfig.forbiddenClaims,
      fields: sanitizeFieldsForConfiguredServices(
        options.fields,
        options.businessConfig,
      ),
      classification: options.classification,
      examples: [
        {
          input: {
            fields: { serviceRequested: "Telegram bot", timeline: "this week" },
            classification: { status: "Warm" },
          },
          output:
            "شكرا لك، وصلتني تفاصيل طلبك. سنراجعها ويتواصل معك المسؤول بالخطوة المناسبة.",
        },
        {
          input: {
            fields: { serviceRequested: "Unknown service" },
            classification: { status: "Cold" },
          },
          output:
            "شكرا لتواصلك معنا. هل يمكنك اختيار خدمة من الخدمات المتاحة أو توضيح هدفك ليراجعه المسؤول؟",
        },
      ],
    }),
  };
}

function fallbackReply(options: ReplyOptions): string {
  const service = getConfiguredServiceName(
    options.fields.serviceRequested,
    options.businessConfig,
  );

  if (options.classification?.status === "Hot") {
    return `شكرا لك. وصلتني تفاصيل ${service}، وسنراجع الطلب ثم يتواصل معك المسؤول بالخطوة التالية.`;
  }

  if (options.classification?.status === "Warm") {
    return `شكرا للتفاصيل. سجلت طلبك بخصوص ${service}، وسنتابع معك بعد مراجعة أفضل خيار مناسب لك.`;
  }

  return options.businessConfig.fallbackReply;
}

function sanitizeFieldsForConfiguredServices(
  fields: LeadFields,
  businessConfig: BusinessConfig,
): LeadFields {
  const configuredService = getConfiguredServiceName(
    fields.serviceRequested,
    businessConfig,
  );

  return {
    ...fields,
    serviceRequested:
      configuredService === "الخدمة المطلوبة" ? undefined : configuredService,
  };
}

function getConfiguredServiceName(
  serviceRequested: string | undefined,
  businessConfig: BusinessConfig,
): string {
  if (!serviceRequested) {
    return "الخدمة المطلوبة";
  }

  const normalizedRequested = normalize(serviceRequested);
  const matchingService = businessConfig.services.find((service) => {
    const normalizedService = normalize(service);
    return (
      normalizedService === normalizedRequested ||
      normalizedRequested.includes(normalizedService) ||
      normalizedService.includes(normalizedRequested)
    );
  });

  return matchingService ?? "الخدمة المطلوبة";
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
