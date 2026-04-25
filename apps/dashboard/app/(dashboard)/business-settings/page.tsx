import { Section } from "../../../components/ui";
import { getDashboardService } from "../../../lib/data";

export default async function BusinessSettingsPage() {
  const settings = await getDashboardService().getBusinessSettings();
  const config = settings.config;

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-ink">Business Settings</h1>
        <p className="mt-1 text-muted">
          Read-only business configuration used by the AI reply generator.
        </p>
      </div>

      <Section title="Dashboard editing status">
        <div className="rounded-md bg-amber-50 p-3 text-sm text-warm">
          {settings.note}
        </div>
      </Section>

      <Section title="Business profile">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="businessName" value={config.businessName} />
          <Field label="businessType" value={config.businessType} />
          <Field label="tone" value={config.tone} />
          <Field label="language" value={config.language} />
          <Field
            label="unavailableDays"
            value={config.unavailableDays.join(", ") || "-"}
          />
          <Field
            label="adminContact"
            value={JSON.stringify(config.adminContact, null, 2)}
            multiline
          />
        </div>
      </Section>

      <Section title="Services">
        <div className="flex flex-wrap gap-2">
          {config.services.map((service) => (
            <span
              key={service}
              className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-brand"
            >
              {service}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Qualification questions">
        <div className="grid gap-4 md:grid-cols-3">
          {Object.entries(config.qualificationQuestions).map(([key, value]) => (
            <Field key={key} label={key} value={value} />
          ))}
        </div>
      </Section>

      <Section title="Forbidden claims">
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink">
          {config.forbiddenClaims.map((claim) => (
            <li key={claim}>{claim}</li>
          ))}
        </ul>
      </Section>

      <Section title="Settings sheet">
        {settings.settingsSheet.length === 0 ? (
          <p className="text-sm text-muted">
            No custom Settings sheet values found.
          </p>
        ) : (
          <pre className="overflow-x-auto rounded-md bg-slate-50 p-4 text-sm">
            {JSON.stringify(settings.settingsSheet, null, 2)}
          </pre>
        )}
      </Section>
    </>
  );
}

function Field({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div
        className={`mt-1 break-words text-sm text-ink ${multiline ? "whitespace-pre-wrap" : ""}`}
      >
        {value || "-"}
      </div>
    </div>
  );
}
