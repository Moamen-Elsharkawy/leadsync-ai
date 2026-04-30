import {
  Card,
  DashboardDataError,
  EmptyState,
  PageHeader,
  Section,
  StatusBadge,
  formatDate,
} from "../../../components/ui";
import { updateFollowUpStatusAction } from "../../actions";
import { getDashboardService } from "../../../lib/data";
import type { FollowUpRecord } from "@smartflow/types/message";
import {
  classifyDashboardError,
  dashboardErrorFromCode,
} from "@smartflow/dashboard/errors";

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const loaded = await getDashboardService()
    .getFollowUps({
      status: parseStatus(params.status),
      leadId: params.leadId,
    })
    .then((followUps) => ({ ok: true as const, followUps }))
    .catch((error) => ({ ok: false as const, error }));

  if (!loaded.ok) {
    const error = classifyDashboardError(loaded.error);
    return (
      <DashboardDataError title={error.title} description={error.description} />
    );
  }

  const followUps = loaded.followUps;
  const actionError = params.error
    ? dashboardErrorFromCode(params.error)
    : null;
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
      <PageHeader
        title="Follow-ups"
        description="Dashboard-first visibility and controls for the FollowUps sheet queue."
      />

      {params.updated ? (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Follow-up status updated.
        </div>
      ) : null}
      {actionError ? (
        <DashboardDataError
          title={actionError.title}
          description={actionError.description}
        />
      ) : null}

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
                  <th className="py-3 pr-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((item) => (
                  <tr
                    key={item.followUpId}
                    className="border-b border-slate-100"
                  >
                    <td className="py-3 pr-3">{item.followUpId}</td>
                    <td className="py-3 pr-3">{item.leadId}</td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 pr-3">
                      {formatDate(item.scheduledAt)}
                    </td>
                    <td className="py-3 pr-3">{formatDate(item.sentAt)}</td>
                    <td className="py-3 pr-3">{item.attemptNumber}</td>
                    <td className="max-w-lg py-3 pr-3">{item.message}</td>
                    <td className="py-3 pr-3">
                      <form
                        action={updateFollowUpStatusAction}
                        className="flex min-w-44 gap-2"
                      >
                        <input
                          type="hidden"
                          name="followUpId"
                          value={item.followUpId}
                        />
                        <select
                          name="status"
                          defaultValue={item.status}
                          className="rounded-md border border-line px-2 py-1"
                        >
                          <option value="pending">Pending</option>
                          <option value="sent">Sent</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="failed">Failed</option>
                        </select>
                        <button className="rounded-md border border-line px-2 py-1 text-xs font-medium hover:bg-slate-50">
                          Save
                        </button>
                      </form>
                    </td>
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
