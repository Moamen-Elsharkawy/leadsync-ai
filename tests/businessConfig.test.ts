import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadBusinessConfigForPreset,
  resolveBusinessConfigPath,
} from "../src/config/businessConfig.js";
import { loadEnv } from "../src/config/env.js";

describe("physical therapy business config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads MoveWell as the only supported business version", () => {
    const config = loadBusinessConfigForPreset("physical-therapy");

    expect(resolveBusinessConfigPath("physical-therapy")).toBe(
      "config/business.json",
    );
    expect(config.businessName).toBe("MoveWell Physical Therapy Centers");
    expect(config.businessType).toBe("physical therapy center");
    expect(config.branches).toEqual([
      "Nasr City Branch",
      "Maadi Branch",
      "New Cairo Branch",
    ]);
    expect(config.services).toContain("Back pain physiotherapy");
    expect(config.forbiddenClaims).toContain(
      "Do not diagnose any medical condition or suggest exercises or medications.",
    );
  });

  it("fails env validation for unsupported business values", () => {
    stubRequiredEnv();
    vi.stubEnv("BUSINESS_PRESET", "invalid-business");

    expect(() => loadEnv()).toThrow(/BUSINESS_PRESET/);
  });

  it("accepts physical therapy env configuration", () => {
    stubRequiredEnv();
    vi.stubEnv("BUSINESS_PRESET", "physical-therapy");

    expect(loadEnv().BUSINESS_PRESET).toBe("physical-therapy");
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
  vi.stubEnv("BOT_MODE", "polling");
}
