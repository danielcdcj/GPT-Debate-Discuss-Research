"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfmModule from "remark-gfm";
import type { Message } from "@/core/types";

// Handle remark-gfm ESM interop
const remarkGfm = (remarkGfmModule as any).default || remarkGfmModule;

interface MessageBubbleProps {
  message: Message;
}

// -- Role-based style configuration --

const roleStyles = {
  host: {
    alignment: "justify-start",
    border: "border-l-[3px] border-indigo-500",
    bg: "bg-[rgba(99,102,241,0.05)]",
    summaryBg: "bg-[rgba(99,102,241,0.08)]",
    nameColor: "text-indigo-400",
    textColor: "text-slate-200",
  },
  guest: {
    alignment: "justify-start",
    border: "border-l-[3px] border-emerald-500",
    bg: "bg-[rgba(16,185,129,0.05)]",
    summaryBg: "bg-[rgba(16,185,129,0.08)]",
    nameColor: "text-emerald-400",
    textColor: "text-slate-200",
  },
  user: {
    alignment: "justify-end",
    border: "border-r-[3px] border-violet-500",
    bg: "bg-[rgba(139,92,246,0.08)]",
    summaryBg: "bg-[rgba(139,92,246,0.12)]",
    nameColor: "text-violet-400",
    textColor: "text-slate-200",
  },
  system: {
    alignment: "justify-center",
    border: "",
    bg: "",
    summaryBg: "",
    nameColor: "text-amber-400",
    textColor: "text-amber-400/80",
  },
} as const;

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// -- Streaming cursor component --

function StreamingCursor() {
  return (
    <span className="inline-block ml-1 w-2 h-4 bg-indigo-400 rounded-sm animate-pulse" />
  );
}

// -- System message (special layout, no bubble) --

function SystemMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-center py-2">
      <div className="flex items-center gap-2 text-xs text-amber-400/80 max-w-lg text-center">
        <svg
          className="w-3.5 h-3.5 shrink-0 text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
          />
        </svg>
        <span className={message.isError ? "text-red-400" : ""}>
          {message.content}
        </span>
      </div>
    </div>
  );
}

// -- Role label with icon --

function RoleLabel({ message }: { message: Message }) {
  const style = roleStyles[message.role];

  if (message.role === "host") {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-medium ${style.nameColor}`}>
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
        <span>Host</span>
        {message.isSummary && (
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300">
            Summary
          </span>
        )}
      </div>
    );
  }

  if (message.role === "guest") {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-medium ${style.nameColor}`}>
        <span className="text-sm">{message.guestAvatar || "?"}</span>
        <span>{message.guestName || "Guest"}</span>
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-medium ${style.nameColor}`}>
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span>You</span>
      </div>
    );
  }

  return null;
}

// -- Markdown content renderer --

function MarkdownContent({
  content,
  isSummary,
}: {
  content: string;
  isSummary: boolean;
}) {
  return (
    <div
      className={`markdown-content prose prose-invert prose-sm max-w-none
        prose-p:my-1.5 prose-p:leading-relaxed
        prose-headings:text-slate-200 prose-headings:font-semibold
        prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
        prose-strong:text-slate-100
        prose-ul:my-1.5 prose-ol:my-1.5
        prose-li:my-0.5
        prose-code:text-indigo-300 prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
        prose-pre:bg-[rgba(0,0,0,0.3)] prose-pre:border prose-pre:border-white/5 prose-pre:rounded-lg
        prose-blockquote:border-indigo-500/40 prose-blockquote:text-slate-400
        prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
        prose-table:text-xs
        prose-th:text-slate-300 prose-th:border-white/10
        prose-td:border-white/5
        ${isSummary ? "text-[13px]" : "text-[13px]"}
      `}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

// -- Main component --

export default function MessageBubble({ message }: MessageBubbleProps) {
  // System messages use a distinct layout
  if (message.role === "system") {
    return <SystemMessage message={message} />;
  }

  const style = roleStyles[message.role];
  const isUser = message.role === "user";
  const isSummary = message.isSummary;
  const isError = message.isError;

  const bubbleBg = useMemo(() => {
    if (isError) return "bg-red-500/5";
    if (isSummary) return style.summaryBg;
    return style.bg;
  }, [isError, isSummary, style]);

  const borderStyle = useMemo(() => {
    if (isError) {
      return isUser
        ? "border-r-[3px] border-red-500"
        : "border-l-[3px] border-red-500";
    }
    return style.border;
  }, [isError, isUser, style]);

  return (
    <div className={`flex ${style.alignment} px-4 py-1`}>
      <div
        className={`
          relative max-w-[85%] md:max-w-[75%] lg:max-w-[70%]
          rounded-xl
          ${borderStyle}
          ${bubbleBg}
          ${isSummary ? "px-5 py-4" : "px-4 py-3"}
          transition-colors duration-150
        `}
        style={{
          border: isError
            ? undefined
            : undefined,
          boxShadow: isSummary
            ? "0 0 20px rgba(99, 102, 241, 0.04)"
            : undefined,
        }}
      >
        {/* Role label */}
        <div className={`mb-1.5 ${isUser ? "text-right" : "text-left"}`}>
          <RoleLabel message={message} />
        </div>

        {/* Message content */}
        <div className={`${isError ? "text-red-300" : style.textColor}`}>
          <MarkdownContent
            content={message.content}
            isSummary={isSummary}
          />
          {message.isStreaming && <StreamingCursor />}
        </div>

        {/* Timestamp */}
        <div
          className={`mt-2 text-[10px] text-slate-500 ${isUser ? "text-left" : "text-right"}`}
        >
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
}
