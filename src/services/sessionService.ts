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
  | "fullName"
  | "serviceRequested"
  | "branch"
  | "timeline"
  | "phone";

export interface QualificationQuestion {
  field: QualificationField;
  question: string;
}

const DEFAULT_QUESTIONS: Record<QualificationField, string> = {
  fullName: "تقدر تقولي اسمك الكريم عشان أسجل الطلب باسمك؟",
  serviceRequested:
    "تحب أساعدك في أي خدمة علاج طبيعي؟ مثلا الظهر، الرقبة، الركبة، إصابة ملاعب، تأهيل بعد عملية، أو جلسة منزلية.",
  branch: "أنسب فرع لك إيه: مدينة نصر، المعادي، ولا التجمع؟",
  timeline: "تحب الزيارة أو تواصل فريق الاستقبال يكون إمتى تقريبا؟",
  phone:
    "لو تحب مكالمة من فريق الاستقبال، ابعت رقم موبايل مناسب. أو نقدر نكمل معاك هنا على تليجرام.",
};

const REPEATED_QUESTIONS: Record<QualificationField, string> = {
  fullName:
    "عشان أسجل طلبك بشكل صحيح لفريق الاستقبال، محتاج اسمك الكامل لو سمحت.",
  serviceRequested:
    "عشان أوصل طلبك للفريق الصح، محتاج أعرف نوع استفسار العلاج الطبيعي المطلوب.",
  branch: "أي فرع أقرب لك من فروع MoveWell: مدينة نصر، المعادي، ولا التجمع؟",
  timeline: "ما الوقت التقريبي المناسب للزيارة أو تواصل فريق الاستقبال؟",
  phone:
    "لو مناسب، ابعت رقم للتواصل أو قول لنا إنك تفضل المتابعة هنا على تليجرام.",
};

const THIRD_ASK_QUESTIONS: Record<QualificationField, string> = {
  fullName: "ممكن اسمك لو سمحت عشان نسجل الطلب؟",
  serviceRequested:
    "قولي بس إيه اللي محتاج مساعدة فيه وأنا هوصل الطلب للمختص.",
  branch: "لو مش متأكد من الفرع، قولي المنطقة القريبة منك وأنا أرشح لك.",
  timeline:
    "لو مش متأكد من الوقت، ممكن فريق الاستقبال يتواصل معاك يقترح مواعيد.",
  phone: "لا مشكلة لو مش عايز تشارك رقم، نقدر نكمل هنا على تليجرام.",
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
      questionAskCount: 0,
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
      (fields.timeline || fields.preferredDate || fields.urgency) &&
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
  questionAskCount = 0,
): QualificationQuestion | null {
  // Ask for service first — this is the most important field
  if (!fields.serviceRequested) {
    return buildQuestion(
      "serviceRequested",
      businessConfig.qualificationQuestions.serviceRequested ||
        DEFAULT_QUESTIONS.serviceRequested,
      lastQuestionAsked,
      questionAskCount,
    );
  }

  // Ask for name — important for reception team
  if (!fields.fullName) {
    return buildQuestion(
      "fullName",
      businessConfig.qualificationQuestions.fullName ||
        DEFAULT_QUESTIONS.fullName,
      lastQuestionAsked,
      questionAskCount,
    );
  }

  // Ask for branch
  if (!fields.branch && !fields.location) {
    return buildQuestion(
      "branch",
      businessConfig.qualificationQuestions.branch || DEFAULT_QUESTIONS.branch,
      lastQuestionAsked,
      questionAskCount,
    );
  }

  // Ask for timing
  if (!fields.timeline && !fields.preferredDate && !fields.urgency) {
    return buildQuestion(
      "timeline",
      businessConfig.qualificationQuestions.timing ||
        businessConfig.qualificationQuestions.budgetOrTimeline ||
        DEFAULT_QUESTIONS.timeline,
      lastQuestionAsked,
      questionAskCount,
    );
  }

  // Ask for phone — but only if we don't have ANY contact method.
  // Since we always have telegramUserId, phone is optional but helpful.
  if (!fields.phone && !contact.phone) {
    return buildQuestion(
      "phone",
      businessConfig.qualificationQuestions.phone || DEFAULT_QUESTIONS.phone,
      lastQuestionAsked,
      questionAskCount,
    );
  }

  return null;
}

function buildQuestion(
  field: QualificationField,
  question: string,
  lastQuestionAsked: string,
  questionAskCount: number,
): QualificationQuestion {
  // 3rd+ time asking the same field — use softer phrasing
  if (lastQuestionAsked === REPEATED_QUESTIONS[field] && questionAskCount >= 2) {
    return { field, question: THIRD_ASK_QUESTIONS[field] };
  }

  // 2nd time asking the same question — use alternate phrasing
  if (lastQuestionAsked === question) {
    return { field, question: REPEATED_QUESTIONS[field] };
  }

  return { field, question };
}

export function recordToSessionState(record: SessionRecord): SessionState {
  return {
    telegramUserId: String(record.telegramUserId),
    currentStep: normalizeStep(record.currentStep),
    collectedFields: parseCollectedFields(record.collectedFieldsJson),
    lastQuestionAsked: record.lastQuestionAsked ?? "",
    questionAskCount: Number(record.questionAskCount) || 0,
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
    questionAskCount: session.questionAskCount,
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
