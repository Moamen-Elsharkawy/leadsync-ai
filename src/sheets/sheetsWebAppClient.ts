import { z } from "zod";
import type { ZodError } from "zod";
import { logger } from "../utils/logger.js";
import type { LeadRecord } from "../types/lead.js";
import type { SessionRecord } from "../types/session.js";
import type {
  FollowUpRecord,
  MessageRecord,
  ReportRecord,
} from "../types/message.js";
import type { BusinessPreset } from "../config/businessConfig.js";

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 2;

export type SheetsAction =
  | "initSecret"
  | "setup"
  | "appendMessage"
  | "upsertSession"
  | "getSession"
  | "upsertLead"
  | "getLead"
  | "listLeads"
  | "listHotLeads"
  | "listWarmLeads"
  | "listColdLeads"
  | "listMessages"
  | "listMessagesByLead"
  | "listMessagesByTelegramUser"
  | "appendFollowUp"
  | "listFollowUps"
  | "listSettings"
  | "upsertSetting"
  | "getDashboardData"
  | "updateFollowUp"
  | "appendReport"
  | "getReportSummary"
  | "seedDemoData"
  | "clearDemoData";

export interface SheetsWebAppClientOptions {
  webAppUrl: string;
  secret: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface SetupSheetsResult {
  tabs: string[];
  preservedExistingData?: boolean;
}

export interface InitSecretResult {
  initialized: boolean;
  propertyKey?: string;
}

export interface ReportSummary {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  demoLeads?: number;
  latestReport?: ReportRecord;
}

export interface SeedDemoDataResult {
  seeded: boolean;
  preset?: BusinessPreset | "custom";
  createdLeads?: number;
  createdMessages?: number;
}

export interface ClearDemoDataResult {
  cleared: boolean;
  deletedRows?: number;
}

export interface MessageFilters {
  leadId?: string;
  telegramUserId?: string;
}

export interface SettingRecord {
  key: string;
  value: string;
}

export interface DashboardDataResult {
  leads: LeadRecord[];
  messages: MessageRecord[];
  followUps: FollowUpRecord[];
  reports: ReportRecord[];
  settings: SettingRecord[];
  summary: ReportSummary;
}

interface SheetsRequestBody {
  action: SheetsAction;
  secret: string;
  payload: Record<string, unknown>;
}

interface SheetsError extends Error {
  status?: number;
  code?: string;
}

const envSchema = z.object({
  GOOGLE_SHEETS_WEBAPP_URL: z.string().url(),
  GOOGLE_SHEETS_WEBAPP_SECRET: z.string().min(12),
});

const responseEnvelopeSchema = z.union([
  z.object({
    ok: z.literal(true),
    data: z.unknown(),
  }),
  z.object({
    ok: z.literal(false),
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
    }),
  }),
]);

const setupSheetsResultSchema = z.object({
  tabs: z.array(z.string()),
  preservedExistingData: z.boolean().optional(),
});
const initSecretResultSchema = z.object({
  initialized: z.boolean(),
  propertyKey: z.string().optional(),
});
const reportSummarySchema = z.object({
  totalLeads: z.number(),
  hotLeads: z.number(),
  warmLeads: z.number(),
  coldLeads: z.number(),
  demoLeads: z.number().optional(),
  latestReport: z.unknown().optional(),
});
const seedDemoDataResultSchema = z.object({
  seeded: z.boolean(),
  preset: z
    .enum(["custom", "dental-clinic", "online-course", "physical-therapy"])
    .optional(),
  createdLeads: z.number().optional(),
  createdMessages: z.number().optional(),
});
const clearDemoDataResultSchema = z.object({
  cleared: z.boolean(),
  deletedRows: z.number().optional(),
});
const settingSchema = z.object({
  key: z.string(),
  value: z.string(),
});
const dashboardDataResultSchema = z.object({
  leads: z.array(objectSchema<LeadRecord>()),
  messages: z.array(objectSchema<MessageRecord>()),
  followUps: z.array(objectSchema<FollowUpRecord>()),
  reports: z.array(objectSchema<ReportRecord>()),
  settings: z.array(settingSchema),
  summary: reportSummarySchema,
});

export class SheetsWebAppClient {
  private readonly webAppUrl: string;
  private readonly secret: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(
    optionsOrUrl: SheetsWebAppClientOptions | string,
    secret?: string,
    fetchImpl?: typeof fetch,
  ) {
    const options =
      typeof optionsOrUrl === "string"
        ? { webAppUrl: optionsOrUrl, secret: secret ?? "", fetchImpl }
        : optionsOrUrl;

    this.webAppUrl = options.webAppUrl;
    this.secret = options.secret;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    if (!this.webAppUrl) {
      throw new Error("GOOGLE_SHEETS_WEBAPP_URL is required.");
    }

    if (!this.secret) {
      throw new Error("GOOGLE_SHEETS_WEBAPP_SECRET is required.");
    }
  }

