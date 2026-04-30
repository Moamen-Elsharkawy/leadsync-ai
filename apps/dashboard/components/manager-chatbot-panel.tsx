"use client";

import { useState } from "react";
import type { ManagerChatbotResponse } from "@smartflow/dashboard/managerChatbotService";

interface ChatMessage {
  role: "manager" | "assistant";
  text: string;
  response?: ManagerChatbotResponse;
}

const quickPrompts = [
  "Give me an overview of leads and follow-ups.",
  "How many Hot, Warm, and Cold leads do we have?",
  "What is the top branch by lead volume?",
  "How many pending follow-ups are currently open?",
];

export function ManagerChatbotPanel({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitQuestion(rawQuestion: string) {
    const trimmed = rawQuestion.trim();
    if (!trimmed || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessages((previous) => [...previous, { role: "manager", text: trimmed }]);
    setQuestion("");

    try {
      const response = await fetch("/api/manager-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, locale: "en" }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "Unable to process chatbot request.");
      }

      const assistantResponse = json as ManagerChatbotResponse;
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: assistantResponse.answer,
          response: assistantResponse,
        },
      ]);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Chatbot request failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      className={`rounded-xl border border-line bg-panel shadow-sm ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Manager Chatbot</h2>
          <p className="text-sm text-muted">
            Answers are grounded only in your Google Sheets data.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          Sheets Only
        </span>
      </div>

      {messages.length === 0 ? (
        <div className="mb-4 rounded-lg border border-dashed border-line bg-slate-50 p-3">
          <div className="text-sm font-medium text-ink">Quick prompts</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void submitQuestion(prompt)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-lg px-3 py-2 text-sm ${
              message.role === "manager"
                ? "ml-8 bg-brand text-white"
                : "mr-8 border border-line bg-white text-ink"
            }`}
          >
            <p>{message.text}</p>
            {message.response ? (
              <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-muted">
                <div>
                  Confidence: {Math.round(message.response.confidence * 100)}%
                </div>
                <div>
                  Datasets:{" "}
                  {message.response.provenance.datasetsUsed.join(", ") || "none"}
                </div>
                {message.response.refused && message.response.refusalReason ? (
                  <div>Refusal reason: {message.response.refusalReason}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submitQuestion(question);
        }}
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about leads, follow-ups, branches, services, or pipeline stages..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Ask"}
        </button>
      </form>
    </section>
  );
}
