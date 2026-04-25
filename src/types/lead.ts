export type LeadStatus = "Hot" | "Warm" | "Cold";
export type LeadIntent =
  | "buying"
  | "asking"
  | "support"
  | "irrelevant"
  | "unknown";

export type LeadStage =
  | "new"
  | "qualifying"
  | "qualified"
  | "follow_up"
  | "closed";

export interface LeadFields {
  fullName?: string;
  phone?: string;
  serviceRequested?: string;
  budget?: string;
  timeline?: string;
  location?: string;
  notes?: string;
  intent?: LeadIntent;
}

export interface LeadRecord extends LeadFields {
  leadId: string;
  telegramUserId: string;
  telegramUsername: string;
  fullName: string;
  phone: string;
  serviceRequested: string;
  budget: string;
  timeline: string;
  location: string;
  status: LeadStatus;
  leadScore: number;
  stage: LeadStage;
  lastQuestionAsked: string;
  notes: string;
  rawMessages: string;
  createdAt: string;
  updatedAt: string;
  followUpCount: number;
  nextFollowUpAt: string;
  isDemo: boolean;
}

export interface LeadContactContext {
  telegramUserId?: string;
  telegramUsername?: string;
  phone?: string;
}

export interface LeadClassification {
  status: LeadStatus;
  leadScore: number;
  stage: LeadStage;
  notes: string;
}
