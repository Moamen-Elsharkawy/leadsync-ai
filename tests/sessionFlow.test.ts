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
  businessName: "MoveWell Physical Therapy Centers",
  businessType: "physical therapy center",
  language: "ar",
  branches: ["Nasr City Branch", "Maadi Branch", "New Cairo Branch"],
  services: ["Back pain physiotherapy"],
  workingHours: { timezone: "Africa/Cairo", weekly: {} },
  tone: "professional",
  defaultCurrency: "EGP",
  unavailableDays: [],
  adminContact: {},
  qualificationQuestions: {
    serviceRequested: "تحب أساعدك في أي خدمة علاج طبيعي؟",
    fullName: "تقدر تقولي اسمك الكريم عشان أسجل الطلب باسمك؟",
    branch: "أنسب فرع لك إيه: مدينة نصر، المعادي، ولا التجمع؟",
    timing: "تحب الزيارة أو تواصل فريق الاستقبال يكون إمتى تقريبا؟",
    phone: "لو تحب مكالمة من فريق الاستقبال، ابعت رقم موبايل مناسب.",
  },
  fallbackReply: "شكرا لتواصلك مع MoveWell.",
  forbiddenClaims: [],
};

describe("sessionFlow", () => {
  it("asks for service first with a natural question", () => {
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

  it("asks missing questions in therapy priority order", () => {
    const fullNameQuestion = selectNextQualificationQuestion(
      { serviceRequested: "Back pain physiotherapy" },
      { telegramUserId: "123" },
      businessConfig,
    );
    const branchQuestion = selectNextQualificationQuestion(
      {
        serviceRequested: "Back pain physiotherapy",
        fullName: "Ahmed",
      },
      { telegramUserId: "123" },
      businessConfig,
    );

    expect(fullNameQuestion?.field).toBe("fullName");
    expect(branchQuestion?.field).toBe("branch");
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
    expect(second).toContain("العلاج الطبيعي");
  });

  it("marks a lead qualified with service, timing, and Telegram user id", () => {
    expect(
      isLeadQualified(
        {
          serviceRequested: "Back pain physiotherapy",
          branch: "Nasr City Branch",
          preferredDate: "tomorrow",
        },
        { telegramUserId: "123" },
      ),
    ).toBe(true);
  });

  it("marks a lead qualified with service, urgency, and phone", () => {
    expect(
      isLeadQualified(
        {
          serviceRequested: "Back pain physiotherapy",
          urgency: "urgent",
          phone: "01044440001",
        },
        {},
      ),
    ).toBe(true);
  });

  it("keeps unqualified leads below the minimum data threshold", () => {
    expect(
      isLeadQualified(
        { serviceRequested: "Back pain physiotherapy" },
        { telegramUserId: "123" },
      ),
    ).toBe(false);
  });

  it("merges later collected fields through session state JSON", () => {
    const existing = recordToSessionState({
      telegramUserId: "123",
      currentStep: "qualifying",
      collectedFieldsJson: JSON.stringify({
        serviceRequested: "Back pain physiotherapy",
      }),
      lastQuestionAsked: "تحب الزيارة إمتى؟",
      questionAskCount: 1,
      lastMessageAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    existing.collectedFields = {
      ...existing.collectedFields,
      preferredDate: "tomorrow",
    };

    expect(existing.collectedFields).toEqual({
      serviceRequested: "Back pain physiotherapy",
      preferredDate: "tomorrow",
    });
  });

  it("round-trips session state to sheet record format", () => {
    const record = sessionStateToRecord({
      telegramUserId: "123",
      currentStep: "qualifying",
      collectedFields: { serviceRequested: "Back pain physiotherapy" },
      lastQuestionAsked: "question",
      questionAskCount: 1,
      lastMessageAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const state = recordToSessionState(record);
    expect(state.collectedFields.serviceRequested).toBe(
      "Back pain physiotherapy",
    );
    expect(state.currentStep).toBe("qualifying");
  });
});
