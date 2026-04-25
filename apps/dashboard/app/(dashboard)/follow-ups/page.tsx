import {
  Card,
  EmptyState,
  Section,
  StatusBadge,
  formatDate,
} from "../../../components/ui";
import { getDashboardService } from "../../../lib/data";
import type { FollowUpRecord } from "@smartflow/types/message";

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const followUps = await getDashboardService().getFollowUps({
    status: parseStatus(params.status),
    leadId: params.leadId,
  });
  const pending = followUps.filter((item) => item.status === "pending").length;
  const sent = followUps.filter((item) => item.status === "sent").length;
  const overdue = followUps.filter(
    (item) =>
      item.status === "pending" &&
      Number.isFinite(Date.parse(item.scheduledAt)) &&
      Date.parse(item.scheduledAt) < Date.now(),
  ).length;

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-ink">Follow-ups</h1>
        <p className="mt-1 text-muted">
          Visibility into the FollowUps sheet queue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Pending" value={pending} />
        <Card title="Sent" value={sent} tone="good" />
        <Card title="Overdue" value={overdue} tone={overdue ? "hot" : "good"} />
      </div>

      <Section title="Follow-up queue">
        <form className="mb-4 grid gap-3 md:grid-cols-3">
          <select
            name="status"
            defaultValue={params.status || "all"}
            className="rounded-md border border-line px-3 py-2"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            name="leadId"
            placeholder="Filter by leadId"
            defaultValue={params.leadId}
            className="rounded-md border border-line px-3 py-2"
          />
          <button className="rounded-md bg-brand px-3 py-2 font-medium text-white">
            Apply
          </button>
        </form>

        {followUps.length === 0 ? (
          <EmptyState
            title="No follow-ups found"
            description="Warm or incomplete leads will appear here when follow-ups are queued."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase text-muted">
                  <th className="py-3 pr-3">Follow-up</th>
                  <th className="py-3 pr-3">Lead</th>
                  <th className="py-3 pr-3">Status</th>
                  <th className="py-3 pr-3">Scheduled</th>
                  <th className="py-3 pr-3">Sent</th>
                  <th className="py-3 pr-3">Attempt</th>
                  <th className="py-3 pr-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((item) => (
                  <tr key={item.followUpId} className="border-b border-slate-100">
                    <td className="py-3 pr-3">{item.followUpId}</td>
                    <td className="py-3 pr-3">{item.leadId}</td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 pr-3">{formatDate(item.scheduledAt)}</td>
                    <td className="py-3 pr-3">{formatDate(item.sentAt)}</td>
                    <td className="py-3 pr-3">{item.attemptNumber}</td>
                    <td className="max-w-lg py-3 pr-3">{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}

function parseStatus(
  value: string | undefined,
): FollowUpRecord["status"] | "all" {
  return value === "pending" ||
    value === "sent" ||
    value === "cancelled" ||
    value === "failed"
    ? value
    : "all";
}
