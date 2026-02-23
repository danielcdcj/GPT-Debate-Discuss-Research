"use client";

import React, { useCallback } from "react";
import { useStoreState, useStoreActions } from "@/hooks/useEngine";
import type { Guest } from "@/core/types";
import { Modal } from "@/components/ui/Modal";
import { ModelSelector } from "@/components/panels/ModelSelector";

// ─── Types ──────────────────────────────────────────────────────────

interface GuestDetailDialogProps {
  guest: Guest | null;
  roomId: string | null;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function GuestDetailDialog({ guest, roomId, onClose }: GuestDetailDialogProps) {
  const selectedGuestModel = useStoreState(useCallback((s) => s.selectedGuestModel, []));
  const actions = useStoreActions();

  if (!guest || !roomId) return null;

  const isOpen = Boolean(guest);

  const { structured } = guest.memory;
  const hasPositions = structured.positions.length > 0;
  const hasKeyMoments = structured.keyMoments.length > 0;
  const hasOtherGuestsSummary = structured.otherGuestsSummary.length > 0;
  const hasUserPreferences = structured.userPreferences.length > 0;
  const hasAnyMemory = hasPositions || hasKeyMoments || hasOtherGuestsSummary || hasUserPreferences;

  function handleModelChange(model: string) {
    if (roomId && guest) {
      actions.updateGuestModel(roomId, guest.id, model);
    }
  }

  // Determine which model value to display
  const currentModel = guest.model || selectedGuestModel;
  const isUsingDefault = !guest.model;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guest Details"
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* Header: Avatar + Name */}
        <div className="flex items-center gap-4">
          <span className="text-5xl">{guest.avatar}</span>
          <div>
            <h3 className="text-xl font-semibold text-white">{guest.name}</h3>
            <span className="text-xs text-slate-500">ID: {guest.id}</span>
          </div>
        </div>

        {/* Personality & Expertise */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Personality & Expertise
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {guest.personality}
          </p>
        </section>

        {/* Model Selector */}
        <section>
          <ModelSelector
            label="Model"
            value={currentModel}
            onChange={handleModelChange}
          />
          {isUsingDefault && (
            <p className="text-[11px] text-slate-500 mt-1.5">
              Using default guest model
            </p>
          )}
        </section>

        {/* Debate Memory */}
        {hasAnyMemory ? (
          <>
            {/* Stances & Positions */}
            {hasPositions && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Stances & Positions
                </h4>
                <div className="space-y-3">
                  {structured.positions.map((pos, i) => {
                    const confidencePercent = Math.round(pos.confidence * 100);
                    return (
                      <div
                        key={i}
                        className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-white">{pos.topic}</p>
                          <span className="shrink-0 text-xs font-medium text-indigo-400">
                            {confidencePercent}%
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{pos.stance}</p>
                        {/* Confidence bar */}
                        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500"
                            style={{ width: `${confidencePercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Key Moments */}
            {hasKeyMoments && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Key Moments
                </h4>
                <ul className="space-y-1.5">
                  {structured.keyMoments.map((moment, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>{moment}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Awareness of Other Guests */}
            {hasOtherGuestsSummary && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Awareness of Other Guests
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {structured.otherGuestsSummary}
                </p>
              </section>
            )}

            {/* Notes on User */}
            {hasUserPreferences && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Notes on User
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {structured.userPreferences}
                </p>
              </section>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-8 flex flex-col items-center justify-center">
            <p className="text-sm text-slate-500">No debate history yet</p>
            <p className="text-xs text-slate-600 mt-1">
              Memory will build as the conversation progresses.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
