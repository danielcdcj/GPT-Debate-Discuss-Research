"use client";

import React from "react";
import { Message } from "@/store/types";
import { useDebateStore } from "@/store/debate-store";

interface MessageBubbleProps {
  message: Message;
}

const COLLAPSE_THRESHOLD = 280;

export function MessageBubble({ message }: MessageBubbleProps) {
  const expandedMessageId = useDebateStore((s) => s.expandedMessageId);
  const setExpandedMessageId = useDebateStore((s) => s.setExpandedMessageId);

  const isExpanded = expandedMessageId === message.id;
  const isLong = message.content.length > COLLAPSE_THRESHOLD;
  const shouldCollapse = isLong && !isExpanded && !message.isStreaming;

  const roleConfig = getRoleConfig(message);

  return (
    <div className={`flex gap-3 px-4 py-3 ${roleConfig.bg} rounded-lg`}>
      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg bg-slate-800">
        {roleConfig.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-medium ${roleConfig.nameColor}`}>
            {roleConfig.name}
          </span>
          {message.isSummary && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-900/50 text-indigo-300 border border-indigo-700/30">
              Summary
            </span>
          )}
          {message.isError && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 border border-red-700/30">
              Error
            </span>
          )}
          <span className="text-xs text-slate-500">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>

        <div className="relative">
          <div
            className={`text-sm text-slate-300 whitespace-pre-wrap break-words ${
              shouldCollapse ? "max-h-[4.5em] overflow-hidden" : ""
            }`}
          >
            {message.content}
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 bg-slate-400 animate-pulse ml-0.5 align-middle" />
            )}
            {message.isLoading && !message.isStreaming && (
              <span className="flex gap-1 mt-1">
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            )}
          </div>

          {shouldCollapse && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-800/90 to-transparent" />
          )}
        </div>

        {isLong && !message.isStreaming && (
          <button
            onClick={() =>
              setExpandedMessageId(isExpanded ? null : message.id)
            }
            className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 transition-colors"
          >
            {isExpanded ? "Show less ▲" : "Show more ▼"}
          </button>
        )}
      </div>
    </div>
  );
}

function getRoleConfig(message: Message) {
  switch (message.role) {
    case "host":
      return {
        emoji: "🎤",
        name: "Host",
        nameColor: "text-indigo-400",
        bg: "bg-indigo-950/20",
      };
    case "guest":
      return {
        emoji: message.guestAvatar || "👤",
        name: message.guestName || "Guest",
        nameColor: "text-emerald-400",
        bg: "bg-emerald-950/20",
      };
    case "user":
      return {
        emoji: "👤",
        name: "You",
        nameColor: "text-pink-400",
        bg: "bg-pink-950/20",
      };
    case "system":
      return {
        emoji: "📢",
        name: "System",
        nameColor: "text-amber-400",
        bg: "bg-amber-950/20",
      };
  }
}
