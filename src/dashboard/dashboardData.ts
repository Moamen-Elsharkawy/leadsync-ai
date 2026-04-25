import type {
  BusinessConfig,
  BusinessPreset,
} from "../config/businessConfig.js";
import type {
  DashboardDataResult,
  MessageFilters,
  SettingRecord,
  SheetsWebAppClient,
} from "../sheets/sheetsWebAppClient.js";
import type { LeadRecord } from "../types/lead.js";
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

export interface DashboardRuntimeConfig {
  demoMode: boolean;
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
  demoMode: boolean;
  botMode: string;
  storageArchitecture: string;
  aiProvider: string;
  setupChecklist: string[];
}

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
      demoMode: this.runtimeConfig.demoMode,
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

  getBusinessPreset(): BusinessPreset {
    return this.runtimeConfig.businessPreset;
  }

  getDemoMode(): boolean {
    return this.runtimeConfig.demoMode;
  }

  getDashboardData(): Promise<DashboardDataResult> {
    return this.sheets.getDashboardData();
  }

  seedDemoData() {
    return this.sheets.seedDemoData(this.runtimeConfig.businessPreset);
  }

  clearDemoData() {
    return this.sheets.clearDemoData();
  }
}
