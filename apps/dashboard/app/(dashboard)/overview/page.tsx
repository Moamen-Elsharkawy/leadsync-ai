import { AnalyticsCharts } from "../../../components/charts";
import {
  Card,
  DashboardDataError,
  LeadsTable,
  Section,
} from "../../../components/ui";
import { getDashboardService } from "../../../lib/data";
import { classifyDashboardError } from "@smartflow/dashboard/errors";

export default async function OverviewPage() {
  const service = getDashboardService();
  const loaded = await Promise.all([
    service.getDashboardSummary(),
    service.getLeadAnalytics(),
    service.getLeads({ limit: 20 }),
  ])
    .then(([summary, analytics, leads]) => ({
      ok: true as const,
      summary,
      analytics,
      leads,
    }))
    .catch((error) => ({ ok: false as const, error }));

  if (!loaded.ok) {
    const error = classifyDashboardError(loaded.error);
    return (
      <DashboardDataError title={error.title} description={error.description} />
    );
  }

  const { summary, analytics, leads } = loaded;

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          Intake pipeline overview
        </h1>
        <p className="mt-1 text-muted">
          MoveWell inquiry analytics from Google Sheets through Apps Script.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Total Inquiries" value={summary.totalLeads} />
        <Card title="Urgent (Hot)" value={summary.hotLeads} tone="hot" />
        <Card title="Follow-up (Warm)" value={summary.warmLeads} tone="warm" />
        <Card title="Low Priority (Cold)" value={summary.coldLeads} tone="cold" />
        <Card title="Created Today" value={summary.leadsCreatedToday} />
        <Card title="Pending Follow-ups" value={summary.pendingFollowUps} />
      </div>

      <AnalyticsCharts analytics={analytics} />

      <Section title="Latest intake leads">
        <LeadsTable leads={leads} />
      </Section>
    </>
  );
}
