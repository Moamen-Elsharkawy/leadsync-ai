import Link from "next/link";
import { logoutAction } from "../actions";
import { requireDashboardAuth } from "../../lib/auth";
import { getDashboardNavItems } from "@smartflow/dashboard/navigation";
import { FloatingManagerChatbot } from "../../components/floating-manager-chatbot";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDashboardAuth();
  const navItems = getDashboardNavItems();

  return (
    <div className="min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-800 bg-sidebar-bg lg:flex">
        {/* Brand header */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-bold text-white text-sm">
            MW
          </div>
          <div>
            <div className="text-sm font-semibold text-white">MoveWell</div>
            <div className="text-xs text-sidebar-text">
              Physical Therapy Centers
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ label, href, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-text transition-colors hover:bg-sidebar-hover hover:text-white"
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-slate-800 p-4">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-sidebar-text transition-colors hover:bg-sidebar-hover hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header bar */}
        <header className="sticky top-0 z-10 border-b border-line bg-white/95 px-4 py-3.5 backdrop-blur lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-ink">
                Manager Dashboard
              </div>
              <div className="text-sm text-muted">
                Physical therapy intake & lead management
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">
                <span className="h-2 w-2 rounded-full bg-brand animate-pulse-soft" />
                Connected
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-7xl animate-fade-in space-y-6 p-4 lg:p-8">
          {children}
        </main>
      </div>
      <FloatingManagerChatbot />
    </div>
  );
}
