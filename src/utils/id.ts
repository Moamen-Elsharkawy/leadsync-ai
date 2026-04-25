import { createHash, randomUUID } from "node:crypto";

export function createLeadId(telegramUserId: string): string {
  const safeUserId = telegramUserId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `lead_${safeUserId || hashId(telegramUserId)}`;
}

export function createMessageId(
  prefix: string,
  telegramMessageId?: number,
): string {
  if (telegramMessageId !== undefined) {
    return `${prefix}_${telegramMessageId}`;
  }

  return `${prefix}_${randomUUID()}`;
}

export function createFollowUpId(): string {
  return `fu_${randomUUID()}`;
}

export function createReportId(date: string): string {
  return `report_${date}_${randomUUID()}`;
}

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}
