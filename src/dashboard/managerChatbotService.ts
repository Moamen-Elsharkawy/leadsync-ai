import { z } from "zod";
import type { OpenRouterClient } from "../ai/openRouterClient.js";
import type { SheetsWebAppClient } from "../sheets/sheetsWebAppClient.js";
import type { FollowUpRecord, MessageRecord } from "../types/message.js";
import type { LeadRecord } from "../types/lead.js";

const CHATBOT_QUESTION_MAX = 500;
const CHATBOT_DEFAULT_TIMEOUT_MS = 8000;

export const managerChatbotQuerySchema = z.object({
  question: z.string().trim().min(3).max(CHATBOT_QUESTION_MAX),
  locale: z.enum(["en", "ar"]).default("en"),
  requestId: z.string().trim().min(8).max(128),
  sessionId: z.string().trim().min(8).max(128),
});

export type ManagerChatbotQuery = z.infer<typeof managerChatbotQuerySchema>;

export interface ManagerChatbotCitation {
  dataset: "leads" | "followups" | "messages" | "report";
  detail: string;
}

export interface ManagerChatbotResponse {
  answer: string;
  confidence: number;
  refused: boolean;
  refusalReason: string | null;
  citations: ManagerChatbotCitation[];
  provenance: {
    source: "google-sheets-webapp-only";
    datasetsUsed: ManagerChatbotCitation["dataset"][];
    generatedAt: string;
    requestId: string;
  };
}

interface ManagerChatbotServiceDeps {
  sheets: SheetsWebAppClient;
  aiClient?: OpenRouterClient;
  timeoutMs?: number;
}

interface FactsBundle {
  leads: LeadRecord[];
  followUps: FollowUpRecord[];
  messages: MessageRecord[];
}

interface CachedFactsEntry {
  cachedAt: number;
  data: FactsBundle;
}

const FACTS_CACHE_TTL_MS = 15_000;
const factsCache = new Map<string, CachedFactsEntry>();

export function clearManagerChatbotFactsCache(): void {
  factsCache.clear();
}

export class ManagerChatbotService {
  private readonly sheets: SheetsWebAppClient;
  private readonly aiClient?: OpenRouterClient;
  private readonly timeoutMs: number;

  constructor(deps: ManagerChatbotServiceDeps) {
    this.sheets = deps.sheets;
    this.aiClient = deps.aiClient;
    this.timeoutMs = deps.timeoutMs ?? CHATBOT_DEFAULT_TIMEOUT_MS;
  }

  async query(input: ManagerChatbotQuery): Promise<ManagerChatbotResponse> {
    const parsed = managerChatbotQuerySchema.parse(input);
    const normalizedQuestion = parsed.question.toLowerCase();
    const intent = detectIntent(normalizedQuestion);

    if (!intent) {
      return refusal(
        parsed.requestId,
        "The question is outside supported company-data queries.",
      );
    }

    const facts = await this.loadFactsForIntent(intent);
    const deterministic = buildDeterministicAnswer(intent, facts, parsed.locale);

    if (!deterministic) {
      return refusal(
        parsed.requestId,
        "I cannot answer this from the available Google Sheets data.",
      );
    }

    const grounded = shouldGenerateGroundedExplanation(parsed.question)
      ? await this.generateGroundedExplanation(
          parsed.question,
          deterministic,
          parsed.locale,
        )
      : null;

    return {
      answer: grounded ?? deterministic.answer,
      confidence: grounded ? Math.max(0.85, deterministic.confidence) : deterministic.confidence,
      refused: false,
      refusalReason: null,
      citations: deterministic.citations,
      provenance: {
        source: "google-sheets-webapp-only",
        datasetsUsed: uniqueDatasets(deterministic.citations),
        generatedAt: new Date().toISOString(),
        requestId: parsed.requestId,
      },
    };
  }

  private async loadFactsForIntent(intent: ChatbotIntent): Promise<FactsBundle> {
    const cached = factsCache.get(intent);
    const now = Date.now();
    if (cached && now - cached.cachedAt <= FACTS_CACHE_TTL_MS) {
      return cached.data;
    }

    const needsMessages = intent === "conversationVolume";
    const [leads, followUps, messages] = await Promise.all([
      this.sheets.listLeads(),
      this.sheets.listFollowUps(),
      needsMessages ? this.sheets.listMessages() : Promise.resolve([]),
    ]);
    const data = { leads, followUps, messages };
    factsCache.set(intent, { cachedAt: now, data });
    return data;
  }

