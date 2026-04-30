import { describe, expect, it } from "vitest";
import { getDashboardNavItems } from "../src/dashboard/navigation.js";

describe("dashboard navigation", () => {
  it("shows the correct navigation items in production mode", () => {
    const labels = getDashboardNavItems().map((item) => item.label);

    expect(labels).toEqual([
      "Overview",
      "Leads",
      "Conversations",
      "Follow-ups",
      "Reports",
      "Chatbot",
      "Settings",
    ]);
  });
});

