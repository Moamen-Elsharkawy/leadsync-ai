import { describe, expect, it } from "vitest";
import {
  classifyDashboardError,
  dashboardErrorFromCode,
} from "../src/dashboard/errors.js";

describe("dashboard error mapping", () => {
  it("maps invalid Apps Script secrets to an actionable manager error", () => {
    const error = classifyDashboardError(
      new Error("Invalid Google Apps Script secret"),
    );

    expect(error.code).toBe("invalid-secret");
    expect(error.description).toContain("SMARTFLOW_SECRET");
  });

  it("maps unsupported diagnostics to old deployment guidance", () => {
    const error = classifyDashboardError(
      new Error("Unsupported action: diagnostics"),
    );

    expect(error.code).toBe("old-deployment");
    expect(error.description).toContain("redeploy");
  });

  it("maps known query error codes back to stable dashboard copy", () => {
    expect(dashboardErrorFromCode("timeout").code).toBe("timeout");
    expect(dashboardErrorFromCode("missing").code).toBe("apps-script");
  });
});
