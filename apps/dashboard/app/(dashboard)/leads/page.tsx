import { LeadsTable, Section } from "../../../components/ui";
import { getDashboardService } from "../../../lib/data";
import type { LeadStage, LeadStatus } from "@smartflow/types/lead";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const service = getDashboardService();
  const leads = await service.getLeads({
    search: params.search,
    status: parseLeadStatus(params.status),
    stage: parseLeadStage(params.stage),
    serviceRequested: params.service,
    isDemo: parseDemo(params.demo),
    sortBy:
      params.sort === "createdAt" || params.sort === "leadScore"
        ? params.sort
        : "updatedAt",
    sortDirection: params.dir === "asc" ? "asc" : "desc",
    limit: Number(params.limit || 50),
  });

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-ink">Leads</h1>
        <p className="mt-1 text-muted">
          Search, filter, sort, and open complete lead records.
        </p>
      </div>

      <Section
        title="Lead pipeline"
        action={
          <a
            href="/leads"
            className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Refresh
          </a>
        }
      >
        <form className="mb-4 grid gap-3 md:grid-cols-6">
          <input
            name="search"
            placeholder="Search name, phone, service, notes"
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
            name="demo"
            defaultValue={params.demo || "all"}
            className="rounded-md border border-line px-3 py-2"
          >
            <option value="all">All data</option>
            <option value="true">Demo only</option>
            <option value="false">Real only</option>
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

function parseDemo(value: string | undefined) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return "all";
}
