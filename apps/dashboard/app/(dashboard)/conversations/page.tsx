import {
  DashboardDataError,
  EmptyState,
  Section,
  formatDate,
} from "../../../components/ui";
import { getDashboardService } from "../../../lib/data";
import { classifyDashboardError } from "@smartflow/dashboard/errors";

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const loaded = await getDashboardService()
    .getMessages({
      leadId: params.leadId,
      telegramUserId: params.telegramUserId,
    })
    .then((messages) => ({ ok: true as const, messages }))
    .catch((error) => ({ ok: false as const, error }));

  if (!loaded.ok) {
    const error = classifyDashboardError(loaded.error);
    return (
      <DashboardDataError title={error.title} description={error.description} />
    );
  }

  const messages = loaded.messages;

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-ink">Conversations</h1>
        <p className="mt-1 text-muted">
          Chat-style message history from the Messages sheet.
        </p>
      </div>

      <Section title="Filters">
        <form className="grid gap-3 md:grid-cols-3">
          <input
            name="leadId"
            placeholder="Filter by leadId"
            defaultValue={params.leadId}
            className="rounded-md border border-line px-3 py-2"
          />
          <input
            name="telegramUserId"
            placeholder="Filter by telegramUserId"
            defaultValue={params.telegramUserId}
            className="rounded-md border border-line px-3 py-2"
          />
          <button className="rounded-md bg-brand px-3 py-2 font-medium text-white">
            Apply filters
          </button>
        </form>
      </Section>

      <Section title="Message history">
        {messages.length === 0 ? (
          <EmptyState
            title="No messages found"
            description="The bot must save inbound and outbound messages to the Messages sheet before conversations appear here."
          />
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.messageId}
                className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-2xl rounded-lg border p-3 ${
                    message.direction === "outbound"
                      ? "border-blue-100 bg-blue-50"
                      : "border-line bg-slate-50"
                  }`}
                >
                  <div className="mb-1 flex flex-wrap gap-2 text-xs text-muted">
                    <span>{message.direction}</span>
                    <span>{message.telegramUserId}</span>
                    <span>{message.leadId}</span>
                    <span>{formatDate(message.createdAt)}</span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-ink">
                    {message.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
