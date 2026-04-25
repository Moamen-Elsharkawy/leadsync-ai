import { logger } from "./logger.js";

export interface TelegramSendResult {
  ok: boolean;
  messageId?: number;
}

export interface ReplyLike {
  reply(text: string): Promise<unknown>;
}

export type SendMessageLike = (
  chatId: string | number,
  text: string,
) => Promise<unknown>;

export async function safeTelegramReply(
  ctx: ReplyLike,
  text: string,
  meta?: Record<string, unknown>,
): Promise<TelegramSendResult> {
  try {
    const message = await ctx.reply(text);
    return { ok: true, messageId: extractMessageId(message) };
  } catch (error) {
    logger.error("Telegram reply failed", { ...meta, error });
    return { ok: false };
  }
}

export async function safeTelegramSendMessage(
  sendMessage: SendMessageLike,
  chatId: string | number,
  text: string,
  meta?: Record<string, unknown>,
): Promise<TelegramSendResult> {
  try {
    const message = await sendMessage(chatId, text);
    return { ok: true, messageId: extractMessageId(message) };
  } catch (error) {
    logger.error("Telegram sendMessage failed", { ...meta, chatId, error });
    return { ok: false };
  }
}

function extractMessageId(message: unknown): number | undefined {
  if (
    typeof message === "object" &&
    message !== null &&
    "message_id" in message &&
    typeof message.message_id === "number"
  ) {
    return message.message_id;
  }

  return undefined;
}
