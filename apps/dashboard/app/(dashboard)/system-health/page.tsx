import { Section, StatusBadge } from "../../../components/ui";
import { getDashboardService } from "../../../lib/data";

export default function SystemHealthPage() {
  const health = getDashboardService().getSystemHealth();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-ink">System Health</h1>
        <p className="mt-1 text-muted">
          Configuration checks without exposing secret values.
        </p>
      </div>

      <Section title="Runtime status">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Check label="Dashboard" ok={health.dashboardStatus === "healthy"} />
          <Check
            label="Apps Script URL"
            ok={health.appsScriptWebAppConfigured}
          />
          <Check
            label="OpenRouter model"
            ok={health.openRouterModelConfigured}
          />
          <Check label="Telegram token" ok={health.telegramTokenConfigured} />
        </div>
      </Section>

      <Section title="Architecture confirmation">
        <div className="space-y-3 text-sm text-ink">
          <p>Storage: {health.storageArchitecture}</p>
          <p>AI provider: {health.aiProvider}</p>
          <p>DEMO_MODE: {String(health.demoMode)}</p>
          <p>BOT_MODE: {health.botMode || "not configured"}</p>
        </div>
      </Section>

      <Section title="Environment presence">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(health.envPresence).map(([key, configured]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-md border border-line bg-slate-50 p-3"
            >
              <span className="text-sm font-medium text-ink">{key}</span>
              <StatusBadge status={configured ? "configured" : "missing"} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Quick setup checklist">
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink">
          {health.setupChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-3">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-1 font-semibold ${ok ? "text-brand" : "text-hot"}`}>
        {ok ? "Configured" : "Missing"}
      </div>
    </div>
  );
}
