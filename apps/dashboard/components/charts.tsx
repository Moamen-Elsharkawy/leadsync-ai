"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LeadAnalytics } from "@smartflow/dashboard/analytics";

const colors = ["#176b87", "#b42318", "#a15c07", "#475467", "#3f7d58"];

export function AnalyticsCharts({ analytics }: { analytics: LeadAnalytics }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartPanel title="Daily inquiry volume">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={analytics.dailyLeadVolume}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line dataKey="leads" stroke="#176b87" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Intake by priority">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={analytics.leadsByStatus}
              dataKey="value"
              nameKey="name"
              outerRadius={88}
              label
            >
              {analytics.leadsByStatus.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Top therapy services">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={analytics.topRequestedServices}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="service" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="leads" fill="#176b87" />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Branch demand">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={analytics.branchDemand}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="branch" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="leads" fill="#3f7d58" />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Urgency mix">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={analytics.urgencyDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="urgency" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="leads" fill="#a15c07" />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Follow-ups by status">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={analytics.followUpsByStatus}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#3f7d58" />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
}

function ChartPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-ink">{title}</h3>
      {children}
    </div>
  );
}
