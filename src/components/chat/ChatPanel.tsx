"use client";

import React, { useEffect, useRef } from "react";
import { useDebateStore } from "@/store/debate-store";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { PhaseBadge } from "./PhaseBadge";
import { useDebateEngine } from "@/hooks/use-debate-engine";
import { exportTranscript } from "@/lib/debate-engine";
import { showToast } from "@/components/ui/Toast";

export function ChatPanel() {
  const activeRoomId = useDebateStore((s) => s.activeRoomId);
  const rooms = useDebateStore((s) => s.rooms);
  const room = rooms.find((r) => r.id === activeRoomId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage } = useDebateEngine();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [room?.messages.length, room?.messages[room.messages.length - 1]?.content]);

  const handleExport = (format: "full" | "summary" | "json") => {
    if (!activeRoomId) return;
    const content = exportTranscript(activeRoomId, format);
    const ext = format === "json" ? "json" : "md";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debate-${room?.name || "export"}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported successfully", "success");
  };

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="text-6xl mb-4">🎙️</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Welcome to Debate Room
          </h2>
          <p className="text-slate-400 text-sm max-w-sm">
            Create a new room or select an existing one to start a
            multi-agent discussion.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/50 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-white truncate">
              {room.name}
            </h2>
            <PhaseBadge phase={room.phase} />
            <span className="text-xs text-slate-500 shrink-0">
              Round {room.round}
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {room.topic}
          </p>
        </div>

        <div className="relative group shrink-0 ml-2">
          <button className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
          <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[160px]">
            <button
              onClick={() => handleExport("full")}
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 rounded-t-lg"
            >
              Full Transcript (.md)
            </button>
            <button
              onClick={() => handleExport("summary")}
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
            >
              Summary Only (.md)
            </button>
            <button
              onClick={() => handleExport("json")}
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 rounded-b-lg"
            >
              Raw Data (.json)
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {room.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-slate-500">No messages yet</p>
              <p className="text-xs text-slate-600 mt-1">
                {room.guests.length === 0
                  ? "Add some guests in the right panel, then start the debate"
                  : "Type a message to start the debate"}
              </p>
            </div>
          </div>
        ) : (
          room.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        phase={room.phase}
        pendingCount={room.pendingUserMessages.length}
      />
    </div>
  );
}
