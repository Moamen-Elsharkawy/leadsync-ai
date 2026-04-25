import { describe, expect, it } from "vitest";
import type { BusinessConfig } from "../src/config/businessConfig.js";
import {
  getNextQualificationQuestion,
  isLeadQualified,
  recordToSessionState,
  selectNextQualificationQuestion,
  sessionStateToRecord,
} from "../src/services/sessionService.js";

const businessConfig: BusinessConfig = {
  businessName: "Test Business",
  businessType: "automation studio",
  language: "ar",
  services: ["Telegram bot"],
  workingHours: { timezone: "Africa/Cairo", weekly: {} },
  tone: "professional",
  defaultCurrency: "EGP",
  unavailableDays: [],
  adminContact: {},
  qualificationQuestions: {
    serviceRequested: "ما الخدمة التي تحتاجها بالتحديد؟",
    budgetOrTimeline: "ما الميزانية المتوقعة أو الموعد المطلوب لتنفيذ الخدمة؟",
    phone: "هل يمكنك إرسال رقم هاتف للتواصل معك؟",
  },
  fallbackReply: "شكرا لتواصلك معنا.",
  forbiddenClaims: [],
};

describe("sessionFlow", () => {
  it("asks for service first", () => {
    const question = selectNextQualificationQuestion(
      {},
      { telegramUserId: "123" },
      businessConfig,
    );

    expect(question).toEqual({
      field: "serviceRequested",
      question: businessConfig.qualificationQuestions.serviceRequested,
    });
  });

  it("asks missing questions in priority order while below minimum data", () => {
    const timelineQuestion = selectNextQualificationQuestion(
      { serviceRequested: "Telegram bot" },
      { telegramUserId: "123" },
      businessConfig,
    );
    const budgetQuestion = selectNextQualificationQuestion(
      { serviceRequested: "Telegram bot" },
      { telegramUserId: "123" },
      businessConfig,
      timelineQuestion?.question,
    );

    expect(timelineQuestion?.field).toBe("timeline");
    expect(budgetQuestion?.field).toBe("budget");
  });

  it("does not ask the exact same question repeatedly", () => {
    const first = getNextQualificationQuestion(
      {},
      { telegramUserId: "123" },
      businessConfig,
    );
    const second = getNextQualificationQuestion(
      {},
      { telegramUserId: "123" },
      businessConfig,
      first ?? "",
    );

    expect(second).not.toBe(first);
    expect(second).toContain("الخدمة");
  });

  it("marks a lead qualified with service, timeline, and Telegram user id", () => {
    expect(
      isLeadQualified(
        { serviceRequested: "Telegram bot", timeline: "this week" },
        { telegramUserId: "123" },
      ),
    ).toBe(true);
  });

  it("marks a lead qualified with service, budget, and Telegram user id", () => {
    expect(
      isLeadQualified(
        { serviceRequested: "Telegram bot", budget: "15000 EGP" },
        { telegramUserId: "123" },
      ),
    ).toBe(true);
  });

  it("merges later collected fields through session state JSON", () => {
    const existing = recordToSessionState({
      telegramUserId: "123",
      currentStep: "qualifying",
      collectedFieldsJson: JSON.stringify({ serviceRequested: "Website" }),
      lastQuestionAsked: "متى تحتاج تنفيذ هذه الخدمة؟",
      lastMessageAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    existing.collectedFields = {
      ...existing.collectedFields,
      timeline: "next month",
    };

    expect(existing.collectedFields).toEqual({
      serviceRequested: "Website",
      timeline: "next month",
    });
  });

  it("round-trips session state to sheet record format", () => {
    const record = sessionStateToRecord({
      telegramUserId: "123",
      currentStep: "qualifying",
      collectedFields: { serviceRequested: "Telegram bot" },
      lastQuestionAsked: "question",
      lastMessageAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const state = recordToSessionState(record);
    expect(state.collectedFields.serviceRequested).toBe("Telegram bot");
    expect(state.currentStep).toBe("qualifying");
  });
});
