import { clearDemoData, seedDemoData } from "../../actions";
import { PageHeader, Section } from "../../../components/ui";
import { getDashboardService } from "../../../lib/data";

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ seeded?: string; cleared?: string }>;
}) {
  const params = await searchParams;
  const service = getDashboardService();
  const demoMode = service.getDemoMode();
  const preset = service.getBusinessPreset();

  return (
    <>
      <PageHeader
        title="Demo"
        description="Portfolio-safe demo controls, sample conversations, and reset workflow for client presentations."
      />

      {params.seeded ? (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Demo data seeded through Apps Script.
        </div>
      ) : null}
      {params.cleared ? (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Demo data cleared. Only rows where isDemo=true were removed.
        </div>
      ) : null}

      <Section title="Current demo status">
        <div className="grid gap-4 md:grid-cols-2">
          <Info label="DEMO_MODE" value={demoMode ? "true" : "false"} />
          <Info label="BUSINESS_PRESET" value={preset} />
        </div>
      </Section>

      <Section title="Demo actions">
        <p className="mb-4 text-sm text-muted">
          These buttons call the existing Apps Script Web App. Clear demo data
          deletes only rows where isDemo=true.
        </p>
        <div className="flex flex-wrap gap-3">
          <form action={seedDemoData}>
            <button className="rounded-md bg-brand px-4 py-2 font-medium text-white">
              Seed demo data
            </button>
          </form>
          <form action={clearDemoData}>
            <button className="rounded-md border border-red-200 bg-red-50 px-4 py-2 font-medium text-hot">
              Clear demo data
            </button>
          </form>
        </div>
      </Section>

      <Section title="Telegram demo workflow">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-ink">
          <li>Run /setup_sheets from the admin Telegram account.</li>
          <li>
            Run /demo for the active preset, or /demo_dental, /demo_course, or
            /demo_physical.
          </li>
          <li>Open Overview and Leads to show CRM updates.</li>
          <li>Send a sample Arabic customer message from a non-admin account.</li>
          <li>Show the Hot lead admin notification and conversation history.</li>
          <li>Run /clear_demo when finished.</li>
        </ol>
      </Section>

      <Section title="Sample physical therapy conversation">
        <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm leading-6 text-ink">
          {`Customer:
محتاج جلسة علاج طبيعي لأسفل الظهر في فرع مدينة نصر بكرة. رقمي 01044440001.

Bot:
تمام، سجلت التفاصيل ليستطيع فريق الاستقبال مراجعة الطلب والتواصل معك. لا يوجد تشخيص أو تأكيد موعد داخل المحادثة قبل مراجعة الفريق.`}
        </pre>
      </Section>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 font-medium text-ink">{value}</div>
    </div>
  );
}
