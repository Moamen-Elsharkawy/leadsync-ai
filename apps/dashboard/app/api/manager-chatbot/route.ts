import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { queryManagerChatbot } from "@/lib/managerChatbot";

const requestSchema = z.object({
  question: z.string().trim().min(3).max(500),
  locale: z.enum(["en", "ar"]).default("en"),
});

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized dashboard session." },
      { status: 401 },
    );
  }

  try {
    const body = requestSchema.parse(await request.json());
    const cookieStore = await cookies();
    const sessionId =
      cookieStore.get("smartflow_dashboard_auth")?.value ?? randomUUID();
    const result = await queryManagerChatbot({
      question: body.question,
      locale: body.locale,
      sessionId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid chatbot request.",
          details: error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Chatbot request failed.",
      },
      { status: 500 },
    );
  }
}
