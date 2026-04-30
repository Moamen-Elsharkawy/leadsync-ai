import { ManagerChatbotPanel } from "../../../components/manager-chatbot-panel";
import { PageHeader } from "../../../components/ui";

export default function ManagerChatbotPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Manager Chatbot"
        description="Ask anything about your company performance using data grounded only in your Google Sheets records."
      />
      <ManagerChatbotPanel />
    </div>
  );
}
