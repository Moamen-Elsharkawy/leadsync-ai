import Link from "next/link";
import { logoutAction } from "../actions";
import { requireDashboardAuth } from "../../lib/auth";
import { getDashboardService } from "../../lib/data";

const navItems = [
  ["Overview", "/overview"],
  ["Leads", "/leads"],
  ["Conversations", "/conversations"],
  ["Follow-ups", "/follow-ups"],
  ["Reports", "/reports"],
  ["Business Settings", "/business-settings"],
  ["Demo", "/demo"],
  ["System Health", "/system-health"],
];

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDashboardAuth();
  const service = getDashboardService();
  const demoMode = service.getDemoMode();

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-line bg-panel p-5 lg:block">
        <div className="mb-7">
          <div className="text-sm font-medium text-brand">SmartFlow AI</div>
          <div className="mt-1 text-xl font-semibold text-ink">
            Sales Command Center
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-slate-100"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-line bg-panel/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-muted">Admin dashboard</div>
              <div className="font-semibold text-ink">
                Telegram sales automation platform
              </div>
            </div>
            <div className="flex items-center gap-3">
              {demoMode ? (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-warm ring-1 ring-amber-100">
                  Demo Mode
                </span>
              ) : null}
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-slate-50"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
