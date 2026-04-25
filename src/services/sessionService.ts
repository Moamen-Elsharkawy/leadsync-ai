import type { BusinessConfig } from "../config/businessConfig.js";
import type { SheetsWebAppClient } from "../sheets/sheetsWebAppClient.js";
import type { LeadContactContext, LeadFields } from "../types/lead.js";
import type {
  SessionRecord,
  SessionState,
  SessionStep,
} from "../types/session.js";
import { nowIso } from "../utils/date.js";

export type QualificationField =
  | "serviceRequested"
  | "timeline"
  | "budget"
  | "contact";

export interface QualificationQuestion {
  field: QualificationField;
  question: string;
}

const DEFAULT_QUESTIONS: Record<QualificationField, string> = {
  serviceRequested: "ما الخدمة التي تحتاجها بالتحديد؟",
  timeline: "متى تحتاج تنفيذ هذه الخدمة؟",
  budget: "ما الميزانية المتوقعة لهذه الخدمة؟",
  contact: "ما أفضل رقم هاتف أو طريقة تواصل مناسبة لك؟",
};

const REPEATED_QUESTIONS: Record<QualificationField, string> = {
  serviceRequested: "حتى أساعدك بدقة، ما نوع الخدمة المطلوبة؟",
  timeline: "ما الموعد التقريبي الذي يناسبك للبدء؟",
  budget: "إذا لم يكن لديك رقم محدد، ما نطاق الميزانية المتوقع؟",
  contact: "ما وسيلة التواصل المفضلة لديك للمتابعة؟",
};

export class SessionService {
  constructor(private readonly sheets: SheetsWebAppClient) {}

  async getOrCreateSession(telegramUserId: string): Promise<SessionState> {
    const existing = await this.sheets.getSession(telegramUserId);
    if (existing) {
      return recordToSessionState(existing);
    }

    const timestamp = nowIso();
    return {
      telegramUserId,
      currentStep: "new",
      collectedFields: {},
      lastQuestionAsked: "",
      lastMessageAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  saveSession(session: SessionState): Promise<SessionRecord> {
    return this.sheets.upsertSession(sessionStateToRecord(session));
  }
}

export function isLeadQualified(
  fields: LeadFields,
  contact: LeadContactContext,
): boolean {
  return Boolean(
    fields.serviceRequested &&
    (fields.timeline || fields.budget) &&
    (contact.telegramUsername ||
      contact.phone ||
      contact.telegramUserId ||
      fields.phone),
  );
}

export function getNextQualificationQuestion(
  fields: LeadFields,
  contact: LeadContactContext,
  businessConfig: BusinessConfig,
  lastQuestionAsked = "",
): string | null {
  return (
    selectNextQualificationQuestion(
      fields,
      contact,
      businessConfig,
      lastQuestionAsked,
    )?.question ?? null
  );
}

export function selectNextQualificationQuestion(
  fields: LeadFields,
  contact: LeadContactContext,
  businessConfig: BusinessConfig,
  lastQuestionAsked = "",
): QualificationQuestion | null {
  if (!fields.serviceRequested) {
    return buildQuestion(
      "serviceRequested",
      businessConfig.qualificationQuestions.serviceRequested ||
        DEFAULT_QUESTIONS.serviceRequested,
      lastQuestionAsked,
    );
  }

  if (!fields.timeline && !fields.budget) {
    const lastWasTimeline =
      lastQuestionAsked === DEFAULT_QUESTIONS.timeline ||
      lastQuestionAsked === REPEATED_QUESTIONS.timeline;
    return lastWasTimeline
      ? buildQuestion("budget", DEFAULT_QUESTIONS.budget, lastQuestionAsked)
      : buildQuestion(
          "timeline",
          DEFAULT_QUESTIONS.timeline,
          lastQuestionAsked,
        );
  }

  if (
    !contact.telegramUserId &&
    !contact.telegramUsername &&
    !contact.phone &&
    !fields.phone
  ) {
    return buildQuestion(
      "contact",
      businessConfig.qualificationQuestions.phone || DEFAULT_QUESTIONS.contact,
      lastQuestionAsked,
    );
  }

  return null;
}

function buildQuestion(
  field: QualificationField,
  question: string,
  lastQuestionAsked: string,
): QualificationQuestion {
  return {
    field,
    question:
      lastQuestionAsked === question ? REPEATED_QUESTIONS[field] : question,
  };
}

export function recordToSessionState(record: SessionRecord): SessionState {
  return {
    telegramUserId: String(record.telegramUserId),
    currentStep: normalizeStep(record.currentStep),
    collectedFields: parseCollectedFields(record.collectedFieldsJson),
    lastQuestionAsked: record.lastQuestionAsked ?? "",
    lastMessageAt: record.lastMessageAt ?? nowIso(),
    createdAt: record.createdAt ?? nowIso(),
    updatedAt: record.updatedAt ?? nowIso(),
  };
}

export function sessionStateToRecord(session: SessionState): SessionRecord {
  return {
    telegramUserId: session.telegramUserId,
    currentStep: session.currentStep,
    collectedFieldsJson: JSON.stringify(session.collectedFields),
    lastQuestionAsked: session.lastQuestionAsked,
    lastMessageAt: session.lastMessageAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function parseCollectedFields(value: string): LeadFields {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as LeadFields;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeStep(value: string): SessionStep {
  if (value === "qualifying" || value === "qualified") {
    return value;
  }

  return "new";
}
