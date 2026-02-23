"use client";

import React, { useState, useCallback } from "react";
import { useStoreState } from "@/hooks/useEngine";
import type { ResearchFile, Room } from "@/core/types";
import { ResearchViewer } from "@/components/dialogs/ResearchViewer";

export function ResearchPanel() {
  const activeRoom: Room | undefined = useStoreState(
    useCallback(
      (s) => (s.activeRoomId ? s.rooms.find((r) => r.id === s.activeRoomId) : undefined),
      []
    )
  );

  const [viewingFile, setViewingFile] = useState<ResearchFile | null>(null);

  const researchFiles = activeRoom?.researchFiles ?? [];

  // No active room fallback
  if (!activeRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <div className="text-slate-600 text-sm">
          Select or create a room to view research.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-sm font-medium text-white">
          Research Files{" "}
          <span className="text-slate-500">({researchFiles.length})</span>
        </h3>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {researchFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="h-10 w-10 text-slate-700 mx-auto mb-3 opacity-40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <p className="text-sm text-slate-500 mb-1">No research files</p>
            <p className="text-xs text-slate-600">
              Research files will appear here during debates.
            </p>
          </div>
        ) : (
          researchFiles.map((file) => (
            <ResearchFileCard
              key={file.id}
              file={file}
              onClick={() => setViewingFile(file)}
            />
          ))
        )}
      </div>

      {/* Research viewer dialog */}
      <ResearchViewer
        file={viewingFile}
        onClose={() => setViewingFile(null)}
      />
    </div>
  );
}

// ── Research File Card ──────────────────────────────────────────────

interface ResearchFileCardProps {
  file: ResearchFile;
  onClick: () => void;
}

function ResearchFileCard({ file, onClick }: ResearchFileCardProps) {
  const preview =
    file.content.length > 100
      ? file.content.slice(0, 100) + "..."
      : file.content;

  return (
    <button
      type="button"
      onClick={onClick}
      className="
        w-full text-left rounded-xl border border-white/[0.06] bg-[rgba(255,255,255,0.03)]
        p-3 transition-colors hover:bg-white/[0.05] hover:border-white/[0.1]
      "
    >
      {/* Researcher info */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base leading-none">
          {file.researcher.emoji}
        </span>
        <span className="text-[11px] text-slate-500 truncate">
          {file.researcher.name}
        </span>

        {/* Streaming indicator */}
        {file.isStreaming && (
          <span className="flex items-center gap-1 ml-auto">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[10px] text-emerald-400">streaming</span>
          </span>
        )}
      </div>

      {/* Title */}
      <div className="text-sm font-medium text-white truncate mb-1.5">
        {file.title}
      </div>

      {/* Content preview */}
      {preview && (
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {preview}
        </p>
      )}
    </button>
  );
}

export default ResearchPanel;
