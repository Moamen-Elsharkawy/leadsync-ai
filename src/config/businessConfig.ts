import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const businessConfigSchema = z.object({
  businessName: z.string().min(1),
  businessType: z.string().min(1).default("physical therapy center"),
  language: z.literal("ar").default("ar"),
  branches: z.array(z.string().min(1)).default([]),
  services: z.array(z.string().min(1)).default([]),
  workingHours: z
    .object({
      timezone: z.string().min(1).default("Africa/Cairo"),
      weekly: z.record(z.string(), z.string()).default({}),
    })
    .default({ timezone: "Africa/Cairo", weekly: {} }),
  tone: z.string().min(1).default("professional, concise, helpful"),
  defaultCurrency: z.string().min(1).default("EGP"),
  unavailableDays: z.array(z.string().min(1)).default([]),
  adminContact: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      telegram: z.string().optional(),
    })
    .default({}),
  qualificationQuestions: z.object({
    fullName: z.string().min(1).optional(),
    serviceRequested: z.string().min(1),
    branch: z.string().min(1).optional(),
    timing: z.string().min(1),
    budgetOrTimeline: z.string().min(1).optional(),
    phone: z.string().min(1),
  }),
  forbiddenClaims: z.array(z.string().min(1)).default([]),
  fallbackReply: z.string().min(1),
});

export type BusinessConfig = z.infer<typeof businessConfigSchema>;

export const businessPresets = ["physical-therapy"] as const;

export type BusinessPreset = (typeof businessPresets)[number];

const businessPresetPaths: Record<BusinessPreset, string> = {
  "physical-therapy": "config/business.json",
};

export function loadBusinessConfig(
  filePath = "config/business.json",
): BusinessConfig {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const raw = readFileSync(absolutePath, "utf8");
  const parsed = businessConfigSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    throw new Error(`Invalid business config: ${parsed.error.message}`);
  }

  return parsed.data;
}

export function resolveBusinessConfigPath(preset: BusinessPreset): string {
  return businessPresetPaths[preset];
}

export function loadBusinessConfigForPreset(
  preset: BusinessPreset = "physical-therapy",
): BusinessConfig {
  return loadBusinessConfig(resolveBusinessConfigPath(preset));
}
