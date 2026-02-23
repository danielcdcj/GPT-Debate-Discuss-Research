"use client";

import React, { useState, useCallback } from "react";
import { useStoreState, useStoreActions } from "@/hooks/useEngine";
import type { Room } from "@/core/types";
import { Button } from "@/components/ui/Button";
import { NewRoomDialog } from "@/components/dialogs/NewRoomDialog";

// ─── Room Card ──────────────────────────────────────────────────────

function RoomCard({
  room,
  isActive,
  collapsed,
  onSelect,
  onDelete,
}: {
  room: Room;
  isActive: boolean;
  collapsed: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={onSelect}
        title={room.name}
        className={`
          w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold
          transition-all duration-150
          ${
            isActive
              ? "bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/40"
              : "bg-white/[0.03] text-slate-500 hover:bg-white/[0.06] hover:text-slate-300"
          }
        `}
      >
        {room.name.charAt(0).toUpperCase()}
      </button>
    );
  }

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        group relative w-full text-left rounded-xl px-3 py-2.5 transition-all duration-150
        ${
          isActive
            ? "bg-indigo-500/10 ring-1 ring-indigo-500/25"
            : "bg-white/[0.02] hover:bg-white/[0.05]"
        }
      `}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-500" />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium truncate ${
              isActive ? "text-indigo-300" : "text-slate-200"
            }`}
          >
            {room.name}
          </p>
          {room.topic && (
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {room.topic}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-600">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {room.guests.length}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-600">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {room.messages.length}
            </span>
          </div>
        </div>

        {/* Delete button */}
        {hovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="
              flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center
              text-slate-600 hover:text-red-400 hover:bg-red-500/10
              transition-colors duration-150
            "
            title="Delete room"
          >
            <svg
              className="w-3.5 h-3.5"
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
        )}
      </div>
    </button>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────────

export function Sidebar() {
  const rooms = useStoreState(useCallback((s) => s.rooms, []));
  const activeRoomId = useStoreState(useCallback((s) => s.activeRoomId, []));
  const collapsed = useStoreState(useCallback((s) => s.sidebarCollapsed, []));
  const mobileSidebarOpen = useStoreState(
    useCallback((s) => s.mobileSidebarOpen, [])
  );
  const actions = useStoreActions();

  const [newRoomOpen, setNewRoomOpen] = useState(false);

  const handleSelectRoom = useCallback(
    (id: string) => {
      actions.setActiveRoom(id);
    },
    [actions]
  );

  const handleDeleteRoom = useCallback(
    (id: string) => {
      actions.deleteRoom(id);
    },
    [actions]
  );

  // ── Sidebar content shared between desktop and mobile ──

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={`
        flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]
        ${collapsed ? "justify-center px-0" : ""}
      `}
      >
        {/* App icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-sm font-semibold text-slate-100 tracking-tight">
              Debate Room
            </h1>
            <p className="text-[10px] text-slate-600 leading-none mt-0.5">
              Multi-Agent Discussion
            </p>
          </div>
        )}
      </div>

      {/* New Room button */}
      <div className={`px-3 pt-4 pb-2 ${collapsed ? "px-2" : ""}`}>
        {collapsed ? (
          <button
            onClick={() => setNewRoomOpen(true)}
            className="
              w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500
              flex items-center justify-center text-white
              transition-colors duration-150
              shadow-lg shadow-indigo-500/20
            "
            title="New Room"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => setNewRoomOpen(true)}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Room
          </Button>
        )}
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin">
        {rooms.length === 0 && !collapsed && (
          <div className="text-center py-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-5 h-5 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <p className="text-xs text-slate-600">No rooms yet</p>
            <p className="text-[10px] text-slate-700 mt-1">
              Create one to get started
            </p>
          </div>
        )}

        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            isActive={room.id === activeRoomId}
            collapsed={collapsed}
            onSelect={() => handleSelectRoom(room.id)}
            onDelete={() => handleDeleteRoom(room.id)}
          />
        ))}
      </div>

      {/* Collapse toggle (desktop only, hidden on mobile overlay) */}
      <div className="hidden md:flex border-t border-white/[0.06] px-3 py-3">
        <button
          onClick={() => actions.setSidebarCollapsed(!collapsed)}
          className="
            w-full flex items-center justify-center gap-2 text-xs text-slate-600
            hover:text-slate-400 transition-colors duration-150 py-1
          "
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              collapsed ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`
          hidden md:flex flex-col flex-shrink-0 h-full
          bg-[#08080e] border-r border-white/[0.06]
          transition-all duration-200
          ${collapsed ? "w-16" : "w-64"}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => actions.setMobileSidebarOpen(false)}
          />

          {/* Panel */}
          <aside className="relative w-72 h-full bg-[#08080e] border-r border-white/[0.06] shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* New Room Dialog */}
      <NewRoomDialog isOpen={newRoomOpen} onClose={() => setNewRoomOpen(false)} />
    </>
  );
}
