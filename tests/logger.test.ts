import { afterEach, describe, expect, it, vi } from "vitest";
import { logger, redactSecrets, sanitizeForLog } from "../src/utils/logger.js";

describe("logger", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("redacts known secret formats and env secrets", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-v1-secretvalue1234");
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123456789:telegramsecretabcd");
    vi.stubEnv("GOOGLE_SHEETS_WEBAPP_SECRET", "sheet-secret-1234");
    vi.stubEnv("ADMIN_PASSWORD", "admin-password-1234");

    const redacted = redactSecrets(
      [
        "sk-or-v1-secretvalue1234",
        "123456789:telegramsecretabcd",
        "sheet-secret-1234",
        "admin-password-1234",
        "https://user:password@example.com/path",
      ].join(" "),
    );

    expect(redacted).not.toContain("sk-or-v1-secretvalue1234");
    expect(redacted).not.toContain("telegramsecretabcd");
    expect(redacted).not.toContain("sheet-secret-1234");
    expect(redacted).not.toContain("admin-password-1234");
    expect(redacted).not.toContain("user:password@");
    expect(redacted).toContain("sk-or-v1-****1234");
    expect(redacted).toContain("123456789:****abcd");
  });

  it("sanitizes nested metadata and Error objects before logging", () => {
    vi.stubEnv("GOOGLE_SHEETS_WEBAPP_SECRET", "sheet-secret-1234");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("Request failed sheet-secret-1234", {
      secret: "sheet-secret-1234",
      nested: { token: "123456789:telegramsecretabcd" },
      error: new Error("bad sheet-secret-1234"),
    });

    const logged = consoleSpy.mock.calls
      .map((call) => call.join(" "))
      .join(" ");

    expect(logged).not.toContain("sheet-secret-1234");
    expect(logged).not.toContain("telegramsecretabcd");
    expect(logged).toContain("****1234");
  });

  it("handles circular metadata safely", () => {
    const value: Record<string, unknown> = {};
    value.self = value;

    expect(sanitizeForLog(value)).toEqual({ self: "[Circular]" });
  });
});
