"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useStoreState } from "@/hooks/useEngine";
import type { Message, Room } from "@/core/types";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import SteeringControls from "./SteeringControls";

// -- Empty state when no room is selected --

function NoRoomSelected() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <svg
          className="w-7 h-7 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm text-slate-500 font-medium">No room selected</p>
        <p className="text-xs text-slate-600 mt-1">
          Select or create a room to begin
        </p>
      </div>
    </div>
  );
}

// -- Empty state when room has no messages yet --

function EmptyRoom({ room }: { room: Room }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <svg
          className="w-7 h-7 text-indigo-400/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>
      <div className="text-center max-w-sm">
        <p className="text-sm text-slate-400 font-medium">{room.topic}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="flex gap-1">
            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
            <span
              className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"
              style={{ animationDelay: "200ms" }}
            />
            <span
              className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"
              style={{ animationDelay: "400ms" }}
            />
          </div>
          <p className="text-xs text-slate-600">Starting conversation...</p>
        </div>
      </div>
    </div>
  );
}

// -- Main Chat Panel --

export function ChatPanel() {
  const activeRoomId = useStoreState(
    useCallback((s) => s.activeRoomId, [])
  );

  const room = useStoreState(
    useCallback(
      (s) => {
        if (!activeRoomId) return null;
        return s.rooms.find((r) => r.id === activeRoomId) ?? null;
      },
      [activeRoomId]
    )
  );

  const messages: Message[] = room?.messages ?? [];

  // Ref for the scrollable messages container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or content changes
  useEffect(() => {
    if (!scrollAnchorRef.current) return;
    scrollAnchorRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  // No room selected
  if (!activeRoomId || !room) {
    return (
      <div
        className="flex flex-col h-full"
        style={{ background: "#08080e" }}
      >
        <NoRoomSelected />
      </div>
    );
  }

  // Room exists but no messages yet
  if (messages.length === 0) {
    return (
      <div
        className="flex flex-col h-full"
        style={{ background: "#08080e" }}
      >
        <EmptyRoom room={room} />
        <ChatInput roomId={activeRoomId} />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "#08080e" }}
    >
      {/* Messages list */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain py-4 space-y-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/5 hover:scrollbar-thumb-white/10"
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Scroll anchor -- invisible element at the bottom */}
        <div ref={scrollAnchorRef} className="h-px" />
      </div>

      {/* Steering controls */}
      <SteeringControls roomId={activeRoomId} />

      {/* Chat input pinned to bottom */}
      <ChatInput roomId={activeRoomId} />
    </div>
  );
}

export default ChatPanel;
