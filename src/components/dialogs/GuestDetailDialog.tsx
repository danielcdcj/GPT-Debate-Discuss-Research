"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Guest } from "@/store/types";

interface GuestDetailDialogProps {
  guest: Guest | null;
  onClose: () => void;
}

export function GuestDetailDialog({ guest, onClose }: GuestDetailDialogProps) {
  if (!guest) return null;

  const { memory } = guest;
  const hasPositions = memory.my_positions.length > 0;
  const hasKeyMoments = memory.key_moments.length > 0;
  const hasOtherGuestsSummary = memory.other_guests_summary.trim().length > 0;
  const hasUserPrefs = memory.user_preferences.trim().length > 0;
  const hasMemory = hasPositions || hasKeyMoments || hasOtherGuestsSummary || hasUserPrefs;

  return (
    <Modal isOpen={!!guest} onClose={onClose} title={guest.name} maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3">
          <span className="text-4xl">{guest.avatar}</span>
          <div>
            <h3 className="text-lg font-semibold text-white">{guest.name}</h3>
            <span className="text-xs text-slate-500">Debate Participant</span>
          </div>
        </div>

        {/* Personality / Description */}
        <div>
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
            Personality & Expertise
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            {guest.personality}
          </p>
        </div>

        {!hasMemory && (
          <div className="text-center py-3 border-t border-slate-700">
            <p className="text-xs text-slate-500 italic">
              No debate history yet — this guest hasn&apos;t participated in any rounds.
            </p>
          </div>
        )}

        {/* Positions / Stances */}
        {hasPositions && (
          <div className="border-t border-slate-700 pt-3">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Stances & Positions
            </h4>
            <div className="space-y-2">
              {memory.my_positions.map((pos, i) => (
                <div key={i} className="bg-slate-900/50 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white font-medium truncate mr-2">
                      {pos.topic}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {Math.round(pos.confidence * 100)}% confident
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{pos.stance}</p>
                  <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${pos.confidence * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Moments */}
        {hasKeyMoments && (
          <div className="border-t border-slate-700 pt-3">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Key Moments
            </h4>
            <ul className="space-y-1.5">
              {memory.key_moments.map((moment, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-300">
                  <span className="text-slate-600 shrink-0">&#8226;</span>
                  <span>{moment}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Awareness of other guests */}
        {hasOtherGuestsSummary && (
          <div className="border-t border-slate-700 pt-3">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Awareness of Other Guests
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {memory.other_guests_summary}
            </p>
          </div>
        )}

        {/* User preferences noted */}
        {hasUserPrefs && (
          <div className="border-t border-slate-700 pt-3">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Notes on User
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {memory.user_preferences}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
