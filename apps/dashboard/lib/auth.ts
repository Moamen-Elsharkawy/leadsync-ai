import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loadDashboardEnv } from "./serverEnv";

const cookieName = "smartflow_dashboard_auth";

export async function isAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(cookieName)?.value;
  return Boolean(token && safeEqual(token, getSessionToken()));
}

export async function requireDashboardAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}

export async function login(password: string): Promise<boolean> {
  const env = loadDashboardEnv();
  if (!env.adminPassword || password !== env.adminPassword) {
    return false;
  }

  (await cookies()).set(cookieName, getSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return true;
}

export async function logout(): Promise<void> {
  (await cookies()).delete(cookieName);
}

function getSessionToken(): string {
  const env = loadDashboardEnv();
  return createHash("sha256")
    .update(`${env.adminPassword}:${env.dashboardSecret}`)
    .digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
