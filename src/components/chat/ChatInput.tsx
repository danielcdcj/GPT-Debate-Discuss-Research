"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useStoreState, useStore } from "@/hooks/useEngine";
import type { Phase } from "@/core/types";
import { sendMessage } from "@/core/engine";
import { Button } from "@/components/ui/Button";

interface ChatInputProps {
  roomId: string;
  disabled?: boolean;
}

// Map phases to human-readable status text
function getPhaseStatusText(phase: Phase): string | null {
  switch (phase) {
    case "HOST_THINKING":
      return "Host is thinking...";
    case "HOST_PRESENTING":
      return "Host is presenting...";
    case "GUESTS_RESPONDING":
      return "Guests responding...";
    case "GUEST_EXCHANGE":
      return "Guests debating each other...";
    case "RESEARCH_PHASE":
      return "Researching...";
    case "FACT_CHECK":
      return "Fact-checking...";
    case "IDLE":
      return "Start a debate to begin chatting";
    default:
      return null;
  }
}

// Arrow send icon
function SendIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </svg>
  );
}

export default function ChatInput({ roomId, disabled: disabledProp }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const store = useStore();

  const phase = useStoreState(
    useCallback((s) => {
      const room = s.rooms.find((r) => r.id === roomId);
      return room?.phase ?? "IDLE";
    }, [roomId])
  );

  const isBusy = phase !== "AWAITING_USER";
  const isDisabled = disabledProp || phase === "IDLE";
  const statusText = getPhaseStatusText(phase);

  // Auto-resize textarea to fit content (up to 5 rows)
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    // Single row is approx 24px; max 5 rows = ~120px
    const maxHeight = 120;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (isBusy) {
      // Queue the message for when the phase returns to AWAITING_USER
      store.queueUserMessage(roomId, trimmed);
    } else {
      // Send immediately
      sendMessage(roomId, trimmed);
    }

    setText("");
    // Reset textarea height after clearing
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    });
  }, [text, isBusy, roomId, store]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="px-4 pb-4 pt-2">
      {/* Phase status indicator */}
      {isBusy && statusText && !isDisabled && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <span className="text-xs text-slate-500">{statusText}</span>
        </div>
      )}

      {/* Input area */}
      <div
        className={`
          flex items-end gap-2
          rounded-xl
          border transition-all duration-200
          ${isDisabled
            ? "border-white/[0.04] bg-white/[0.01]"
            : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] focus-within:border-indigo-500/40 focus-within:shadow-[0_0_12px_rgba(99,102,241,0.08)]"
          }
          px-3 py-2
        `}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isDisabled
              ? (statusText || "Waiting...")
              : isBusy
                ? "Type a message (will be queued)..."
                : "Type your message..."
          }
          disabled={isDisabled}
          rows={1}
          className={`
            flex-1 resize-none bg-transparent outline-none
            text-sm text-slate-200 placeholder:text-slate-600
            disabled:cursor-not-allowed disabled:text-slate-600
            leading-6 py-0.5
            scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10
          `}
          style={{ maxHeight: "120px" }}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={isDisabled || !text.trim()}
          className={`
            shrink-0 !rounded-lg !px-2.5 !py-2
            ${!text.trim() || isDisabled
              ? "opacity-30"
              : "shadow-lg shadow-indigo-500/20"
            }
          `}
          aria-label="Send message"
        >
          <SendIcon />
        </Button>
      </div>

      {/* Hint text */}
      <div className="mt-1.5 px-1 flex justify-between items-center">
        <span className="text-[10px] text-slate-600">
          {isBusy && !isDisabled
            ? "Messages will be queued and sent when ready"
            : "Enter to send, Shift+Enter for newline"
          }
        </span>
      </div>
    </div>
  );
}
