"use client";

import React, { useState } from "react";
import { useDebateStore } from "@/store/debate-store";
import { RoomListItem } from "./RoomListItem";
import { Button } from "@/components/ui/Button";
import { NewRoomDialog } from "@/components/dialogs/NewRoomDialog";

export function Sidebar() {
  const [showNewRoom, setShowNewRoom] = useState(false);
  const rooms = useDebateStore((s) => s.rooms);
  const activeRoomId = useDebateStore((s) => s.activeRoomId);
  const setActiveRoom = useDebateStore((s) => s.setActiveRoom);
  const deleteRoom = useDebateStore((s) => s.deleteRoom);
  const sidebarCollapsed = useDebateStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useDebateStore((s) => s.setSidebarCollapsed);
  const logout = useDebateStore((s) => s.logout);

  if (sidebarCollapsed) {
    return (
      <div className="w-12 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 gap-2 shrink-0">
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          title="Expand sidebar"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="w-[260px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎙️</span>
            <h1 className="font-bold text-white text-sm">Debate Room</h1>
          </div>
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        <div className="p-3">
          <Button
            onClick={() => setShowNewRoom(true)}
            className="w-full"
            size="sm"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Room
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {rooms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">No rooms yet</p>
              <p className="text-xs text-slate-600 mt-1">
                Create a room to get started
              </p>
            </div>
          ) : (
            rooms
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((room) => (
                <RoomListItem
                  key={room.id}
                  room={room}
                  isActive={room.id === activeRoomId}
                  onClick={() => setActiveRoom(room.id)}
                  onDelete={() => deleteRoom(room.id)}
                />
              ))
          )}
        </div>

        <div className="p-3 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <NewRoomDialog
        isOpen={showNewRoom}
        onClose={() => setShowNewRoom(false)}
      />
    </>
  );
}
