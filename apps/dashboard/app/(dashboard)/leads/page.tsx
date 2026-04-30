import {
  DashboardDataError,
  LeadsTable,
  Section,
} from "../../../components/ui";
import { getDashboardService } from "../../../lib/data";
import type { LeadStage, LeadStatus } from "@smartflow/types/lead";
import {
  classifyDashboardError,
  dashboardErrorFromCode,
} from "@smartflow/dashboard/errors";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const service = getDashboardService();
  const loaded = await service
    .getLeads({
      search: params.search,
      status: parseLeadStatus(params.status),
      stage: parseLeadStage(params.stage),
      serviceRequested: params.service,
      sortBy:
        params.sort === "createdAt" || params.sort === "leadScore"
          ? params.sort
          : "updatedAt",
      sortDirection: params.dir === "asc" ? "asc" : "desc",
      limit: Number(params.limit || 50),
    })
    .then((leads) => ({ ok: true as const, leads }))
    .catch((error) => ({ ok: false as const, error }));

  if (!loaded.ok) {
    const error = classifyDashboardError(loaded.error);
    return (
      <DashboardDataError title={error.title} description={error.description} />
    );
  }

  const leads = loaded.leads;
  const actionError = params.error
    ? dashboardErrorFromCode(params.error)
    : null;

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-ink">Intake leads</h1>
        <p className="mt-1 text-muted">
          Search, filter, sort, and open complete therapy intake records.
        </p>
      </div>

      <Section
        title="Therapy intake pipeline"
        action={
          <a
            href="/leads"
            className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Refresh
          </a>
        }
      >
        {actionError ? (
          <div className="mb-4">
            <DashboardDataError
              title={actionError.title}
              description={actionError.description}
            />
          </div>
        ) : null}
        <form className="mb-4 grid gap-3 md:grid-cols-6">
          <input
            name="search"
            placeholder="Search name, phone, service, branch, notes"
            defaultValue={params.search}
            className="rounded-md border border-line px-3 py-2 md:col-span-2"
          />
          <select
            name="status"
            defaultValue={params.status || "all"}
            className="rounded-md border border-line px-3 py-2"
          >
            <option value="all">All statuses</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
          </select>

          <select
            name="sort"
            defaultValue={params.sort || "updatedAt"}
            className="rounded-md border border-line px-3 py-2"
          >
            <option value="updatedAt">Updated</option>
            <option value="createdAt">Created</option>
            <option value="leadScore">Lead score</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-brand px-3 py-2 font-medium text-white"
          >
            Apply
          </button>
        </form>
        <LeadsTable leads={leads} />
      </Section>
    </>
  );
}

function parseLeadStatus(value: string | undefined): LeadStatus | "all" {
  return value === "Hot" || value === "Warm" || value === "Cold"
    ? value
    : "all";
}

function parseLeadStage(value: string | undefined): LeadStage | "all" {
  return value === "new" ||
    value === "qualifying" ||
    value === "qualified" ||
    value === "follow_up" ||
    value === "closed"
    ? value
    : "all";
}

