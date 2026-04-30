"use client";

import { useState } from "react";
import { ManagerChatbotPanel } from "./manager-chatbot-panel";

export function FloatingManagerChatbot() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-30">
      {open ? (
        <div className="mb-3 w-[380px] max-w-[92vw]">
          <ManagerChatbotPanel compact />
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg"
      >
        {open ? "Close Chatbot" : "Manager Chatbot"}
      </button>
    </div>
  );
}
