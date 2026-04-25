import type { Server } from "node:http";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { SheetsWebAppClient } from "../sheets/sheetsWebAppClient.js";
import type { FollowUpService } from "../services/followUpService.js";
import type { LeadService } from "../services/leadService.js";
import type { ReportService } from "../services/reportService.js";
import type { LeadRecord } from "../types/lead.js";
import { logger } from "../utils/logger.js";

const DASHBOARD_LEAD_LIMIT = 20;

export interface AdminServerDeps {
  port: number;
  password: string;
  sheets: SheetsWebAppClient;
  leadService: LeadService;
  followUpService: FollowUpService;
  reportService: ReportService;
}

export function startAdminServer(deps: AdminServerDeps): Server {
  const app = createAdminApp(deps);
  const server = app.listen(deps.port, () => {
    logger.info(`Admin server listening on port ${deps.port}`);
  });

  return server;
}

export function createAdminApp(deps: AdminServerDeps): Express {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "smartflow-admin",
      timestamp: new Date().toISOString(),
    });
  });

  app.use(requireAdminPassword(deps.password));

  app.get("/", (_req, res) => {
    res.redirect("/dashboard");
  });

  app.get(
    "/leads",
    asyncHandler(async (req, res) => {
      res.json(await deps.leadService.listLeads(getLimit(req, 50)));
    }),
  );

  app.get(
    "/leads/hot",
    asyncHandler(async (req, res) => {
      res.json(await deps.leadService.listHotLeads(getLimit(req, 50)));
    }),
  );

  app.get(
    "/leads/:id",
    asyncHandler(async (req, res) => {
      const lead = await findLead(deps.leadService, req.params.id);
      if (!lead) {
        res.status(404).json({ ok: false, error: "Lead not found" });
        return;
      }

      res.json(lead);
    }),
  );

  app.get(
    "/report",
    asyncHandler(async (_req, res) => {
      res.json(await deps.reportService.getSummary());
    }),
  );

  app.get(
    "/dashboard",
    asyncHandler(async (_req, res) => {
      const [summary, leads] = await Promise.all([
        deps.reportService.getSummary(),
        deps.leadService.listLeads(DASHBOARD_LEAD_LIMIT),
      ]);

      res.type("html").send(renderDashboardHtml({ summary, leads }));
    }),
  );

  app.get(
    "/followups",
    asyncHandler(async (_req, res) => {
      res.json(await deps.followUpService.listFollowUps("pending"));
    }),
  );

  app.use(
    (
      error: unknown,
      _req: Request,
      res: Response,
      _next: NextFunction,
    ): void => {
      logger.error("Admin server request failed", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    },
  );

  return app;
}

function requireAdminPassword(password: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const headerPassword = req.header("x-admin-password");
    const queryPassword =
      typeof req.query.password === "string" ? req.query.password : undefined;
    const authHeader = req.header("authorization");
    const basicPassword = parseBasicPassword(authHeader);

    if ([headerPassword, queryPassword, basicPassword].includes(password)) {
      next();
      return;
    }

    if (req.accepts("html")) {
      res.status(401).type("html").send(renderUnauthorizedHtml());
      return;
    }

    res.status(401).json({ ok: false, error: "Unauthorized" });
  };
}

function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
}

function parseBasicPassword(authHeader?: string): string | undefined {
  if (!authHeader?.startsWith("Basic ")) {
    return undefined;
  }

  const decoded = Buffer.from(
    authHeader.slice("Basic ".length),
    "base64",
  ).toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  return separatorIndex === -1 ? undefined : decoded.slice(separatorIndex + 1);
}

function getLimit(req: Request, fallback: number): number {
  const value =
    typeof req.query.limit === "string" ? Number(req.query.limit) : NaN;
  return Number.isInteger(value) && value > 0 ? Math.min(value, 100) : fallback;
}

async function findLead(
  leadService: LeadService,
  leadId: string | undefined,
): Promise<LeadRecord | null> {
  if (!leadId) {
    return null;
  }

  if (leadId.startsWith("lead_")) {
    return leadService.getLead(leadId);
  }

  return (
    (await leadService.getLead(`lead_${leadId}`)) ?? leadService.getLead(leadId)
  );
}

