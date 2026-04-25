import type { SheetsWebAppClient } from "../sheets/sheetsWebAppClient.js";
import type { ReportRecord } from "../types/message.js";
import { nowIso, todayIsoDate } from "../utils/date.js";
import { createReportId } from "../utils/id.js";

export class ReportService {
  constructor(private readonly sheets: SheetsWebAppClient) {}

  getSummary() {
    return this.sheets.getReportSummary();
  }

  async appendDailySnapshot(): Promise<ReportRecord> {
    const summary = await this.sheets.getReportSummary();
    const report: ReportRecord = {
      reportId: createReportId(todayIsoDate()),
      reportDate: todayIsoDate(),
      totalLeads: summary.totalLeads,
      hotLeads: summary.hotLeads,
      warmLeads: summary.warmLeads,
      coldLeads: summary.coldLeads,
      conversionSummaryJson: JSON.stringify(summary),
      createdAt: nowIso(),
    };

    return this.sheets.appendReport(report);
  }
}
