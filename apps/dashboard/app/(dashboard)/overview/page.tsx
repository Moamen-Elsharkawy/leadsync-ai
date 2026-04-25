import { AnalyticsCharts } from "../../../components/charts";
import { Card, LeadsTable, Section } from "../../../components/ui";
import { getDashboardService } from "../../../lib/data";

export default async function OverviewPage() {
  const service = getDashboardService();
  const [summary, analytics, leads] = await Promise.all([
    service.getDashboardSummary(),
    service.getLeadAnalytics(),
    service.getLeads({ limit: 20 }),
  ]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-ink">Overview</h1>
        <p className="mt-1 text-muted">
          Live CRM analytics from Google Sheets through Apps Script.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Total leads" value={summary.totalLeads} />
        <Card title="Hot leads" value={summary.hotLeads} tone="hot" />
        <Card title="Warm leads" value={summary.warmLeads} tone="warm" />
        <Card title="Cold leads" value={summary.coldLeads} tone="cold" />
        <Card title="Pending follow-ups" value={summary.pendingFollowUps} />
        <Card title="Sent follow-ups" value={summary.sentFollowUps} />
        <Card
          title="Conversion rate"
          value={`${summary.conversionRate}%`}
          tone="good"
        />
        <Card title="Created today" value={summary.leadsCreatedToday} />
        <Card title="Created this week" value={summary.leadsCreatedThisWeek} />
        <Card title="Average lead score" value={summary.averageLeadScore} />
      </div>

      <AnalyticsCharts analytics={analytics} />

      <Section title="Latest leads">
        <LeadsTable leads={leads} />
      </Section>
    </>
  );
}
