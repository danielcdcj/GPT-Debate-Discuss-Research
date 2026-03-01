"use client";

import React, { useCallback } from "react";
import { useStoreState } from "@/hooks/useEngine";
import type { Guest, Room } from "@/core/types";

// ─── Position Tracker Panel ─────────────────────────────────────────

export function PositionTracker() {
  const activeRoom: Room | undefined = useStoreState(
    useCallback(
      (s) => (s.activeRoomId ? s.rooms.find((r) => r.id === s.activeRoomId) : undefined),
      []
    )
  );

  if (!activeRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <div className="text-slate-600 text-sm">Select a room to track positions.</div>
      </div>
    );
  }

  const guests = activeRoom.guests;
  const intensity = activeRoom.debateIntensity || 0;

  if (guests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center py-12">
        <p className="text-sm text-slate-500">No guests in this debate yet.</p>
      </div>
    );
  }

  // Collect all unique topics across guests
  const allTopics = new Set<string>();
  for (const guest of guests) {
    for (const pos of guest.memory.structured.positions) {
      allTopics.add(pos.topic);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with intensity meter */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-sm font-medium text-white mb-2">Debate Tracker</h3>
        <IntensityMeter intensity={intensity} />
      </div>

      {/* Guest position cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Topic-based view */}
        {Array.from(allTopics).map((topic) => (
          <TopicCard key={topic} topic={topic} guests={guests} />
        ))}

        {/* If no positions yet, show guest list */}
        {allTopics.size === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-slate-500">Positions will appear as the debate progresses.</p>
            <div className="mt-4 space-y-2">
              {guests.map((g) => (
                <div key={g.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
                  <span className="text-sm">{g.avatar}</span>
                  <span className="text-xs text-slate-400">{g.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Intensity Meter ─────────────────────────────────────────────────

function IntensityMeter({ intensity }: { intensity: number }) {
  const pct = Math.round(intensity * 100);
  const color =
    intensity < 0.3 ? "bg-emerald-500" :
    intensity < 0.6 ? "bg-yellow-500" :
    intensity < 0.8 ? "bg-orange-500" :
    "bg-red-500";

  const label =
    intensity < 0.2 ? "Calm" :
    intensity < 0.4 ? "Warming up" :
    intensity < 0.6 ? "Active" :
    intensity < 0.8 ? "Heated" :
    "Intense";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Debate Intensity</span>
        <span className="text-[10px] text-slate-400">{label}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Topic Card (shows all guest positions on a topic) ──────────────

function TopicCard({ topic, guests }: { topic: string; guests: Guest[] }) {
  const guestsWithPosition = guests.filter((g) =>
    g.memory.structured.positions.some((p) => p.topic === topic)
  );

  if (guestsWithPosition.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[rgba(255,255,255,0.02)] p-3">
      <h4 className="text-xs font-medium text-slate-300 mb-2 truncate">{topic}</h4>
      <div className="space-y-2">
        {guestsWithPosition.map((guest) => {
          const pos = guest.memory.structured.positions.find((p) => p.topic === topic)!;
          return (
            <div key={guest.id} className="flex items-start gap-2">
              <span className="text-sm shrink-0 mt-0.5">{guest.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 truncate">{guest.name}</span>
                  <span className="text-[10px] text-slate-600 shrink-0">
                    {Math.round(pos.confidence * 100)}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                  {pos.stance}
                </p>
                <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full bg-indigo-500/50 transition-all duration-300"
                    style={{ width: `${pos.confidence * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PositionTracker;
