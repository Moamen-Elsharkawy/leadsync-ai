import { afterEach, describe, expect, it, vi } from "vitest";
import {
  safeTelegramReply,
  safeTelegramSendMessage,
} from "../src/utils/telegram.js";

describe("telegram safety helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the Telegram message id when a reply succeeds", async () => {
    const ctx = {
      reply: vi.fn().mockResolvedValue({ message_id: 42 }),
    };

    await expect(safeTelegramReply(ctx, "hello")).resolves.toEqual({
      ok: true,
      messageId: 42,
    });
  });

  it("logs and returns ok false when a reply fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ctx = {
      reply: vi
        .fn()
        .mockRejectedValue(new Error("bad token 123456789:telegramsecretabcd")),
    };

    await expect(safeTelegramReply(ctx, "hello")).resolves.toEqual({
      ok: false,
    });

    const logged = consoleSpy.mock.calls
      .map((call) => call.join(" "))
      .join(" ");
    expect(logged).not.toContain("telegramsecretabcd");
  });

  it("does not throw when sendMessage fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const sendMessage = vi.fn().mockRejectedValue(new Error("Telegram down"));

    await expect(
      safeTelegramSendMessage(sendMessage, "123", "hello"),
    ).resolves.toEqual({ ok: false });

    expect(consoleSpy).toHaveBeenCalled();
  });
});
