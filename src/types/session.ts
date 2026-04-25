import type { LeadFields } from "./lead.js";

export type SessionStep = "new" | "qualifying" | "qualified";

export interface SessionRecord {
  telegramUserId: string;
  currentStep: SessionStep;
  collectedFieldsJson: string;
  lastQuestionAsked: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionState {
  telegramUserId: string;
  currentStep: SessionStep;
  collectedFields: LeadFields;
  lastQuestionAsked: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}
