"use client";

import React, { useState } from "react";
import { useDebateStore } from "@/store/debate-store";
import { Button } from "@/components/ui/Button";
import { AddGuestDialog } from "@/components/dialogs/AddGuestDialog";

export function GuestsTab() {
  const [showAddGuest, setShowAddGuest] = useState(false);
  const activeRoomId = useDebateStore((s) => s.activeRoomId);
  const rooms = useDebateStore((s) => s.rooms);
  const room = rooms.find((r) => r.id === activeRoomId);
  const removeGuest = useDebateStore((s) => s.removeGuest);

  if (!room) {
    return (
      <div className="p-4 text-sm text-slate-500 text-center">
        Select a room first
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Guests ({room.guests.length})
          </h3>
          <Button
            size="sm"
            onClick={() => setShowAddGuest(true)}
          >
            + Add
          </Button>
        </div>

        {room.guests.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">👥</div>
            <p className="text-sm text-slate-500">No guests yet</p>
            <p className="text-xs text-slate-600 mt-1">
              Add debate participants to get started
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {room.guests.map((guest) => (
              <div
                key={guest.id}
                className="bg-slate-800 rounded-lg border border-slate-700 p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{guest.avatar}</span>
                    <div>
                      <h4 className="text-sm font-medium text-white">
                        {guest.name}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                        {guest.personality}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeGuest(room.id, guest.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1 shrink-0"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {guest.memory.my_positions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                      Positions
                    </p>
                    {guest.memory.my_positions.map((pos, i) => (
                      <div key={i} className="flex items-center gap-1.5 mt-1">
                        <div
                          className="h-1.5 rounded-full bg-emerald-500"
                          style={{ width: `${pos.confidence * 40}px` }}
                        />
                        <span className="text-[10px] text-slate-400 truncate">
                          {pos.topic}: {pos.stance}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AddGuestDialog
        isOpen={showAddGuest}
        onClose={() => setShowAddGuest(false)}
      />
    </>
  );
}
