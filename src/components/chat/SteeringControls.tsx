"use client";

import React, { useCallback } from "react";
import { useStoreState } from "@/hooks/useEngine";
import { steerDebate } from "@/core/engine";

interface SteeringControlsProps {
  roomId: string;
}

export function SteeringControls({ roomId }: SteeringControlsProps) {
  const phase = useStoreState(
    useCallback((s) => {
      const room = s.rooms.find((r) => r.id === roomId);
      return room?.phase ?? "IDLE";
    }, [roomId])
  );

  // Only show when awaiting user input
  if (phase !== "AWAITING_USER") return null;

  return (
    <div className="flex items-center gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-thin">
      <SteerButton
        icon={
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        label="Research this"
        onClick={() => steerDebate(roomId, "research_this")}
      />
      <SteerButton
        icon={
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        }
        label="Go deeper"
        onClick={() => steerDebate(roomId, "go_deeper")}
      />
      <SteerButton
        icon={
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        }
        label="Move on"
        onClick={() => steerDebate(roomId, "move_on")}
      />
      <SteerButton
        icon={
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        label="Challenge"
        onClick={() => steerDebate(roomId, "challenge_guest")}
      />
    </div>
  );
}

function SteerButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg
        text-[11px] font-medium text-slate-400
        bg-white/[0.03] border border-white/[0.06]
        hover:bg-white/[0.06] hover:text-slate-200 hover:border-white/[0.1]
        transition-all duration-150 whitespace-nowrap shrink-0
      "
    >
      {icon}
      {label}
    </button>
  );
}

export default SteeringControls;