function renderDashboardHtml(input: {
  summary: {
    totalLeads: number;
    hotLeads: number;
    warmLeads: number;
    coldLeads: number;
    demoLeads?: number;
  };
  leads: LeadRecord[];
}): string {
  const total = Math.max(input.summary.totalLeads, 0);
  const hotRate =
    total > 0 ? Math.round((input.summary.hotLeads / total) * 100) : 0;
  const warmRate =
    total > 0 ? Math.round((input.summary.warmLeads / total) * 100) : 0;
  const coldRate =
    total > 0 ? Math.round((input.summary.coldLeads / total) * 100) : 0;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SmartFlow AI Admin Dashboard</title>
  <style>
    :root { color-scheme: light; --bg: #f7f8fa; --panel: #ffffff; --line: #dde3ea; --text: #1f2933; --muted: #607080; --accent: #1565c0; --hot: #b42318; --warm: #a15c07; --cold: #4b5563; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: var(--bg); color: var(--text); }
    main { max-width: 1180px; margin: 0 auto; padding: 28px 18px 40px; }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 22px; }
    h1 { font-size: 26px; margin: 0 0 6px; }
    h2 { font-size: 18px; margin: 0 0 12px; }
    p { margin: 0; color: var(--muted); }
    a { color: var(--accent); text-decoration: none; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
    .card, .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; }
    .card { padding: 16px; }
    .card span { color: var(--muted); font-size: 13px; }
    .card strong { display: block; font-size: 28px; margin-top: 6px; }
    .panel { padding: 16px; margin-top: 18px; overflow-x: auto; }
    .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .metric { border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: #fbfcfd; }
    .metric strong { display: block; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; min-width: 860px; }
    th, td { padding: 11px 10px; border-bottom: 1px solid #e9edf2; text-align: left; font-size: 14px; vertical-align: top; }
    th { color: var(--muted); font-weight: 600; background: #fbfcfd; }
    .badge { display: inline-block; min-width: 52px; padding: 4px 8px; border-radius: 999px; font-size: 12px; text-align: center; background: #eef2f6; }
    .Hot { color: var(--hot); background: #fff1f0; }
    .Warm { color: var(--warm); background: #fff7e6; }
    .Cold { color: var(--cold); background: #f3f4f6; }
    .empty { padding: 18px; color: var(--muted); border: 1px dashed var(--line); border-radius: 8px; background: #fbfcfd; }
    @media (max-width: 760px) { header { display: block; } .grid, .summary { grid-template-columns: 1fr; } main { padding: 20px 12px; } }
  </style>
</head>
<body>
<main>
  <header>
    <div>
      <h1>SmartFlow AI Dashboard</h1>
      <p>Google Sheets CRM view powered by the Apps Script Web App.</p>
    </div>
    <p><a href="/health">Health</a> · <a href="/leads">Leads API</a> · <a href="/report">Report API</a></p>
  </header>

  <section class="grid">
    ${renderStatCard("Total leads", input.summary.totalLeads)}
    ${renderStatCard("Hot leads", input.summary.hotLeads, "Hot")}
    ${renderStatCard("Warm leads", input.summary.warmLeads, "Warm")}
    ${renderStatCard("Cold leads", input.summary.coldLeads, "Cold")}
    ${renderStatCard("Demo leads", input.summary.demoLeads ?? 0)}
  </section>

  <section class="panel">
    <h2>Basic conversion summary</h2>
    <div class="summary">
      ${renderMetric("Hot rate", `${hotRate}%`, "Ready for immediate owner attention")}
      ${renderMetric("Warm rate", `${warmRate}%`, "Needs follow-up or more qualification")}
      ${renderMetric("Cold rate", `${coldRate}%`, "Low intent, irrelevant, or incomplete")}
    </div>
  </section>

  <section class="panel">
    <h2>Latest 20 leads</h2>
    ${renderLeadsTable(input.leads)}
  </section>
</main>
</body>
</html>`;
}

function renderStatCard(label: string, value: number, className = ""): string {
  return `<div class="card"><span>${escapeHtml(label)}</span><strong class="${className}">${value}</strong></div>`;
}

function renderMetric(label: string, value: string, note: string): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(note)}</p></div>`;
}

function renderLeadsTable(leads: LeadRecord[]): string {
  if (leads.length === 0) {
    return `<div class="empty">No leads found yet.</div>`;
  }

  const rows = leads
    .slice(0, DASHBOARD_LEAD_LIMIT)
    .map(
      (lead) => `<tr>
        <td><a href="/leads/${encodeURIComponent(lead.leadId)}">${escapeHtml(lead.leadId)}</a></td>
        <td><span class="badge ${escapeHtml(lead.status)}">${escapeHtml(lead.status)}</span></td>
        <td>${lead.leadScore}</td>
        <td>${escapeHtml(valueOrDash(lead.serviceRequested))}</td>
        <td>${escapeHtml(valueOrDash(lead.fullName))}</td>
        <td>${escapeHtml(valueOrDash(lead.phone || lead.telegramUsername))}</td>
        <td>${escapeHtml(valueOrDash(lead.timeline))}</td>
        <td>${escapeHtml(valueOrDash(lead.budget))}</td>
        <td>${escapeHtml(valueOrDash(lead.updatedAt))}</td>
      </tr>`,
    )
    .join("");

  return `<table>
    <thead>
      <tr><th>ID</th><th>Status</th><th>Score</th><th>Service</th><th>Name</th><th>Contact</th><th>Timeline</th><th>Budget</th><th>Updated</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderUnauthorizedHtml(): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Unauthorized</title></head><body><main style="font-family: Arial, sans-serif; max-width: 640px; margin: 40px auto;"><h1>Unauthorized</h1><p>Add <code>?password=ADMIN_PASSWORD</code> to the URL, send <code>x-admin-password</code>, or use Basic auth.</p></main></body></html>`;
}

function valueOrDash(value: string | undefined | null): string {
  return value && value.trim() ? value : "-";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
