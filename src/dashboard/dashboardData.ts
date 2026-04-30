import type {
  BusinessConfig,
  BusinessPreset,
} from "../config/businessConfig.js";
import type {
  DashboardDataResult,
  AppsScriptDiagnosticsResult,
  MessageFilters,
  SettingRecord,
  SheetsWebAppClient,
} from "../sheets/sheetsWebAppClient.js";
import type { LeadRecord, LeadStage, LeadStatus } from "../types/lead.js";
import type { FollowUpRecord, MessageRecord } from "../types/message.js";
import {
  buildOwnerReportText,
  filterLeads,
  getBusinessRecommendation,
  getDashboardSummary,
  getLeadAnalytics,
  type DashboardSummary,
  type LeadAnalytics,
  type LeadFilters,
} from "./analytics.js";
import { classifyDashboardError, type DashboardErrorInfo } from "./errors.js";

export interface DashboardRuntimeConfig {
  businessPreset: BusinessPreset;
  botMode: string;
  envPresence: Record<string, boolean>;
  appsScriptConfigured: boolean;
  openRouterModelConfigured: boolean;
  telegramTokenConfigured: boolean;
}

export interface BusinessSettingsView {
  config: BusinessConfig;
  settingsSheet: SettingRecord[];
  editable: boolean;
  note: string;
}

export interface SystemHealthView {
  dashboardStatus: "healthy";
  envPresence: Record<string, boolean>;
  appsScriptWebAppConfigured: boolean;
  openRouterModelConfigured: boolean;
  telegramTokenConfigured: boolean;

  botMode: string;
  storageArchitecture: string;
  aiProvider: string;
  setupChecklist: string[];
}

export type AppsScriptDiagnosticsView =
  | { ok: true; data: AppsScriptDiagnosticsResult }
  | { ok: false; error: DashboardErrorInfo };

export interface DashboardReportData {
  summary: DashboardSummary;
  analytics: LeadAnalytics;
  reportText: string;
  recommendations: string[];
}

export class DashboardDataService {
  constructor(
    private readonly sheets: SheetsWebAppClient,
    private readonly businessConfig: BusinessConfig,
    private readonly runtimeConfig: DashboardRuntimeConfig,
  ) {}

  async getDashboardSummary(): Promise<DashboardSummary> {
    const [leads, followUps] = await Promise.all([
      this.sheets.listLeads(),
      this.sheets.listFollowUps(),
    ]);
    return getDashboardSummary(leads, followUps);
  }

  async getLeadAnalytics(): Promise<LeadAnalytics> {
    const [leads, followUps] = await Promise.all([
      this.sheets.listLeads(),
      this.sheets.listFollowUps(),
    ]);
    return getLeadAnalytics(leads, followUps);
  }

  async getLeads(filters: LeadFilters = {}): Promise<LeadRecord[]> {
    return filterLeads(await this.sheets.listLeads(), filters);
  }

  getLeadById(leadId: string): Promise<LeadRecord | null> {
    return this.sheets.getLead(leadId);
  }

  getMessages(filters: MessageFilters = {}): Promise<MessageRecord[]> {
    return this.sheets.listMessages(filters);
  }

  async getFollowUps(
    filters: {
      status?: FollowUpRecord["status"] | "all";
      leadId?: string;
    } = {},
  ): Promise<FollowUpRecord[]> {
    const followUps = await this.sheets.listFollowUps(
      filters.status && filters.status !== "all" ? filters.status : undefined,
    );

    return filters.leadId
      ? followUps.filter((followUp) => followUp.leadId === filters.leadId)
      : followUps;
  }

  async getReportData(): Promise<DashboardReportData> {
    const [leads, followUps] = await Promise.all([
      this.sheets.listLeads(),
      this.sheets.listFollowUps(),
    ]);
    const summary = getDashboardSummary(leads, followUps);
    const analytics = getLeadAnalytics(leads, followUps);

    return {
      summary,
      analytics,
      reportText: buildOwnerReportText(leads, followUps),
      recommendations: [getBusinessRecommendation(summary)],
    };
  }

  async getBusinessSettings(): Promise<BusinessSettingsView> {
    const settingsSheet = await this.sheets.listSettings().catch(() => []);

    return {
      config: this.businessConfig,
      settingsSheet,
      editable: false,
      note: "Editing settings from the dashboard can be added later.",
    };
  }

  getSystemHealth(): SystemHealthView {
    return {
      dashboardStatus: "healthy",
      envPresence: this.runtimeConfig.envPresence,
      appsScriptWebAppConfigured: this.runtimeConfig.appsScriptConfigured,
      openRouterModelConfigured: this.runtimeConfig.openRouterModelConfigured,
      telegramTokenConfigured: this.runtimeConfig.telegramTokenConfigured,

      botMode: this.runtimeConfig.botMode,
      storageArchitecture:
        "Google Sheets through the Google Apps Script Web App only",
      aiProvider: "OpenRouter through the official openai package",
      setupChecklist: [
        "Telegram bot token is configured",
        "OpenRouter key and model are configured",
        "Apps Script Web App URL and shared secret are configured",
        "Google Sheet tabs were created with npm run setup:sheets",
        "ADMIN_PASSWORD is configured for dashboard access",
      ],
    };
  }

  async getAppsScriptDiagnostics(): Promise<AppsScriptDiagnosticsView> {
    try {
      return { ok: true, data: await this.sheets.diagnostics() };
    } catch (error) {
      return { ok: false, error: classifyDashboardError(error) };
    }
  }

  getBusinessPreset(): BusinessPreset {
    return this.runtimeConfig.businessPreset;
  }



  getDashboardData(): Promise<DashboardDataResult> {
    return this.sheets.getDashboardData();
  }

  setupSheets() {
    return this.sheets.setupSheets();
  }

  async updateLeadAdminFields(
    leadId: string,
    patch: {
      status?: LeadStatus;
      stage?: LeadStage;
      notesToAppend?: string;
    },
  ): Promise<LeadRecord> {
    const lead = await this.sheets.getLead(leadId);

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    const notesToAppend = patch.notesToAppend?.trim();
    const updated: LeadRecord = {
      ...lead,
      status: patch.status ?? lead.status,
      stage: patch.stage ?? lead.stage,
      notes: notesToAppend
        ? [lead.notes, `Admin note: ${notesToAppend}`]
            .filter(Boolean)
            .join("\n")
        : lead.notes,
      updatedAt: new Date().toISOString(),
    };

    return this.sheets.upsertLead(updated);
  }

  async updateFollowUpStatus(
    followUpId: string,
    status: FollowUpRecord["status"],
  ): Promise<FollowUpRecord> {
    const followUps = await this.sheets.listFollowUps();
    const followUp = followUps.find((item) => item.followUpId === followUpId);

    if (!followUp) {
      throw new Error(`Follow-up not found: ${followUpId}`);
    }

    return this.sheets.updateFollowUp({
      ...followUp,
      status,
      sentAt: status === "sent" ? new Date().toISOString() : followUp.sentAt,
    });
  }

  seedDemoData() {
    return this.sheets.seedDemoData();
  }

  clearDemoData() {
    return this.sheets.clearDemoData();
  }
}
