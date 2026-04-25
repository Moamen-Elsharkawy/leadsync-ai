import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOpenRouterClient } from "../src/ai/openRouterClient.js";
import type { Env } from "../src/config/env.js";

const openAiMocks = vi.hoisted(() => ({
  create: vi.fn(),
  constructor: vi.fn(),
}));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function mockOpenAI(config) {
    openAiMocks.constructor(config);
    return {
      chat: {
        completions: {
          create: openAiMocks.create,
        },
      },
    };
  }),
}));

const env: Env = {
  TELEGRAM_BOT_TOKEN: "telegram-token",
  OPENROUTER_API_KEY: "sk-or-v1-test-secret",
  OPENROUTER_MODEL: "test/model",
  OPENROUTER_SITE_URL: "http://localhost:3000",
  OPENROUTER_APP_NAME: "SmartFlow Test",
  ADMIN_TELEGRAM_ID: "123",
  GOOGLE_SHEETS_WEBAPP_URL: "https://script.google.com/macros/s/test/exec",
  GOOGLE_SHEETS_WEBAPP_SECRET: "shared-secret-value",
  ADMIN_PORT: 3000,
  ADMIN_PASSWORD: "admin-password",
  DEMO_MODE: false,
  BUSINESS_PRESET: "custom",
  BOT_MODE: "polling",
  OPENROUTER_TIMEOUT_MS: 1000,
  OPENROUTER_MAX_RETRIES: 1,
};

describe("openRouterClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("configures the OpenAI SDK for OpenRouter", () => {
    createOpenRouterClient(env);

    expect(openAiMocks.constructor).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: "sk-or-v1-test-secret",
        timeout: 1000,
        maxRetries: 0,
        defaultHeaders: {
          "HTTP-Referer": "http://localhost:3000",
          "X-OpenRouter-Title": "SmartFlow Test",
        },
      }),
    );
  });

  it("retries temporary failures before returning JSON", async () => {
    openAiMocks.create
      .mockRejectedValueOnce(
        Object.assign(new Error("temporary"), { status: 500 }),
      )
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{"ok":true}',
            },
          },
        ],
      });

    const client = createOpenRouterClient(env);
    const result = await client.generateJson("system", "user", "TestSchema");

    expect(openAiMocks.create).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      ok: true,
      schemaName: "TestSchema",
      data: { ok: true },
      source: "openrouter",
    });
  });

  it("returns a safe fallback when OpenRouter fails", async () => {
    openAiMocks.create.mockRejectedValue(
      Object.assign(new Error("bad key sk-or-v1-test-secret"), { status: 401 }),
    );

    const client = createOpenRouterClient(env);
    const result = await client.generateText("system", "user");

    expect(result.ok).toBe(false);
    expect(result.text).toBe("");
    expect(result.source).toBe("fallback");
    expect(result.error).not.toContain("sk-or-v1-test-secret");
  });

  it("returns a JSON fallback when the model response is not valid JSON", async () => {
    openAiMocks.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: "not json",
          },
        },
      ],
    });

    const client = createOpenRouterClient(env);
    const result = await client.generateJson("system", "user", "TestSchema");

    expect(result.ok).toBe(false);
    expect(result.data).toEqual({});
    expect(result.source).toBe("fallback");
  });
});
