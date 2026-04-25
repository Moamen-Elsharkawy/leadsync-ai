import Link from "next/link";
import { notFound } from "next/navigation";
import { Section, StatusBadge, formatDate } from "../../../../components/ui";
import { getDashboardService } from "../../../../lib/data";

export default async function LeadDetailsPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const resolvedParams = await params;
  const lead = await getDashboardService().getLeadById(
    decodeURIComponent(resolvedParams.leadId),
  );

  if (!lead) {
    notFound();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Lead details</h1>
          <p className="mt-1 text-muted">{lead.leadId}</p>
        </div>
        <Link href="/leads" className="text-sm font-medium text-brand">
          Back to all leads
        </Link>
      </div>

      <Section title="Lead quality summary">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-sm text-muted">Status</div>
            <div className="mt-2">
              <StatusBadge status={lead.status} />
            </div>
          </div>
          <Detail label="Lead score" value={String(lead.leadScore)} />
          <Detail label="Recommended next action" value={nextAction(lead.status)} />
        </div>
        <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-muted">
          Human-in-the-loop reminder: do not confirm appointments, discounts,
          final prices, or commitments before an admin reviews the lead.
        </p>
      </Section>

      <Section title="Full record">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(lead).map(([key, value]) => (
            <Detail key={key} label={key} value={formatValue(key, value)} />
          ))}
        </div>
      </Section>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 break-words text-sm text-ink">{value || "-"}</div>
    </div>
  );
}

function formatValue(key: string, value: unknown): string {
  if (key === "createdAt" || key === "updatedAt" || key === "nextFollowUpAt") {
    return typeof value === "string" ? formatDate(value) : "-";
  }

  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : JSON.stringify(value);
}

function nextAction(status: string): string {
  if (status === "Hot") {
    return "Call or message this lead first.";
  }

  if (status === "Warm") {
    return "Review missing data and follow up politely.";
  }

  return "Keep in CRM, but prioritize higher-intent leads.";
}
