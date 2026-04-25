import type { LeadRecord, LeadStage, LeadStatus } from "../types/lead.js";
import type { FollowUpRecord } from "../types/message.js";

export interface LeadFilters {
  search?: string;
  status?: LeadStatus | "all";
  stage?: LeadStage | "all";
  serviceRequested?: string;
  isDemo?: boolean | "all";
  sortBy?: "createdAt" | "updatedAt" | "leadScore";
  sortDirection?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface DashboardSummary {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  pendingFollowUps: number;
  sentFollowUps: number;
  failedFollowUps: number;
  overdueFollowUps: number;
  conversionRate: number;
  leadsCreatedToday: number;
  leadsCreatedThisWeek: number;
  averageLeadScore: number;
}

export interface LeadAnalytics {
  leadsOverTime: Array<{ date: string; leads: number }>;
  leadsByStatus: Array<{ name: LeadStatus; value: number }>;
  followUpsByStatus: Array<{ name: string; value: number }>;
  topRequestedServices: Array<{ service: string; leads: number }>;
  leadsByStage: Array<{ stage: string; leads: number }>;
  leadTimelineDistribution: Array<{ timeline: string; leads: number }>;
  dailyLeadVolume: Array<{ date: string; leads: number }>;
}

export function getDashboardSummary(
  leads: LeadRecord[],
  followUps: FollowUpRecord[],
  now = new Date(),
): DashboardSummary {
  const totalLeads = leads.length;
  const hotLeads = leads.filter((lead) => lead.status === "Hot").length;
  const warmLeads = leads.filter((lead) => lead.status === "Warm").length;
  const coldLeads = leads.filter((lead) => lead.status === "Cold").length;
  const pendingFollowUps = followUps.filter(
    (followUp) => followUp.status === "pending",
  ).length;
  const sentFollowUps = followUps.filter(
    (followUp) => followUp.status === "sent",
  ).length;
  const failedFollowUps = followUps.filter(
    (followUp) => followUp.status === "failed",
  ).length;
  const overdueFollowUps = followUps.filter(
    (followUp) =>
      followUp.status === "pending" &&
      parseTime(followUp.scheduledAt) < now.getTime(),
  ).length;
  const scores = leads
    .map((lead) => Number(lead.leadScore))
    .filter(Number.isFinite);

  return {
    totalLeads,
    hotLeads,
    warmLeads,
    coldLeads,
    pendingFollowUps,
    sentFollowUps,
    failedFollowUps,
    overdueFollowUps,
    conversionRate: totalLeads ? Math.round((hotLeads / totalLeads) * 100) : 0,
    leadsCreatedToday: leads.filter((lead) => isSameDate(lead.createdAt, now))
      .length,
    leadsCreatedThisWeek: leads.filter(
      (lead) => parseTime(lead.createdAt) >= startOfRollingWeek(now).getTime(),
    ).length,
    averageLeadScore: scores.length
      ? Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length,
        )
      : 0,
  };
}

export function getLeadAnalytics(
  leads: LeadRecord[],
  followUps: FollowUpRecord[],
  now = new Date(),
): LeadAnalytics {
  return {
    leadsOverTime: groupLeadsByDate(leads, 14, now),
    leadsByStatus: (["Hot", "Warm", "Cold"] as LeadStatus[]).map((status) => ({
      name: status,
      value: leads.filter((lead) => lead.status === status).length,
    })),
    followUpsByStatus: countByKey(
      followUps,
      (followUp) => followUp.status || "unknown",
      "name",
      "value",
    ),
    topRequestedServices: countByKey(
      leads.filter((lead) => Boolean(lead.serviceRequested)),
      (lead) => lead.serviceRequested,
      "service",
      "leads",
    ).slice(0, 8),
    leadsByStage: countByKey(
      leads,
      (lead) => lead.stage || "unknown",
      "stage",
      "leads",
    ),
    leadTimelineDistribution: countByKey(
      leads.filter((lead) => Boolean(lead.timeline)),
      (lead) => normalizeTimelineBucket(lead.timeline),
      "timeline",
      "leads",
    ).slice(0, 8),
    dailyLeadVolume: groupLeadsByDate(leads, 7, now),
  };
}

