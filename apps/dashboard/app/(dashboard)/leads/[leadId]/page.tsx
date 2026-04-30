import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DashboardDataError,
  Section,
  StatusBadge,
  formatDate,
} from "../../../../components/ui";
import { updateLeadAction } from "../../../actions";
import { getDashboardService } from "../../../../lib/data";
import { classifyDashboardError } from "@smartflow/dashboard/errors";

export default async function LeadDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const resolvedParams = await params;
  const query = await searchParams;
  const loaded = await getDashboardService()
    .getLeadById(decodeURIComponent(resolvedParams.leadId))
    .then((lead) => ({ ok: true as const, lead }))
    .catch((error) => ({ ok: false as const, error }));

  if (!loaded.ok) {
    const error = classifyDashboardError(loaded.error);
    return (
      <DashboardDataError title={error.title} description={error.description} />
    );
  }

  const lead = loaded.lead;

  if (!lead) {
    notFound();
  }

  const visibleLeadEntries = Object.entries(lead).filter(
    ([key]) => key !== "budget",
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            Intake lead details
          </h1>
          <p className="mt-1 text-muted">{lead.leadId}</p>
        </div>
        <Link href="/leads" className="text-sm font-medium text-brand">
          Back to intake leads
        </Link>
      </div>

      {query.updated ? (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Lead updated from the dashboard.
        </div>
      ) : null}

      <Section title="Intake quality summary">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-sm text-muted">Status</div>
            <div className="mt-2">
              <StatusBadge status={lead.status} />
            </div>
          </div>
          <Detail label="Lead score" value={String(lead.leadScore)} />
          <Detail
            label="Recommended next action"
            value={nextAction(lead.status)}
          />
        </div>
        <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-muted">
          Human-in-the-loop reminder: do not diagnose, give treatment advice,
          estimate session counts, quote final prices, or confirm appointments
          before the team reviews the lead.
        </p>
      </Section>

      <Section title="Admin controls">
        <form action={updateLeadAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="leadId" value={lead.leadId} />
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ink">Status</span>
            <select
              name="status"
              defaultValue={lead.status}
              className="w-full rounded-md border border-line px-3 py-2"
            >
              <option value="Hot">Hot</option>
              <option value="Warm">Warm</option>
              <option value="Cold">Cold</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ink">Stage</span>
            <select
              name="stage"
              defaultValue={lead.stage}
              className="w-full rounded-md border border-line px-3 py-2"
            >
              <option value="new">New</option>
              <option value="qualifying">Qualifying</option>
              <option value="qualified">Qualified</option>
              <option value="follow_up">Follow-up</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-ink">Admin note</span>
            <textarea
              name="notesToAppend"
              rows={3}
              placeholder="Add a manager note for the intake team. This appends to the lead notes."
              className="w-full rounded-md border border-line px-3 py-2"
            />
          </label>
          <div className="md:col-span-2">
            <button className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white">
              Save lead changes
            </button>
          </div>
        </form>
      </Section>

      <Section title="Full record">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleLeadEntries.map(([key, value]) => (
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

  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
    ? String(value)
    : JSON.stringify(value);
}

function nextAction(status: string): string {
  if (status === "Hot") {
    return "Call this urgent inquiry first and confirm branch/timing with the customer.";
  }

  if (status === "Warm") {
    return "Review missing intake data and follow up politely.";
  }

  return "Keep in CRM, but prioritize urgent and follow-up inquiries first.";
}