  static fromEnv(fetchImpl?: typeof fetch): SheetsWebAppClient {
    return createSheetsWebAppClientFromEnv(fetchImpl);
  }

  initSecret(): Promise<InitSecretResult> {
    return this.request("initSecret", {}, initSecretResultSchema);
  }

  setupSheets(): Promise<SetupSheetsResult> {
    return this.request("setup", {}, setupSheetsResultSchema);
  }

  setup(): Promise<SetupSheetsResult> {
    return this.setupSheets();
  }

  appendMessage(message: MessageRecord): Promise<MessageRecord> {
    return this.request(
      "appendMessage",
      { message },
      objectSchema<MessageRecord>(),
    );
  }

  getSession(telegramUserId: string): Promise<SessionRecord | null> {
    return this.requestNullable(
      "getSession",
      { telegramUserId },
      objectSchema<SessionRecord>(),
    );
  }

  upsertSession(session: SessionRecord): Promise<SessionRecord> {
    return this.request(
      "upsertSession",
      { session },
      objectSchema<SessionRecord>(),
    );
  }

  upsertLead(lead: LeadRecord): Promise<LeadRecord> {
    return this.request("upsertLead", { lead }, objectSchema<LeadRecord>());
  }

  getLead(leadId: string): Promise<LeadRecord | null> {
    return this.requestNullable(
      "getLead",
      { leadId },
      objectSchema<LeadRecord>(),
    );
  }

  listLeads(limit?: number): Promise<LeadRecord[]> {
    return this.requestList("listLeads", { limit }, limit);
  }

  listHotLeads(limit?: number): Promise<LeadRecord[]> {
    return this.requestList("listHotLeads", { limit }, limit);
  }

  listWarmLeads(limit?: number): Promise<LeadRecord[]> {
    return this.requestList("listWarmLeads", { limit }, limit);
  }

  listColdLeads(limit?: number): Promise<LeadRecord[]> {
    return this.requestList("listColdLeads", { limit }, limit);
  }

  listMessages(filters: MessageFilters = {}): Promise<MessageRecord[]> {
    return this.request(
      "listMessages",
      { ...filters },
      z.array(objectSchema<MessageRecord>()),
    );
  }

  appendFollowUp(followUp: FollowUpRecord): Promise<FollowUpRecord> {
    return this.request(
      "appendFollowUp",
      { followUp },
      objectSchema<FollowUpRecord>(),
    );
  }

  listFollowUps(status?: FollowUpRecord["status"]): Promise<FollowUpRecord[]> {
    return this.request(
      "listFollowUps",
      { status },
      z.array(objectSchema<FollowUpRecord>()),
    );
  }

  listSettings(): Promise<SettingRecord[]> {
    return this.request("listSettings", {}, z.array(settingSchema));
  }

  upsertSetting(setting: SettingRecord): Promise<SettingRecord> {
    return this.request("upsertSetting", { ...setting }, settingSchema);
  }

  getDashboardData(): Promise<DashboardDataResult> {
    return this.request("getDashboardData", {}, dashboardDataResultSchema).then(
      (data) => data as DashboardDataResult,
    );
  }

  updateFollowUp(followUp: FollowUpRecord): Promise<FollowUpRecord> {
    return this.request(
      "updateFollowUp",
      { followUpId: followUp.followUpId, patch: followUp },
      objectSchema<FollowUpRecord>(),
    );
  }

  appendReport(report: ReportRecord): Promise<ReportRecord> {
    return this.request(
      "appendReport",
      { report },
      objectSchema<ReportRecord>(),
    );
  }

  getReportSummary(): Promise<ReportSummary> {
    return this.request("getReportSummary", {}, reportSummarySchema).then(
      (summary) => summary as ReportSummary,
    );
  }

  seedDemoData(preset?: BusinessPreset): Promise<SeedDemoDataResult> {
    return this.request(
      "seedDemoData",
      preset ? { preset } : {},
      seedDemoDataResultSchema,
    );
  }

  clearDemoData(): Promise<ClearDemoDataResult> {
    return this.request("clearDemoData", {}, clearDemoDataResultSchema);
  }

  async request<T>(
    action: SheetsAction,
    payload: Record<string, unknown> = {},
    schema?: z.ZodType<T>,
  ): Promise<T> {
    const data = await this.post(action, payload);
    return schema ? schema.parse(data) : (data as T);
  }

  private async requestNullable<T>(
    action: SheetsAction,
    payload: Record<string, unknown>,
    schema: z.ZodType<T>,
  ): Promise<T | null> {
    const data = await this.post(action, payload);
    if (data === null) {
      return null;
    }

    return schema.parse(data);
  }

  private async requestList(
    action: Extract<
      SheetsAction,
      "listLeads" | "listHotLeads" | "listWarmLeads" | "listColdLeads"
    >,
    payload: Record<string, unknown>,
    limit?: number,
  ): Promise<LeadRecord[]> {
    const leads = await this.request(
      action,
      payload,
      z.array(objectSchema<LeadRecord>()),
    );
    return applyLimit(leads, limit);
  }

