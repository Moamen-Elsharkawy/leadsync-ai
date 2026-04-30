import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const customerFacingFiles = [
  "config/business.json",
  "config/business.example.json",
  "google-apps-script/Code.gs",
  "src/ai/replyGenerator.ts",
  "src/services/sessionService.ts",
  "src/services/followUpService.ts",
  "src/bot/handlers.ts",
  "docs/demo-conversations.md",
  "docs/manual-qa-checklist.md",
];

describe("customer-facing Arabic content", () => {
  it("does not contain common UTF-8 mojibake markers", () => {
    const markers = /[\u00d8\u00d9\u00c3\u00c2]/u;

    for (const file of customerFacingFiles) {
      const content = fs.readFileSync(path.join(projectRoot, file), "utf8");
      expect(content, `${file} contains mojibake markers`).not.toMatch(markers);
    }
  });

  it("keeps Arabic customer-facing examples present", () => {
    const combined = customerFacingFiles
      .map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8"))
      .join("\n");

    expect(combined).toMatch(/علاج طبيعي/u);
    expect(combined).toMatch(/مدينة نصر|المعادي|التجمع/u);
  });
});
