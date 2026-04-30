export type DashboardErrorCode =
  | "invalid-secret"
  | "secret-not-initialized"
  | "old-deployment"
  | "timeout"
  | "setup-needed"
  | "network"
  | "apps-script";

export interface DashboardErrorInfo {
  code: DashboardErrorCode;
  title: string;
  description: string;
}

export function classifyDashboardError(error: unknown): DashboardErrorInfo {
  const message = error instanceof Error ? error.message : String(error);

  if (/INVALID_SECRET|Invalid Google Apps Script secret/i.test(message)) {
    return {
      code: "invalid-secret",
      title: "Apps Script secret mismatch",
      description:
        "GOOGLE_SHEETS_WEBAPP_SECRET does not match SMARTFLOW_SECRET in Apps Script Properties. Update the secret or initialize the new deployment again.",
    };
  }

  if (/SECRET_NOT_INITIALIZED|secret is not initialized/i.test(message)) {
    return {
      code: "secret-not-initialized",
      title: "Apps Script secret is not initialized",
      description:
        "Deploy the Web App, then run npm run init:secret once with the shared secret from .env.",
    };
  }

  if (/UNSUPPORTED_ACTION|Unsupported action|diagnostics/i.test(message)) {
    return {
      code: "old-deployment",
      title: "Apps Script deployment is outdated",
      description:
        "Paste the latest google-apps-script/Code.gs into Apps Script and redeploy the Web App.",
    };
  }

  if (/timeout|timed out|AbortError|TIMEOUT/i.test(message)) {
    return {
      code: "timeout",
      title: "Apps Script request timed out",
      description:
        "The Web App did not respond in time. Check Apps Script logs, deployment access, and try again.",
    };
  }

  if (/Missing required headers|MISSING_HEADERS|needs setup/i.test(message)) {
    return {
      code: "setup-needed",
      title: "Google Sheet setup is incomplete",
      description:
        "Run Setup Sheets from System Health or run npm run setup:sheets after deploying the latest Apps Script.",
    };
  }

  if (/fetch failed|ENOTFOUND|ECONNRESET|network/i.test(message)) {
    return {
      code: "network",
      title: "Unable to reach Apps Script",
      description:
        "Check GOOGLE_SHEETS_WEBAPP_URL, internet access, and whether the Web App is deployed with access set to Anyone.",
    };
  }

  return {
    code: "apps-script",
    title: "Unable to load dashboard data",
    description:
      "Check the Apps Script Web App URL, deployment version, shared secret, and Apps Script execution logs.",
  };
}

export function dashboardErrorFromCode(
  code: string | undefined,
): DashboardErrorInfo {
  const known: Record<DashboardErrorCode, DashboardErrorInfo> = {
    "invalid-secret": classifyDashboardError("INVALID_SECRET"),
    "secret-not-initialized": classifyDashboardError("SECRET_NOT_INITIALIZED"),
    "old-deployment": classifyDashboardError("UNSUPPORTED_ACTION"),
    timeout: classifyDashboardError("TIMEOUT"),
    "setup-needed": classifyDashboardError("MISSING_HEADERS"),
    network: classifyDashboardError("fetch failed"),
    "apps-script": classifyDashboardError("apps-script"),
  };

  return code && code in known
    ? known[code as DashboardErrorCode]
    : classifyDashboardError("");
}
