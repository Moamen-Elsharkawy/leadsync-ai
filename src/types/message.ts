export type MessageDirection = "inbound" | "outbound";

export interface MessageRecord {
  messageId: string;
  leadId: string;
  telegramUserId: string;
  direction: MessageDirection;
  text: string;
  createdAt: string;
}

export interface FollowUpRecord {
  followUpId: string;
  leadId: string;
  telegramUserId: string;
  status: "pending" | "sent" | "cancelled" | "failed";
  scheduledAt: string;
  sentAt: string;
  message: string;
  attemptNumber: number;
}

export interface ReportRecord {
  reportId: string;
  reportDate: string;
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  conversionSummaryJson: string;
  createdAt: string;
}
