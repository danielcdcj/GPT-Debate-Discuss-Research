"use client";

import React, { useState, useCallback } from "react";
import { useStoreState, useStoreActions } from "@/hooks/useEngine";
import type { Guest, Room } from "@/core/types";
import { Button } from "@/components/ui/Button";
import { AddGuestDialog } from "@/components/dialogs/AddGuestDialog";
import { GuestDetailDialog } from "@/components/dialogs/GuestDetailDialog";

export function GuestsPanel() {
  const activeRoom: Room | undefined = useStoreState(
    useCallback(
      (s) => (s.activeRoomId ? s.rooms.find((r) => r.id === s.activeRoomId) : undefined),
      []
    )
  );
  const activeRoomId = useStoreState(useCallback((s) => s.activeRoomId, []));

  const { removeGuest } = useStoreActions();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  const guests = activeRoom?.guests ?? [];

  function handleRemoveGuest(e: React.MouseEvent, guestId: string) {
    e.stopPropagation();
    if (activeRoomId) {
      removeGuest(activeRoomId, guestId);
    }
  }

  // No active room fallback
  if (!activeRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <div className="text-slate-600 text-sm">
          Select or create a room to manage guests.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-sm font-medium text-white">
          Guests{" "}
          <span className="text-slate-500">({guests.length})</span>
        </h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowAddDialog(true)}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add
        </Button>
      </div>

      {/* Guest list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {guests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-3xl mb-3 opacity-40">
              {/* User group icon placeholder */}
              <svg
                className="h-10 w-10 text-slate-700 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-slate-500 mb-1">No guests yet</p>
            <p className="text-xs text-slate-600">
              Add guests to join the debate.
            </p>
          </div>
        ) : (
          guests.map((guest) => (
            <GuestCard
              key={guest.id}
              guest={guest}
              onClick={() => setSelectedGuest(guest)}
              onRemove={(e) => handleRemoveGuest(e, guest.id)}
            />
          ))
        )}
      </div>

      {/* Dialogs */}
      <AddGuestDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        roomId={activeRoom.id}
      />

      {selectedGuest && activeRoomId && (
        <GuestDetailDialog
          guest={selectedGuest}
          roomId={activeRoomId}
          onClose={() => setSelectedGuest(null)}
        />
      )}
    </div>
  );
}

// ── Guest Card ────────────────────────────────────────────────────────

interface GuestCardProps {
  guest: Guest;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
}

function GuestCard({ guest, onClick, onRemove }: GuestCardProps) {
  const positions = guest.memory.structured.positions;

  return (
    <button
      type="button"
      onClick={onClick}
      className="
        w-full text-left rounded-xl border border-white/[0.06] bg-[rgba(255,255,255,0.03)]
        p-3 transition-colors hover:bg-white/[0.05] hover:border-white/[0.1]
        group relative
      "
    >
      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="
          absolute top-2 right-2 p-1 rounded-md
          text-slate-600 hover:text-red-400 hover:bg-red-500/10
          opacity-0 group-hover:opacity-100 transition-all
        "
        aria-label={`Remove ${guest.name}`}
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Avatar and name */}
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className="text-lg leading-none">{guest.avatar}</span>
        <span className="text-sm font-medium text-white truncate pr-6">
          {guest.name}
        </span>
      </div>

      {/* Personality - truncated to 2 lines */}
      {guest.personality && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-1.5 leading-relaxed">
          {guest.personality}
        </p>
      )}

      {/* Model ID */}
      {guest.model && (
        <div className="text-[11px] text-indigo-400/70 truncate mb-1.5">
          {guest.model}
        </div>
      )}

      {/* Positions with confidence bars */}
      {positions.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-white/[0.04]">
          {positions.map((pos, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 truncate flex-1">
                  {pos.topic}
                </span>
                <span className="text-[10px] text-slate-600 ml-2 shrink-0">
                  {Math.round(pos.confidence * 100)}%
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500/50 transition-all duration-300"
                  style={{ width: `${pos.confidence * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export default GuestsPanel;
