"use client";

import React, { useState, useRef, useEffect } from "react";
import { useDebateStore } from "@/store/debate-store";
import { DebatePhase } from "@/store/types";

interface ChatInputProps {
  onSend: (message: string) => void;
  phase: DebatePhase;
  pendingCount: number;
}

export function ChatInput({ onSend, phase, pendingCount }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeRoomId = useDebateStore((s) => s.activeRoomId);

  const isRoundActive =
    phase === "GUESTS_RESPONDING" ||
    phase === "HOST_SUMMARIZING" ||
    phase === "RESEARCH_PHASE" ||
    phase === "HOST_PRESENTING";

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || !activeRoomId) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900/50 p-4">
      {isRoundActive && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-amber-950/30 border border-amber-800/30 rounded-lg">
          <span className="text-amber-400 text-sm">⏳</span>
          <span className="text-xs text-amber-300/80">
            Round in progress — your message will be queued
          </span>
          {pendingCount > 0 && (
            <span className="ml-auto text-xs text-amber-400/60">
              {pendingCount} message{pendingCount !== 1 ? "s" : ""} queued
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !activeRoomId
              ? "Select or create a room..."
              : phase === "IDLE"
              ? "Start the debate..."
              : "Type your message..."
          }
          disabled={!activeRoomId}
          rows={1}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 resize-none focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || !activeRoomId}
          className="shrink-0 w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors self-end"
        >
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
              d="M5 12h14M12 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
