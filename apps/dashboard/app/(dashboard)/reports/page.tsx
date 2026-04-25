import { AnalyticsCharts } from "../../../components/charts";
import { ReportActions } from "../../../components/reportActions";
import { Card, Section } from "../../../components/ui";
import { getDashboardService } from "../../../lib/data";

export default async function ReportsPage() {
  const report = await getDashboardService().getReportData();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-ink">Reports</h1>
        <p className="mt-1 text-muted">
          Client-friendly sales summary and recommendations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Total leads" value={report.summary.totalLeads} />
        <Card title="Hot" value={report.summary.hotLeads} tone="hot" />
        <Card title="Warm" value={report.summary.warmLeads} tone="warm" />
        <Card
          title="Pending follow-ups"
          value={report.summary.pendingFollowUps}
        />
      </div>

      <Section title="Owner report" action={<ReportActions reportText={report.reportText} />}>
        <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm text-ink">
          {report.reportText}
        </pre>
      </Section>

      <AnalyticsCharts analytics={report.analytics} />

      <Section title="Recommendations">
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink">
          {report.recommendations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>
    </>
  );
}
