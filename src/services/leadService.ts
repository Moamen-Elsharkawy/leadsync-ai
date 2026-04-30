import type {
  LeadClassification,
  LeadFields,
  LeadRecord,
} from "../types/lead.js";
import type { SheetsWebAppClient } from "../sheets/sheetsWebAppClient.js";
import { addHoursIso, nowIso } from "../utils/date.js";
import { createLeadId } from "../utils/id.js";

export interface BuildLeadInput {
  telegramUserId: string;
  telegramUsername?: string;
  fields: LeadFields;
  classification: LeadClassification;
  lastQuestionAsked?: string;
  existingLead?: LeadRecord | null;
  latestMessageText: string;
}

export class LeadService {
  constructor(private readonly sheets: SheetsWebAppClient) {}

  getLeadByTelegramUserId(telegramUserId: string): Promise<LeadRecord | null> {
    return this.sheets.getLead(createLeadId(telegramUserId));
  }

  getLead(leadId: string): Promise<LeadRecord | null> {
    return this.sheets.getLead(leadId);
  }

  upsertLead(lead: LeadRecord): Promise<LeadRecord> {
    return this.sheets.upsertLead(lead);
  }

  listLeads(limit?: number): Promise<LeadRecord[]> {
    return this.sheets.listLeads(limit);
  }

  listHotLeads(limit?: number): Promise<LeadRecord[]> {
    return this.sheets.listHotLeads(limit);
  }

  listWarmLeads(limit?: number): Promise<LeadRecord[]> {
    return this.sheets.listWarmLeads(limit);
  }

  listColdLeads(limit?: number): Promise<LeadRecord[]> {
    return this.sheets.listColdLeads(limit);
  }
}

export function buildLeadRecord(input: BuildLeadInput): LeadRecord {
  const timestamp = nowIso();
  const existing = input.existingLead;
  const rawMessages = appendRawMessage(
    existing?.rawMessages,
    input.latestMessageText,
  );
  const shouldScheduleFollowUp =
    input.classification.status === "Warm" && !(existing?.nextFollowUpAt ?? "");

  return {
    leadId: createLeadId(input.telegramUserId),
    telegramUserId: input.telegramUserId,
    telegramUsername:
      input.telegramUsername ?? existing?.telegramUsername ?? "",
    fullName: input.fields.fullName ?? existing?.fullName ?? "",
    phone: input.fields.phone ?? existing?.phone ?? "",
    serviceRequested:
      input.fields.serviceRequested ?? existing?.serviceRequested ?? "",
    branch: input.fields.branch ?? existing?.branch ?? "",
    conditionArea: input.fields.conditionArea ?? existing?.conditionArea ?? "",
    urgency: input.fields.urgency ?? existing?.urgency ?? "",
    preferredDate: input.fields.preferredDate ?? existing?.preferredDate ?? "",
    preferredTime: input.fields.preferredTime ?? existing?.preferredTime ?? "",
    contactPreference:
      input.fields.contactPreference ?? existing?.contactPreference ?? "",
    budget: input.fields.budget ?? existing?.budget ?? "",
    timeline: input.fields.timeline ?? existing?.timeline ?? "",
    location:
      input.fields.location ??
      input.fields.branch ??
      existing?.location ??
      existing?.branch ??
      "",
    status: input.classification.status,
    leadScore: input.classification.leadScore,
    stage: input.classification.stage,
    lastQuestionAsked:
      input.lastQuestionAsked ?? existing?.lastQuestionAsked ?? "",
    notes: joinNotes(
      input.fields.notes,
      input.classification.notes,
      existing?.notes,
    ),
    rawMessages: JSON.stringify(rawMessages),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    followUpCount: Number(existing?.followUpCount ?? 0),
    nextFollowUpAt:
      existing?.nextFollowUpAt ||
      (shouldScheduleFollowUp ? addHoursIso(24) : ""),
  };
}

export function formatLeadSummary(lead: LeadRecord): string {
  return [
    `${lead.status} (${lead.leadScore}) - ${lead.leadId}`,
    `Service: ${lead.serviceRequested || "unknown"}`,
    `Branch: ${lead.branch || lead.location || "unknown"}`,
    `Urgency: ${lead.urgency || "unknown"}`,
    `Name: ${lead.fullName || "unknown"}`,
    `Phone: ${lead.phone || "unknown"}`,
    `Preferred date: ${lead.preferredDate || lead.timeline || "unknown"}`,
  ].join("\n");
}

function appendRawMessage(
  rawMessages: string | undefined,
  messageText: string,
): string[] {
  const messages = parseRawMessages(rawMessages);
  messages.push(messageText);
  return messages.slice(-50);
}

function parseRawMessages(rawMessages: string | undefined): string[] {
  if (!rawMessages) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawMessages) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [rawMessages];
  }
}

function joinNotes(
  currentNotes?: string,
  classificationNotes?: string,
  existingNotes?: string,
): string {
  // Take only the latest classification note (replaces previous ones)
  // and the latest extraction note, to prevent unbounded accumulation.
  const parts: string[] = [];

  // Keep existing admin-added notes (lines starting with "Admin note:")
  if (existingNotes) {
    const adminLines = existingNotes
      .split("\n")
      .filter((line) => line.trim().startsWith("Admin note:"));
    parts.push(...adminLines);
  }

  // Add the latest extraction note (if any)
  if (currentNotes?.trim()) {
    parts.push(currentNotes.trim());
  }

  // Add the latest classification note (if any)
  if (classificationNotes?.trim()) {
    parts.push(classificationNotes.trim());
  }

  return Array.from(new Set(parts)).join("\n").slice(0, 3000);
}
