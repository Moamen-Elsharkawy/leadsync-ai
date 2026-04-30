export interface DashboardNavItem {
  label: string;
  href: string;
  icon: string;
}

const managerNavItems: DashboardNavItem[] = [
  { label: "Overview", href: "/overview", icon: "📊" },
  { label: "Leads", href: "/leads", icon: "👥" },
  { label: "Conversations", href: "/conversations", icon: "💬" },
  { label: "Follow-ups", href: "/follow-ups", icon: "🔔" },
  { label: "Reports", href: "/reports", icon: "📋" },
  { label: "Chatbot", href: "/manager-chatbot", icon: "🤖" },
  { label: "Settings", href: "/business-settings", icon: "⚙️" },
];

export function getDashboardNavItems(): DashboardNavItem[] {
  return managerNavItems;
}
