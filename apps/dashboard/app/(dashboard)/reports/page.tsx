import { AnalyticsCharts } from "../../../components/charts";
import { ReportActions } from "../../../components/reportActions";
import { Card, DashboardDataError, Section } from "../../../components/ui";
import { getDashboardService } from "../../../lib/data";
import { classifyDashboardError } from "@smartflow/dashboard/errors";

export default async function ReportsPage() {
  const loaded = await getDashboardService()
    .getReportData()
    .then((report) => ({ ok: true as const, report }))
    .catch((error) => ({ ok: false as const, error }));

  if (!loaded.ok) {
    const error = classifyDashboardError(loaded.error);
    return (
      <DashboardDataError title={error.title} description={error.description} />
    );
  }

  const report = loaded.report;

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-ink">Intake reports</h1>
        <p className="mt-1 text-muted">
          Manager-friendly therapy inquiry summary and next-step
          recommendations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Total inquiries" value={report.summary.totalLeads} />
        <Card title="Urgent" value={report.summary.hotLeads} tone="hot" />
        <Card title="Follow-up" value={report.summary.warmLeads} tone="warm" />
        <Card
          title="Pending follow-ups"
          value={report.summary.pendingFollowUps}
        />
      </div>

      <Section
        title="Owner report"
        action={<ReportActions reportText={report.reportText} />}
      >
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
