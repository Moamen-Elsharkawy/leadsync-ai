import Link from "next/link";
import type { LeadRecord, LeadStatus } from "@smartflow/types/lead";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Card({
  title,
  value,
  note,
  tone = "default",
}: {
  title: string;
  value: string | number;
  note?: string;
  tone?: "default" | "hot" | "warm" | "cold" | "good";
}) {
  const toneClass =
    tone === "hot"
      ? "text-hot"
      : tone === "warm"
        ? "text-warm"
        : tone === "cold"
          ? "text-cold"
          : tone === "good"
            ? "text-brand"
            : "text-ink";

  return (
    <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
      <div className="text-sm text-muted">{title}</div>
      <div className={`mt-2 text-3xl font-semibold ${toneClass}`}>{value}</div>
      {note ? <div className="mt-1 text-xs text-muted">{note}</div> : null}
    </div>
  );
}

export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-panel p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-slate-50 p-6 text-center">
      <div className="font-medium text-ink">{title}</div>
      <div className="mt-1 text-sm text-muted">{description}</div>
    </div>
  );
}

export function ErrorState({
  title = "Unable to load dashboard data",
  description = "Check the Apps Script Web App URL, shared secret, and deployment access, then refresh the page.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-5 text-sm">
      <div className="font-semibold text-hot">{title}</div>
      <div className="mt-1 text-red-700">{description}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: LeadStatus | string }) {
  const className =
    status === "Hot"
      ? "bg-red-50 text-hot ring-red-100"
      : status === "Warm"
        ? "bg-amber-50 text-warm ring-amber-100"
        : status === "Cold"
          ? "bg-slate-100 text-cold ring-slate-200"
          : "bg-blue-50 text-brand ring-blue-100";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${className}`}
    >
      {status || "unknown"}
    </span>
  );
}

export function LeadsTable({ leads }: { leads: LeadRecord[] }) {
  if (leads.length === 0) {
    return (
      <EmptyState
        title="No leads found"
        description="Try changing filters or seed demo data from Telegram."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th className="py-3 pr-3">Lead</th>
            <th className="py-3 pr-3">Status</th>
            <th className="py-3 pr-3">Score</th>
            <th className="py-3 pr-3">Service</th>
            <th className="py-3 pr-3">Contact</th>
            <th className="py-3 pr-3">Timeline</th>
            <th className="py-3 pr-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.leadId} className="border-b border-slate-100">
              <td className="py-3 pr-3">
                <Link
                  href={`/leads/${encodeURIComponent(lead.leadId)}`}
                  className="font-medium text-brand hover:underline"
                >
                  {lead.fullName || lead.leadId}
                </Link>
                <div className="text-xs text-muted">{lead.leadId}</div>
              </td>
              <td className="py-3 pr-3">
                <StatusBadge status={lead.status} />
              </td>
              <td className="py-3 pr-3 font-medium">{lead.leadScore}</td>
              <td className="py-3 pr-3">{lead.serviceRequested || "-"}</td>
              <td className="py-3 pr-3">
                {lead.phone || lead.telegramUsername || lead.telegramUserId}
              </td>
              <td className="py-3 pr-3">{lead.timeline || "-"}</td>
              <td className="py-3 pr-3 text-muted">
                {formatDate(lead.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })
    : "-";
}