  private async generateGroundedExplanation(
    question: string,
    deterministic: DeterministicAnswer,
    locale: "en" | "ar",
  ): Promise<string | null> {
    if (!this.aiClient) {
      return null;
    }

    const systemPrompt =
      locale === "ar"
        ? "أنت مساعد مدير شركة. استخدم الحقائق المرفقة فقط. لا تضف أي معلومة من خارج البيانات. إذا البيانات غير كافية اكتب فقط INSUFFICIENT_DATA."
        : "You are a company manager assistant. Use only the provided facts. Do not add any external information. If data is insufficient, return only INSUFFICIENT_DATA.";
    const userPrompt = [
      `Manager question: ${question}`,
      "Structured facts (Google Sheets derived):",
      deterministic.factsText,
      "Answer in a concise professional tone. No speculation.",
    ].join("\n\n");

    const result = await withTimeout(
      this.aiClient.generateText(systemPrompt, userPrompt),
      this.timeoutMs,
    ).catch(() => null);

    if (!result?.ok) {
      return null;
    }

    const text = result.text.trim();
    if (!text || text === "INSUFFICIENT_DATA") {
      return null;
    }

    return text;
  }
}

type ChatbotIntent =
  | "overviewCounts"
  | "leadStatusBreakdown"
  | "pendingFollowups"
  | "topBranch"
  | "topService"
  | "conversionStage"
  | "conversationVolume";

interface DeterministicAnswer {
  answer: string;
  confidence: number;
  citations: ManagerChatbotCitation[];
  factsText: string;
}

function detectIntent(question: string): ChatbotIntent | null {
  const normalized = normalizeQuestion(question);
  const scored: Array<{ intent: ChatbotIntent; score: number }> = [
    {
      intent: "overviewCounts",
      score: scoreIntent(normalized, [
        "overview",
        "summary",
        "kpi",
        "dashboard",
        "ملخص",
        "اجمالي",
        "تقرير عام",
      ]),
    },
    {
      intent: "leadStatusBreakdown",
      score: scoreIntent(normalized, [
        "hot",
        "warm",
        "cold",
        "status",
        "حار",
        "بارد",
        "حالة",
        "تصنيف",
      ]),
    },
    {
      intent: "pendingFollowups",
      score: scoreIntent(normalized, [
        "follow",
        "followup",
        "pending",
        "متابعة",
        "متابعات",
        "معلق",
      ]),
    },
    {
      intent: "topBranch",
      score: scoreIntent(normalized, ["branch", "فرع", "فروع", "location", "منطقة"]),
    },
    {
      intent: "topService",
      score: scoreIntent(normalized, ["service", "services", "خدمة", "خدمات"]),
    },
    {
      intent: "conversionStage",
      score: scoreIntent(normalized, [
        "stage",
        "pipeline",
        "conversion",
        "مرحلة",
        "مراحل",
      ]),
    },
    {
      intent: "conversationVolume",
      score: scoreIntent(normalized, [
        "message",
        "messages",
        "conversation",
        "chat",
        "رسالة",
        "رسائل",
        "محادثة",
      ]),
    },
  ];
  const top = scored.sort((a, b) => b.score - a.score)[0];
  return top && top.score > 0 ? top.intent : null;
}