export function filterLeads(
  leads: LeadRecord[],
  filters: LeadFilters = {},
): LeadRecord[] {
  const search = filters.search?.trim().toLowerCase();
  const service = filters.serviceRequested?.trim().toLowerCase();
  const sortBy = filters.sortBy ?? "updatedAt";
  const sortDirection = filters.sortDirection ?? "desc";
  const offset = Math.max(0, filters.offset ?? 0);
  const limit = filters.limit && filters.limit > 0 ? filters.limit : undefined;

  const filtered = leads.filter((lead) => {
    if (
      filters.status &&
      filters.status !== "all" &&
      lead.status !== filters.status
    ) {
      return false;
    }

    if (
      filters.stage &&
      filters.stage !== "all" &&
      lead.stage !== filters.stage
    ) {
      return false;
    }

    if (service && lead.serviceRequested.toLowerCase() !== service) {
      return false;
    }

    if (filters.isDemo !== undefined && filters.isDemo !== "all") {
      if (Boolean(lead.isDemo) !== filters.isDemo) {
        return false;
      }
    }

    if (!search) {
      return true;
    }

    return [
      lead.fullName,
      lead.telegramUsername,
      lead.phone,
      lead.serviceRequested,
      lead.notes,
      lead.leadId,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

  const sorted = filtered.sort((left, right) => {
    const multiplier = sortDirection === "asc" ? 1 : -1;
    if (sortBy === "leadScore") {
      return (Number(left.leadScore) - Number(right.leadScore)) * multiplier;
    }

    return (parseTime(left[sortBy]) - parseTime(right[sortBy])) * multiplier;
  });

  return limit ? sorted.slice(offset, offset + limit) : sorted.slice(offset);
}

export function buildOwnerReportText(
  leads: LeadRecord[],
  followUps: FollowUpRecord[],
): string {
  const summary = getDashboardSummary(leads, followUps);
  const topServices = getLeadAnalytics(leads, followUps)
    .topRequestedServices.slice(0, 5)
    .map((item) => `${item.service}: ${item.leads}`)
    .join(", ");

  return [
    "SmartFlow AI Sales Report",
    `Total leads: ${summary.totalLeads}`,
    `Hot leads: ${summary.hotLeads}`,
    `Warm leads: ${summary.warmLeads}`,
    `Cold leads: ${summary.coldLeads}`,
    `Pending follow-ups: ${summary.pendingFollowUps}`,
    `Conversion rate: ${summary.conversionRate}%`,
    `Average lead score: ${summary.averageLeadScore}`,
    `Top requested services: ${topServices || "No service data yet"}`,
    "",
    getBusinessRecommendation(summary),
  ].join("\n");
}

export function getBusinessRecommendation(summary: DashboardSummary): string {
  if (summary.hotLeads > 0) {
    return "Recommendation: contact Hot leads first and keep follow-up notes updated.";
  }

  if (summary.warmLeads > summary.hotLeads) {
    return "Recommendation: review Warm leads and improve qualification questions or follow-up cadence.";
  }

  if (summary.totalLeads === 0) {
    return "Recommendation: seed demo data or start customer conversations to populate the CRM.";
  }

  return "Recommendation: keep monitoring lead quality and response time.";
}

function groupLeadsByDate(
  leads: LeadRecord[],
  days: number,
  now: Date,
): Array<{ date: string; leads: number }> {
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (days - index - 1));
    return date.toISOString().slice(0, 10);
  });

  return buckets.map((date) => ({
    date,
    leads: leads.filter((lead) => lead.createdAt?.slice(0, 10) === date).length,
  }));
}

function countByKey<T, Key extends string, Value extends string>(
  items: T[],
  getKey: (item: T) => string,
  keyName: Key,
  valueName: Value,
): Array<Record<Key, string> & Record<Value, number>> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item) || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([key, value]) => {
      const record = {
        [keyName]: key,
        [valueName]: value,
      };
      return record as Record<Key, string> & Record<Value, number>;
    });
}

function normalizeTimelineBucket(value: string): string {
  const normalized = value.toLowerCase();
  if (
    /today|tomorrow|urgent|asap|this week|اليوم|النهارده|بكرة|عاجل|الأسبوع/.test(
      normalized,
    )
  ) {
    return "Soon";
  }

  if (/month|شهر/.test(normalized)) {
    return "This month";
  }

  if (/quarter|ربع/.test(normalized)) {
    return "This quarter";
  }

  return value.slice(0, 40);
}

function isSameDate(value: string, now: Date): boolean {
  const time = parseTime(value);
  if (!Number.isFinite(time)) {
    return false;
  }

  return (
    new Date(time).toISOString().slice(0, 10) === now.toISOString().slice(0, 10)
  );
}

function startOfRollingWeek(now: Date): Date {
  const date = new Date(now);
  date.setDate(date.getDate() - 7);
  return date;
}

function parseTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
