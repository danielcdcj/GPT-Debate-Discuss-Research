"use client";

import React, { useState } from "react";
import { DebateRoom } from "@/store/types";

interface RoomListItemProps {
  room: DebateRoom;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function RoomListItem({
  room,
  isActive,
  onClick,
  onDelete,
}: RoomListItemProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const timeAgo = getTimeAgo(room.createdAt);

  return (
    <div
      className={`group relative px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
        isActive
          ? "bg-indigo-600/20 border border-indigo-500/30 text-white"
          : "text-slate-300 hover:bg-slate-800 border border-transparent"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium truncate">{room.name}</h3>
          <p className="text-xs text-slate-500 truncate mt-0.5">{room.topic}</p>
        </div>
        {showConfirm ? (
          <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                onDelete();
                setShowConfirm(false);
              }}
              className="text-xs px-1.5 py-0.5 bg-red-600 text-white rounded hover:bg-red-500"
            >
              Yes
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="text-xs px-1.5 py-0.5 bg-slate-600 text-white rounded hover:bg-slate-500"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowConfirm(true);
            }}
            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-0.5 shrink-0"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-xs text-slate-500">
          {room.guests.length} guest{room.guests.length !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-slate-600">·</span>
        <span className="text-xs text-slate-500">R{room.round}</span>
        <span className="text-xs text-slate-600">·</span>
        <span className="text-xs text-slate-500">{timeAgo}</span>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