  private async post(
    action: SheetsAction,
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    const requestBody: SheetsRequestBody = {
      action,
      secret: this.secret,
      payload,
    };
    const attempts = this.maxRetries + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.sendOnce(requestBody);
      } catch (error) {
        lastError = error;

        if (attempt >= attempts || !isTemporaryError(error)) {
          this.logFailure(action, error, attempt);
          break;
        }

        this.logFailure(action, error, attempt, true);
        await delay(backoffMs(attempt));
      }
    }

    throw createSheetsError(
      sanitizeSecret(toError(lastError).message, this.secret),
      getErrorStatus(lastError),
      getErrorCode(lastError),
    );
  }

  private async sendOnce(requestBody: SheetsRequestBody): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const response = await this.fetchImpl(this.webAppUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw createSheetsError(
          `Apps Script request failed with HTTP ${response.status}.`,
          response.status,
        );
      }

      const json = parseResponseEnvelope(await response.json());

      if (!json.ok) {
        throw createSheetsError(
          formatAppsScriptError(json.error.message, json.error.code),
          undefined,
          json.error.code,
        );
      }

      return json.data;
    } catch (error) {
      if (isAbortError(error)) {
        throw createSheetsError(
          `Apps Script request timed out after ${this.timeoutMs}ms.`,
          408,
          "TIMEOUT",
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private logFailure(
    action: SheetsAction,
    error: unknown,
    attempt: number,
    willRetry = false,
  ): void {
    logger.error("Google Apps Script request failed", {
      action,
      attempt,
      willRetry,
      status: getErrorStatus(error),
      code: getErrorCode(error),
      error: sanitizeSecret(toError(error).message, this.secret),
    });
  }
}

export function createSheetsWebAppClientFromEnv(
  fetchImpl?: typeof fetch,
): SheetsWebAppClient {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid Google Sheets Web App configuration: ${message}`);
  }

  return new SheetsWebAppClient({
    webAppUrl: parsed.data.GOOGLE_SHEETS_WEBAPP_URL,
    secret: parsed.data.GOOGLE_SHEETS_WEBAPP_SECRET,
    fetchImpl,
  });
}

function objectSchema<T>(): z.ZodType<T> {
  return z.record(z.string(), z.unknown()) as z.ZodType<T>;
}

function applyLimit<T>(items: T[], limit?: number): T[] {
  if (!limit || limit < 1) {
    return items;
  }

  return items.slice(0, limit);
}

function isTemporaryError(error: unknown): boolean {
  const status = getErrorStatus(error);
  const code = getErrorCode(error);

  if (
    code &&
    !["TIMEOUT", "TEMPORARY_ERROR", "RATE_LIMITED", "SERVER_ERROR"].includes(
      code,
    )
  ) {
    return false;
  }

  if (status === undefined) {
    return true;
  }

  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function getErrorStatus(error: unknown): number | undefined {
  return isErrorObject(error) && typeof error.status === "number"
    ? error.status
    : undefined;
}

function getErrorCode(error: unknown): string | undefined {
  return isErrorObject(error) && typeof error.code === "string"
    ? error.code
    : undefined;
}

function isErrorObject(error: unknown): error is SheetsError {
  return typeof error === "object" && error !== null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function parseResponseEnvelope(
  data: unknown,
): z.infer<typeof responseEnvelopeSchema> {
  const parsed = responseEnvelopeSchema.safeParse(data);

  if (!parsed.success) {
    throw createSheetsError(
      `Apps Script returned an invalid response: ${formatZodError(parsed.error)}.`,
      undefined,
      "INVALID_RESPONSE",
    );
  }

  return parsed.data;
}

function createSheetsError(
  message: string,
  status?: number,
  code?: string,
): SheetsError {
  const error = new Error(message) as SheetsError;
  error.status = status;
  error.code = code;
  return error;
}

function formatAppsScriptError(message: string, code?: string): string {
  if (code === "INVALID_SECRET") {
    return "Invalid Google Apps Script secret. Check that GOOGLE_SHEETS_WEBAPP_SECRET matches SMARTFLOW_SECRET in Apps Script Properties.";
  }

  if (code === "SECRET_NOT_INITIALIZED") {
    return "Google Apps Script secret is not initialized. Run npm run init:secret after deploying the Web App.";
  }

  if (code === "SECRET_ALREADY_SET") {
    return "Google Apps Script secret is already initialized. Use the existing GOOGLE_SHEETS_WEBAPP_SECRET or delete SMARTFLOW_SECRET in Apps Script Properties before reinitializing.";
  }

  return message;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function sanitizeSecret(value: string, secret: string): string {
  return secret ? value.split(secret).join("[redacted]") : value;
}

function backoffMs(attempt: number): number {
  return Math.min(250 * 2 ** (attempt - 1), 2000);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "response"}: ${issue.message}`)
    .join("; ");
}
