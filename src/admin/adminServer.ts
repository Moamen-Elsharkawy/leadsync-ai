import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { z } from "zod";
import type { OpenRouterClient } from "../ai/openRouterClient.js";
import {
  ManagerChatbotService,
  managerChatbotQuerySchema,
} from "../dashboard/managerChatbotService.js";
import type { SheetsWebAppClient } from "../sheets/sheetsWebAppClient.js";
import type { FollowUpService } from "../services/followUpService.js";
import type { LeadService } from "../services/leadService.js";
import type { ReportService } from "../services/reportService.js";
import type { LeadRecord } from "../types/lead.js";
import { logger } from "../utils/logger.js";

const DASHBOARD_LEAD_LIMIT = 20;

export interface AdminServerDeps {
  port: number;
  password: string;
  sheets: SheetsWebAppClient;
  aiClient: OpenRouterClient;
  leadService: LeadService;
  followUpService: FollowUpService;
  reportService: ReportService;
}

const CHATBOT_WINDOW_MS = 60_000;
const CHATBOT_MAX_REQUESTS_PER_WINDOW = 20;
const chatbotRateLimitStore = new Map<string, number[]>();

class ChatbotRateLimitError extends Error {}

export async function startAdminServer(deps: AdminServerDeps): Promise<Server> {
  const app = createAdminApp(deps);
  const server = app.listen(deps.port);

  return new Promise<Server>((resolve, reject) => {
    server.once("listening", () => {
      logger.info(`Admin server listening on port ${deps.port}`);
      resolve(server);
    });

    server.once("error", (error) => {
      if (isAddressInUseError(error)) {
        logger.error(
          `Admin server port ${deps.port} is already in use. Stop the process using this port or set a different ADMIN_PORT in .env.`,
          { error },
        );
        reject(
          new Error(
            `Admin server failed to start: port ${deps.port} is already in use (EADDRINUSE).`,
          ),
        );
        return;
      }

      reject(error);
    });
  });
}

export function createAdminApp(deps: AdminServerDeps): Express {
  const app = express();
  app.use(express.json());
  const managerChatbot = new ManagerChatbotService({
    sheets: deps.sheets,
    aiClient: deps.aiClient,
  });

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-password"
    );
    if (req.method === "OPTIONS") {
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
      res.status(200).end();
      return;
    }
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "smartflow-admin",
      timestamp: new Date().toISOString(),
    });
  });

  app.use(requireAdminPassword(deps.password));

  app.get("/", (_req, res) => {
    res.json({ ok: true, message: "SmartFlow API" });
  });

  app.get(
    "/leads",
    asyncHandler(async (req, res) => {
      res.json(await deps.leadService.listLeads(getLimit(req, 50)));
    }),
  );

  app.get(
    "/leads/hot",
    asyncHandler(async (req, res) => {
      res.json(await deps.leadService.listHotLeads(getLimit(req, 50)));
    }),
  );

  app.get(
    "/leads/:id",
    asyncHandler(async (req, res) => {
      const lead = await findLead(deps.leadService, req.params.id);
      if (!lead) {
        res.status(404).json({ ok: false, error: "Lead not found" });
        return;
      }

      res.json(lead);
    }),
  );

  app.get(
    "/report",
    asyncHandler(async (_req, res) => {
      res.json(await deps.reportService.getSummary());
    }),
  );



  app.get(
    "/followups",
    asyncHandler(async (_req, res) => {
      res.json(await deps.followUpService.listFollowUps("pending"));
    }),
  );

  app.post(
    "/chatbot/query",
    asyncHandler(async (req, res) => {
      const sessionId = extractSessionId(req);
      enforceChatbotRateLimit(sessionId);

      const parsed = managerChatbotQuerySchema.parse({
        question: req.body?.question,
        locale: req.body?.locale,
        requestId:
          typeof req.body?.requestId === "string" && req.body.requestId.trim()
            ? req.body.requestId
            : randomUUID(),
        sessionId,
      });
      logger.info("Processing manager chatbot query", {
        requestId: parsed.requestId,
        sessionId: parsed.sessionId,
      });
      const response = await managerChatbot.query(parsed);
      logger.info("Completed manager chatbot query", {
        requestId: parsed.requestId,
        refused: response.refused,
        datasetsUsed: response.provenance.datasetsUsed,
      });
      res.json(response);
    }),
  );

  app.use(
    (
      error: unknown,
      _req: Request,
      res: Response,
      _next: NextFunction,
    ): void => {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          error: "Invalid chatbot query payload.",
          details: error.issues.map((issue) => issue.message),
        });
        return;
      }
      if (error instanceof ChatbotRateLimitError) {
        res.status(429).json({ ok: false, error: error.message });
        return;
      }
      logger.error("Admin server request failed", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    },
  );

  return app;
}

function extractSessionId(req: Request): string {
  const headerSessionId = req.header("x-chatbot-session-id");
  if (headerSessionId?.trim()) {
    return headerSessionId.trim();
  }
  return req.ip || "unknown-session";
}

function enforceChatbotRateLimit(sessionId: string): void {
  const now = Date.now();
  const existing = chatbotRateLimitStore.get(sessionId) ?? [];
  const recent = existing.filter((timestamp) => now - timestamp < CHATBOT_WINDOW_MS);
  recent.push(now);
  chatbotRateLimitStore.set(sessionId, recent);

  if (recent.length > CHATBOT_MAX_REQUESTS_PER_WINDOW) {
    throw new ChatbotRateLimitError(
      "Chatbot rate limit reached for this manager session. Please retry shortly.",
    );
  }
}

function requireAdminPassword(password: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const headerPassword = req.header("x-admin-password");
    const queryPassword =
      typeof req.query.password === "string" ? req.query.password : undefined;
    const authHeader = req.header("authorization");
    const basicPassword = parseBasicPassword(authHeader);

    if ([headerPassword, queryPassword, basicPassword].includes(password)) {
      next();
      return;
    }

    res.status(401).json({ ok: false, error: "Unauthorized" });
  };
}

function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
}

function parseBasicPassword(authHeader?: string): string | undefined {
  if (!authHeader?.startsWith("Basic ")) {
    return undefined;
  }

  const decoded = Buffer.from(
    authHeader.slice("Basic ".length),
    "base64",
  ).toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  return separatorIndex === -1 ? undefined : decoded.slice(separatorIndex + 1);
}

function getLimit(req: Request, fallback: number): number {
  const value =
    typeof req.query.limit === "string" ? Number(req.query.limit) : NaN;
  return Number.isInteger(value) && value > 0 ? Math.min(value, 100) : fallback;
}

async function findLead(
  leadService: LeadService,
  leadId: string | undefined,
): Promise<LeadRecord | null> {
  if (!leadId) {
    return null;
  }

  if (leadId.startsWith("lead_")) {
    return leadService.getLead(leadId);
  }

  return (
    (await leadService.getLead(`lead_${leadId}`)) ?? leadService.getLead(leadId)
  );
}

function isAddressInUseError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "EADDRINUSE"
  );
}


