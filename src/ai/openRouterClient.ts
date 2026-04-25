import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { Env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_TEMPERATURE = 0.2;

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  siteUrl?: string;
  appName?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface OpenRouterJsonResult {
  ok: boolean;
  schemaName: string;
  data: unknown;
  source: "openrouter" | "fallback";
  error?: string;
}

export interface OpenRouterTextResult {
  ok: boolean;
  text: string;
  source: "openrouter" | "fallback";
  error?: string;
}

export interface OpenRouterClient {
  generateJson(
    systemPrompt: string,
    userPrompt: string,
    schemaName: string,
  ): Promise<OpenRouterJsonResult>;
  generateText(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<OpenRouterTextResult>;
}

let defaultClient: OpenRouterClient | null = null;

export function createOpenRouterClient(env: Env): OpenRouterClient {
  return new DefaultOpenRouterClient({
    apiKey: env.OPENROUTER_API_KEY,
    model: env.OPENROUTER_MODEL,
    siteUrl: env.OPENROUTER_SITE_URL,
    appName: env.OPENROUTER_APP_NAME,
    timeoutMs: env.OPENROUTER_TIMEOUT_MS,
    maxRetries: env.OPENROUTER_MAX_RETRIES,
  });
}

export async function generateJson(
  systemPrompt: string,
  userPrompt: string,
  schemaName: string,
): Promise<OpenRouterJsonResult> {
  return getDefaultOpenRouterClient().generateJson(
    systemPrompt,
    userPrompt,
    schemaName,
  );
}

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
): Promise<OpenRouterTextResult> {
  return getDefaultOpenRouterClient().generateText(systemPrompt, userPrompt);
}

class DefaultOpenRouterClient implements OpenRouterClient {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly maxRetries: number;

  constructor(config: OpenRouterConfig) {
    this.model = config.model;
    this.maxRetries = Math.max(0, config.maxRetries ?? DEFAULT_MAX_RETRIES);
    this.client = new OpenAI({
      baseURL: OPENROUTER_BASE_URL,
      apiKey: config.apiKey,
      timeout: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRetries: 0,
      defaultHeaders: buildOpenRouterHeaders(config),
    });
  }

  async generateJson(
    systemPrompt: string,
    userPrompt: string,
    schemaName: string,
  ): Promise<OpenRouterJsonResult> {
    try {
      const content = await this.complete([
        {
          role: "system",
          content: `${systemPrompt}\nReturn only valid JSON for schema "${schemaName}".`,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ]);

      const parsed = parseJsonObject(content);

      if (!parsed.ok) {
        throw new Error(`OpenRouter returned invalid JSON for ${schemaName}.`);
      }

      return {
        ok: true,
        schemaName,
        data: parsed.data,
        source: "openrouter",
      };
    } catch (error) {
      logOpenRouterFailure("OpenRouter JSON generation failed", error, {
        schemaName,
      });
      return {
        ok: false,
        schemaName,
        data: {},
        source: "fallback",
        error: safeErrorMessage(error),
      };
    }
  }

  async generateText(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<OpenRouterTextResult> {
    try {
      const text = await this.complete([
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ]);

      return {
        ok: true,
        text,
        source: "openrouter",
      };
    } catch (error) {
      logOpenRouterFailure("OpenRouter text generation failed", error);
      return {
        ok: false,
        text: "",
        source: "fallback",
        error: safeErrorMessage(error),
      };
    }
  }

  private async complete(
    messages: ChatCompletionMessageParam[],
  ): Promise<string> {
    const attempts = this.maxRetries + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const completion = await this.client.chat.completions.create({
          model: this.model,
          temperature: DEFAULT_TEMPERATURE,
          messages,
        });
        const content = completion.choices[0]?.message?.content?.trim();

        if (!content) {
          throw new Error("OpenRouter returned an empty response.");
        }

        return content;
      } catch (error) {
        lastError = error;

        if (attempt >= attempts || !isRetryableOpenRouterError(error)) {
          break;
        }

        await delay(backoffMs(attempt));
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("OpenRouter request failed.");
  }
}

function getDefaultOpenRouterClient(): OpenRouterClient {
  if (!defaultClient) {
    defaultClient = new DefaultOpenRouterClient(readOpenRouterConfigFromEnv());
  }

  return defaultClient;
}

function readOpenRouterConfigFromEnv(): OpenRouterConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required.");
  }

  if (!model) {
    throw new Error("OPENROUTER_MODEL is required.");
  }

  return {
    apiKey,
    model,
    siteUrl: process.env.OPENROUTER_SITE_URL,
    appName: process.env.OPENROUTER_APP_NAME,
    timeoutMs: parsePositiveInteger(process.env.OPENROUTER_TIMEOUT_MS),
    maxRetries: parseNonNegativeInteger(process.env.OPENROUTER_MAX_RETRIES),
  };
}

function buildOpenRouterHeaders(
  config: OpenRouterConfig,
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (config.siteUrl) {
    headers["HTTP-Referer"] = config.siteUrl;
  }

  if (config.appName) {
    headers["X-OpenRouter-Title"] = config.appName;
  }

  return headers;
}

function parseJsonObject(content: string): { ok: boolean; data: unknown } {
  const stripped = content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return { ok: false, data: {} };
  }

  try {
    return { ok: true, data: JSON.parse(stripped.slice(start, end + 1)) };
  } catch {
    return { ok: false, data: {} };
  }
}

function isRetryableOpenRouterError(error: unknown): boolean {
  const status = getErrorStatus(error);

  if (status === undefined) {
    return true;
  }

  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const maybeStatus = "status" in error ? error.status : undefined;
  return typeof maybeStatus === "number" ? maybeStatus : undefined;
}

function safeErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "OpenRouter request failed.";
  return sanitizeSecrets(message);
}

function logOpenRouterFailure(
  message: string,
  error: unknown,
  meta?: Record<string, unknown>,
): void {
  logger.error(message, {
    ...meta,
    status: getErrorStatus(error),
    error: safeErrorMessage(error),
  });
}

function sanitizeSecrets(value: string): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  let sanitized = value.replace(/sk-or-v1-[A-Za-z0-9_-]+/g, "[redacted]");

  if (apiKey) {
    sanitized = sanitized.split(apiKey).join("[redacted]");
  }

  return sanitized;
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseNonNegativeInteger(
  value: string | undefined,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function backoffMs(attempt: number): number {
  return Math.min(250 * 2 ** (attempt - 1), 2000);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