function buildDeterministicAnswer(
  intent: ChatbotIntent,
  facts: FactsBundle,
  locale: "en" | "ar",
): DeterministicAnswer | null {
  switch (intent) {
    case "overviewCounts": {
      const totalLeads = facts.leads.length;
      const totalFollowUps = facts.followUps.length;
      const pendingFollowUps = facts.followUps.filter(
        (item) => item.status === "pending",
      ).length;
      return {
        answer:
          locale === "ar"
            ? `إجمالي العملاء المحتملين: ${totalLeads}. إجمالي المتابعات: ${totalFollowUps}. المتابعات المعلقة: ${pendingFollowUps}.`
            : `Total leads: ${totalLeads}. Total follow-ups: ${totalFollowUps}. Pending follow-ups: ${pendingFollowUps}.`,
        confidence: 0.93,
        citations: [
          { dataset: "leads", detail: "all rows from Leads sheet" },
          { dataset: "followups", detail: "all rows from FollowUps sheet" },
        ],
        factsText: `totalLeads=${totalLeads}\ntotalFollowUps=${totalFollowUps}\npendingFollowUps=${pendingFollowUps}`,
      };
    }
    case "leadStatusBreakdown": {
      const hot = facts.leads.filter((lead) => lead.status === "Hot").length;
      const warm = facts.leads.filter((lead) => lead.status === "Warm").length;
      const cold = facts.leads.filter((lead) => lead.status === "Cold").length;
      return {
        answer:
          locale === "ar"
            ? `توزيع الحالات: Hot=${hot}, Warm=${warm}, Cold=${cold}.`
            : `Lead status distribution: Hot=${hot}, Warm=${warm}, Cold=${cold}.`,
        confidence: 0.95,
        citations: [{ dataset: "leads", detail: "status field from Leads sheet" }],
        factsText: `hot=${hot}\nwarm=${warm}\ncold=${cold}`,
      };
    }
    case "pendingFollowups": {
      const pending = facts.followUps.filter((item) => item.status === "pending");
      return {
        answer:
          locale === "ar"
            ? `عدد المتابعات المعلقة: ${pending.length}.`
            : `Pending follow-ups count: ${pending.length}.`,
        confidence: 0.94,
        citations: [
          { dataset: "followups", detail: "status=pending from FollowUps sheet" },
        ],
        factsText: `pendingFollowUps=${pending.length}`,
      };
    }
    case "topBranch": {
      const counts = summarizeByKey(
        facts.leads.map((lead) => lead.branch || lead.location || "Unknown"),
      );
      const top = pickTop(counts);
      if (!top) {
        return null;
      }
      return {
        answer:
          locale === "ar"
            ? `أعلى فرع حسب عدد العملاء المحتملين هو ${top.key} بعدد ${top.count}.`
            : `Top branch by lead volume is ${top.key} with ${top.count} leads.`,
        confidence: 0.88,
        citations: [{ dataset: "leads", detail: "branch/location from Leads sheet" }],
        factsText: `topBranch=${top.key}\ncount=${top.count}`,
      };
    }
    case "topService": {
      const counts = summarizeByKey(
        facts.leads.map((lead) => lead.serviceRequested || "Unknown"),
      );
      const top = pickTop(counts);
      if (!top) {
        return null;
      }
      return {
        answer:
          locale === "ar"
            ? `أكثر خدمة طلباً: ${top.key} بعدد ${top.count}.`
            : `Most requested service is ${top.key} with ${top.count} leads.`,
        confidence: 0.87,
        citations: [
          { dataset: "leads", detail: "serviceRequested from Leads sheet" },
        ],
        factsText: `topService=${top.key}\ncount=${top.count}`,
      };
    }
    case "conversionStage": {
      const counts = summarizeByKey(facts.leads.map((lead) => lead.stage || "unknown"));
      const stageText = Object.entries(counts)
        .map(([stage, count]) => `${stage}=${count}`)
        .join(", ");
      return {
        answer:
          locale === "ar"
            ? `توزيع المراحل الحالية: ${stageText}.`
            : `Current stage distribution: ${stageText}.`,
        confidence: 0.89,
        citations: [{ dataset: "leads", detail: "stage from Leads sheet" }],
        factsText: stageText,
      };
    }
    case "conversationVolume": {
      return {
        answer:
          locale === "ar"
            ? `إجمالي الرسائل المتاحة في آخر عينة: ${facts.messages.length}.`
            : `Total messages in latest available sample: ${facts.messages.length}.`,
        confidence: 0.84,
        citations: [{ dataset: "messages", detail: "recent messages sample" }],
        factsText: `messagesSampleCount=${facts.messages.length}`,
      };
    }
    default:
      return null;
  }
}

function refusal(requestId: string, reason: string): ManagerChatbotResponse {
  return {
    answer:
      "I cannot answer this from available Google Sheets data. Please ask a question directly related to your stored leads, messages, follow-ups, or reports.",
    confidence: 0,
    refused: true,
    refusalReason: reason,
    citations: [],
    provenance: {
      source: "google-sheets-webapp-only",
      datasetsUsed: [],
      generatedAt: new Date().toISOString(),
      requestId,
    },
  };
}

function matchesAny(question: string, terms: string[]): boolean {
  return terms.some((term) => question.includes(term));
}

function scoreIntent(question: string, terms: string[]): number {
  return terms.reduce((score, term) => {
    if (!question.includes(term)) {
      return score;
    }
    return score + Math.max(1, term.length >= 6 ? 2 : 1);
  }, 0);
}

function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldGenerateGroundedExplanation(question: string): boolean {
  const normalized = normalizeQuestion(question);
  return [
    "why",
    "how",
    "explain",
    "analysis",
    "analyze",
    "recommend",
    "trend",
    "ليه",
    "كيف",
    "ازاي",
    "اشرح",
    "تحليل",
    "توصية",
    "اتجاه",
  ].some((term) => normalized.includes(term));
}

function summarizeByKey(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((acc, value) => {
    const key = value.trim() || "Unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function pickTop(
  counts: Record<string, number>,
): { key: string; count: number } | null {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return null;
  }
  const topEntry = entries.sort((a, b) => b[1] - a[1])[0];
  if (!topEntry) {
    return null;
  }
  const [key, count] = topEntry;
  return { key, count };
}

function uniqueDatasets(
  citations: ManagerChatbotCitation[],
): ManagerChatbotCitation["dataset"][] {
  return [...new Set(citations.map((item) => item.dataset))];
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timed out while generating grounded response."));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
