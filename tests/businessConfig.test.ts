import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadBusinessConfigForPreset,
  resolveBusinessConfigPath,
} from "../src/config/businessConfig.js";
import { loadEnv } from "../src/config/env.js";

describe("businessConfig presets", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads the custom business config by default path", () => {
    expect(resolveBusinessConfigPath("custom")).toBe("config/business.json");
    expect(loadBusinessConfigForPreset("custom").businessName).toBe(
      "SmartFlow Demo Business",
    );
  });

  it("loads the dental clinic preset", () => {
    const config = loadBusinessConfigForPreset("dental-clinic");

    expect(resolveBusinessConfigPath("dental-clinic")).toBe(
      "config/examples/dental-clinic.json",
    );
    expect(config.businessName).toBe("Pearl Smile Dental Center");
    expect(config.services).toContain("زراعة الأسنان");
  });

  it("loads the online course preset", () => {
    const config = loadBusinessConfigForPreset("online-course");

    expect(resolveBusinessConfigPath("online-course")).toBe(
      "config/examples/online-course-business.json",
    );
    expect(config.businessName).toBe("SkillBridge Academy");
    expect(config.services).toContain("الاشتراك في كورس فردي");
  });

  it("fails env validation for invalid business presets", () => {
    stubRequiredEnv();
    vi.stubEnv("BUSINESS_PRESET", "invalid-preset");

    expect(() => loadEnv()).toThrow(/BUSINESS_PRESET/);
  });
});

function stubRequiredEnv(): void {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "123456:test-token");
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-v1-test");
  vi.stubEnv("OPENROUTER_MODEL", "openai/gpt-4o-mini");
  vi.stubEnv("OPENROUTER_SITE_URL", "http://localhost:3000");
  vi.stubEnv("OPENROUTER_APP_NAME", "SmartFlow Test");
  vi.stubEnv(
    "GOOGLE_SHEETS_WEBAPP_URL",
    "https://script.google.com/macros/s/test/exec",
  );
  vi.stubEnv("GOOGLE_SHEETS_WEBAPP_SECRET", "shared-secret-value");
  vi.stubEnv("ADMIN_PASSWORD", "admin-password");
  vi.stubEnv("ADMIN_PORT", "3000");
  vi.stubEnv("DEMO_MODE", "false");
  vi.stubEnv("BOT_MODE", "polling");
}
