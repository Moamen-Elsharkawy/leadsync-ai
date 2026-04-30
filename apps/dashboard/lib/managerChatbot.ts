import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  managerChatbotQuerySchema,
  type ManagerChatbotResponse,
} from "@smartflow/dashboard/managerChatbotService";
import { loadDashboardEnv } from "./serverEnv";

const chatbotResponseSchema = z.object({
  answer: z.string(),
  confidence: z.number(),
  refused: z.boolean(),
  refusalReason: z.string().nullable(),
  citations: z.array(
    z.object({
      dataset: z.enum(["leads", "followups", "messages", "report"]),
      detail: z.string(),
    }),
  ),
  provenance: z.object({
    source: z.literal("google-sheets-webapp-only"),
    datasetsUsed: z.array(z.enum(["leads", "followups", "messages", "report"])),
    generatedAt: z.string(),
    requestId: z.string(),
  }),
});

const chatbotErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});

export interface ManagerChatbotActionInput {
  question: string;
  locale?: "en" | "ar";
  sessionId: string;
}

export async function queryManagerChatbot(
  input: ManagerChatbotActionInput,
): Promise<ManagerChatbotResponse> {
  const env = loadDashboardEnv();
  const payload = managerChatbotQuerySchema.parse({
    question: input.question,
    locale: input.locale ?? "en",
    sessionId: input.sessionId,
    requestId: randomUUID(),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`http://127.0.0.1:${env.adminPort}/chatbot/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": env.adminPassword,
        "x-chatbot-session-id": payload.sessionId,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    const json = await response.json();
    if (!response.ok) {
      const parsedError = chatbotErrorSchema.safeParse(json);
      throw new Error(
        parsedError.success
          ? parsedError.data.error
          : "Chatbot request failed with invalid response.",
      );
    }

    return chatbotResponseSchema.parse(json);
  } finally {
    clearTimeout(timeout);
  }
}
