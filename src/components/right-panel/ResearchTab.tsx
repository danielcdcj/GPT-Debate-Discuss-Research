"use client";

import React, { useState } from "react";
import { useDebateStore } from "@/store/debate-store";
import { ResearchViewer } from "@/components/dialogs/ResearchViewer";
import { ResearchFile } from "@/store/types";

export function ResearchTab() {
  const [viewingFile, setViewingFile] = useState<ResearchFile | null>(null);
  const activeRoomId = useDebateStore((s) => s.activeRoomId);
  const rooms = useDebateStore((s) => s.rooms);
  const room = rooms.find((r) => r.id === activeRoomId);

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
        <h3 className="text-sm font-semibold text-white">
          Research Files ({room.researchFiles.length})
        </h3>

        {room.researchFiles.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">📚</div>
            <p className="text-sm text-slate-500">No research yet</p>
            <p className="text-xs text-slate-600 mt-1">
              Research files will appear here when the host requests investigation
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {room.researchFiles.map((file) => (
              <button
                key={file.id}
                onClick={() => setViewingFile(file)}
                className="w-full text-left bg-slate-800 rounded-lg border border-slate-700 p-3 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg shrink-0">
                    {file.researcher.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-medium text-white truncate">
                      {file.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {file.researcher.name}
                    </p>
                    {file.isStreaming && (
                      <div className="flex gap-1 mt-1.5">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                        <span className="text-[10px] text-indigo-400">
                          Writing...
                        </span>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-600 mt-1 line-clamp-2">
                      {file.content.slice(0, 120)}
                      {file.content.length > 120 ? "..." : ""}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <ResearchViewer
        file={viewingFile}
        onClose={() => setViewingFile(null)}
      />
    </>
  );
}
