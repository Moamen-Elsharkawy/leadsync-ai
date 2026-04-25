"use server";

import { redirect } from "next/navigation";
import { login, logout, requireDashboardAuth } from "../lib/auth";
import { getDashboardService } from "../lib/data";

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

export async function seedDemoData() {
  await requireDashboardAuth();
  await getDashboardService().seedDemoData();
  redirect("/demo?seeded=1");
}

export async function clearDemoData() {
  await requireDashboardAuth();
  await getDashboardService().clearDemoData();
  redirect("/demo?cleared=1");
}
