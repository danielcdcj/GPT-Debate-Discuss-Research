"use client";

import React from "react";
import { DebatePhase } from "@/store/types";

interface PhaseBadgeProps {
  phase: DebatePhase;
}

const phaseConfig: Record<
  DebatePhase,
  { label: string; emoji: string; color: string }
> = {
  IDLE: { label: "Idle", emoji: "💤", color: "bg-slate-700 text-slate-300" },
  AWAITING_USER: {
    label: "Your Turn",
    emoji: "✍️",
    color: "bg-pink-900/50 text-pink-300 border border-pink-700/50",
  },
  GUESTS_RESPONDING: {
    label: "Guests Responding",
    emoji: "💬",
    color:
      "bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 animate-pulse",
  },
  HOST_SUMMARIZING: {
    label: "Host Summarizing",
    emoji: "🎤",
    color:
      "bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 animate-pulse",
  },
  RESEARCH_PHASE: {
    label: "Researching",
    emoji: "📚",
    color:
      "bg-amber-900/50 text-amber-300 border border-amber-700/50 animate-pulse",
  },
  HOST_PRESENTING: {
    label: "Host Presenting",
    emoji: "🎤",
    color: "bg-indigo-900/50 text-indigo-300 border border-indigo-700/50",
  },
};

export function PhaseBadge({ phase }: PhaseBadgeProps) {
  const config = phaseConfig[phase];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
    >
      <span>{config.emoji}</span>
      {config.label}
    </span>
  );
}
