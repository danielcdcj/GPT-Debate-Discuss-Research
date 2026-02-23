"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfmModule from "remark-gfm";
import { Message } from "@/store/types";

// remark-gfm v4 is ESM-only; CJS interop wraps it in { default: fn }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const remarkGfm = (remarkGfmModule as any).default || remarkGfmModule;
import { useDebateStore } from "@/store/debate-store";
import { Modal } from "@/components/ui/Modal";

interface MessageBubbleProps {
  message: Message;
}

const COLLAPSE_THRESHOLD = 280;

export function MessageBubble({ message }: MessageBubbleProps) {
  const expandedMessageId = useDebateStore((s) => s.expandedMessageId);
  const setExpandedMessageId = useDebateStore((s) => s.setExpandedMessageId);
  const [showGuestModal, setShowGuestModal] = useState(false);

  const isExpanded = expandedMessageId === message.id;
  const isLong = message.content.length > COLLAPSE_THRESHOLD;
  const shouldCollapse = isLong && !isExpanded && !message.isStreaming;
  const isGuest = message.role === "guest";
  const isHost = message.role === "host";

  const roleConfig = getRoleConfig(message);

  // Guest messages: show collapsed status with "Show" button
  if (isGuest) {
    const isDone = !message.isLoading && !message.isStreaming;
    const isThinking = message.isLoading || message.isStreaming;

    return (
      <>
        <div className={`flex gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 ${roleConfig.bg} rounded-lg`}>
          <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-base sm:text-lg bg-slate-800">
            {roleConfig.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${roleConfig.nameColor}`}>
                {roleConfig.name}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1.5">
              {isThinking ? (
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                  Thinking...
                </span>
              ) : isDone && message.content ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Done
                  </span>
                  <button
                    onClick={() => setShowGuestModal(true)}
                    className="text-xs px-2.5 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors border border-slate-600"
                  >
                    Show
                  </button>
                </div>
              ) : isDone && message.isError ? (
                <span className="text-xs text-red-400">Error</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Guest response modal */}
        <Modal
          isOpen={showGuestModal}
          onClose={() => setShowGuestModal(false)}
          title={`${roleConfig.emoji} ${roleConfig.name}`}
          maxWidth="max-w-2xl"
        >
          <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        </Modal>
      </>
    );
  }

  // Host messages: render with markdown
  if (isHost) {
    return (
      <div className={`flex gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 ${roleConfig.bg} rounded-lg`}>
        <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-base sm:text-lg bg-slate-800">
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

          <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white prose-a:text-indigo-400">
            <ReactMarkdown>{message.content}</ReactMarkdown>
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
        </div>
      </div>
    );
  }

  // User and system messages: plain text (original behavior)
  return (
    <div className={`flex gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 ${roleConfig.bg} rounded-lg`}>
      <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-base sm:text-lg bg-slate-800">
        {roleConfig.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-medium ${roleConfig.nameColor}`}>
            {roleConfig.name}
          </span>
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
            {isExpanded ? "Show less" : "Show more"}
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
        emoji: "\uD83C\uDF99\uFE0F",
        name: "Host",
        nameColor: "text-indigo-400",
        bg: "bg-indigo-950/20",
      };
    case "guest":
      return {
        emoji: message.guestAvatar || "\uD83D\uDC64",
        name: message.guestName || "Guest",
        nameColor: "text-emerald-400",
        bg: "bg-emerald-950/20",
      };
    case "user":
      return {
        emoji: "\uD83D\uDC64",
        name: "You",
        nameColor: "text-pink-400",
        bg: "bg-pink-950/20",
      };
    case "system":
      return {
        emoji: "\uD83D\uDCE2",
        name: "System",
        nameColor: "text-amber-400",
        bg: "bg-amber-950/20",
      };
  }
}
