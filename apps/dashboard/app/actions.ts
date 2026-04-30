"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { login, logout, requireDashboardAuth } from "../lib/auth";
import { getDashboardService } from "../lib/data";
import { queryManagerChatbot } from "../lib/managerChatbot";
import type { LeadStage, LeadStatus } from "@smartflow/types/lead";
import type { FollowUpRecord } from "@smartflow/types/message";
import { classifyDashboardError } from "@smartflow/dashboard/errors";
import type { ManagerChatbotResponse } from "@smartflow/dashboard/managerChatbotService";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!(await login(password))) {
    redirect("/login?error=1");
  }

  redirect("/overview");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}


export async function updateLeadAction(formData: FormData) {
  await requireDashboardAuth();

  const leadId = String(formData.get("leadId") ?? "");
  const status = parseLeadStatus(formData.get("status"));
  const stage = parseLeadStage(formData.get("stage"));
  const notesToAppend = String(formData.get("notesToAppend") ?? "");

  if (!leadId) {
    redirect("/leads?error=missing-lead");
  }

  try {
    await getDashboardService().updateLeadAdminFields(leadId, {
      status,
      stage,
      notesToAppend,
    });
  } catch (error) {
    redirect(`/leads?error=${classifyDashboardError(error).code}`);
  }

  redirect(`/leads/${encodeURIComponent(leadId)}?updated=1`);
}

export async function updateFollowUpStatusAction(formData: FormData) {
  await requireDashboardAuth();

  const followUpId = String(formData.get("followUpId") ?? "");
  const status = parseFollowUpStatus(formData.get("status"));

  if (!followUpId) {
    redirect("/follow-ups?error=missing-follow-up");
  }

  try {
    await getDashboardService().updateFollowUpStatus(followUpId, status);
  } catch (error) {
    redirect(`/follow-ups?error=${classifyDashboardError(error).code}`);
  }
  redirect("/follow-ups?updated=1");
}

export async function managerChatbotAction(
  question: string,
  locale: "en" | "ar" = "en",
): Promise<ManagerChatbotResponse> {
  await requireDashboardAuth();
  const cookieStore = await cookies();
  const sessionId =
    cookieStore.get("smartflow_dashboard_auth")?.value ?? randomUUID();
  return queryManagerChatbot({
    question,
    locale,
    sessionId,
  });
}

function parseLeadStatus(value: FormDataEntryValue | null): LeadStatus {
  return value === "Hot" || value === "Warm" || value === "Cold"
    ? value
    : "Warm";
}

function parseLeadStage(value: FormDataEntryValue | null): LeadStage {
  return value === "new" ||
    value === "qualifying" ||
    value === "qualified" ||
    value === "follow_up" ||
    value === "closed"
    ? value
    : "qualifying";
}

function parseFollowUpStatus(
  value: FormDataEntryValue | null,
): FollowUpRecord["status"] {
  return value === "pending" ||
    value === "sent" ||
    value === "cancelled" ||
    value === "failed"
    ? value
    : "pending";
}
