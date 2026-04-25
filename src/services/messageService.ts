import type { SheetsWebAppClient } from "../sheets/sheetsWebAppClient.js";
import type { MessageDirection, MessageRecord } from "../types/message.js";
import { nowIso } from "../utils/date.js";
import { createMessageId } from "../utils/id.js";

export class MessageService {
  constructor(private readonly sheets: SheetsWebAppClient) {}

  appendMessage(input: {
    leadId: string;
    telegramUserId: string;
    direction: MessageDirection;
    text: string;
    telegramMessageId?: number;
  }): Promise<MessageRecord> {
    const message: MessageRecord = {
      messageId: createMessageId(input.direction, input.telegramMessageId),
      leadId: input.leadId,
      telegramUserId: input.telegramUserId,
      direction: input.direction,
      text: input.text,
      createdAt: nowIso(),
    };

    return this.sheets.appendMessage(message);
  }
}
