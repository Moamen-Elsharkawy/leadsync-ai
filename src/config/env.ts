import "dotenv/config";
import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return value;
}, z.boolean());

const numberFromEnv = z.preprocess((value) => {
  if (typeof value === "string") {
    return Number(value);
  }

  return value;
}, z.number().int().positive());

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_MODEL: z.string().min(1),
  OPENROUTER_SITE_URL: z.string().url().default("http://localhost:3000"),
  OPENROUTER_APP_NAME: z
    .string()
    .min(1)
    .default("SmartFlow AI Telegram Sales Agent"),
  OPENROUTER_TIMEOUT_MS: numberFromEnv.default(12000),
  OPENROUTER_MAX_RETRIES: z
    .preprocess((value) => {
      if (typeof value === "string") {
        return Number(value);
      }

      return value;
    }, z.number().int().min(0))
    .default(1),
  ADMIN_TELEGRAM_ID: z.string().min(1).optional(),
  GOOGLE_SHEETS_WEBAPP_URL: z.string().url(),
  GOOGLE_SHEETS_WEBAPP_SECRET: z.string().min(12),
  ADMIN_PORT: numberFromEnv.default(3000),
  ADMIN_PASSWORD: z.string().min(8),
  DEMO_MODE: booleanFromEnv.default(false),
  BUSINESS_PRESET: z
    .enum(["custom", "dental-clinic", "online-course"])
    .default("custom"),
  BOT_MODE: z.enum(["polling", "webhook"]).default("polling"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${message}`);
  }

  return parsed.data;
}
