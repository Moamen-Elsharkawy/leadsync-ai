import { isDataExfiltrationRequest } from "../ai/replyGenerator.js";

export type ConversationPolicyDecision =
  | { action: "safe-refusal"; reply: string }
  | { action: "greeting"; reply: string }
  | { action: "continue" };

const SAFE_REFUSAL_REPLY =
  "أفهم طلبك، لكن لا يمكنني مشاركة أي بيانات داخلية أو محادثات عملاء أو إعدادات أو أسرار خاصة بالنظام. أقدر أساعدك فقط في تسجيل استفسار علاج طبيعي وتوجيهه لفريق الاستقبال.";

const GREETING_REPLY =
  "أهلا وسهلا بك في MoveWell لمراكز العلاج الطبيعي! 👋\nأقدر أساعدك في حجز جلسة أو الاستفسار عن خدماتنا. تحب تبدأ بإيه؟";

const GREETING_PATTERNS =
  /^(?:مرحبا|مرحبًا|السلام عليكم|السلام|سلام|اهلا|أهلا|هاي|هلو|hello|hi|hey|good morning|good evening|صباح الخير|مساء الخير|يا هلا|هلا)[\s!.؟?]*$/iu;

/**
 * Tracks recent message timestamps per user for flood detection.
 * Key: telegramUserId, Value: array of timestamps (ms).
 */
const userMessageTimestamps = new Map<string, number[]>();
const FLOOD_WINDOW_MS = 10_000;
const FLOOD_MAX_MESSAGES = 5;

export function decideConversationPolicy(
  latestCustomerMessage: string,
  telegramUserId?: string,
  options?: { allowGreeting?: boolean },
): ConversationPolicyDecision {
  if (isDataExfiltrationRequest(latestCustomerMessage)) {
    return { action: "safe-refusal", reply: SAFE_REFUSAL_REPLY };
  }

  // Flood protection: if the user sent too many messages in the window, ignore
  if (telegramUserId && isFlooding(telegramUserId)) {
    return {
      action: "safe-refusal",
      reply: "من فضلك استنى لحظة عشان نقدر نرد عليك بشكل أفضل.",
    };
  }

  // Greeting detection: respond warmly to simple greetings
  if (
    (options?.allowGreeting ?? true) &&
    GREETING_PATTERNS.test(latestCustomerMessage.trim())
  ) {
    return { action: "greeting", reply: GREETING_REPLY };
  }

  return { action: "continue" };
}

function isFlooding(telegramUserId: string): boolean {
  const now = Date.now();
  const timestamps = userMessageTimestamps.get(telegramUserId) ?? [];

  // Remove timestamps outside the window
  const recent = timestamps.filter((ts) => now - ts < FLOOD_WINDOW_MS);
  recent.push(now);
  userMessageTimestamps.set(telegramUserId, recent);

  // Clean up old entries periodically (prevent memory leak)
  if (userMessageTimestamps.size > 10_000) {
    for (const [uid, ts] of userMessageTimestamps) {
      if (ts.every((t) => now - t > FLOOD_WINDOW_MS * 2)) {
        userMessageTimestamps.delete(uid);
      }
    }
  }

  return recent.length > FLOOD_MAX_MESSAGES;
}
