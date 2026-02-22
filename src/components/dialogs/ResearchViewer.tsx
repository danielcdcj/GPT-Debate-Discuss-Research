"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { ResearchFile } from "@/store/types";

interface ResearchViewerProps {
  file: ResearchFile | null;
  onClose: () => void;
}

export function ResearchViewer({ file, onClose }: ResearchViewerProps) {
  if (!file) return null;

  return (
    <Modal
      isOpen={!!file}
      onClose={onClose}
      title={file.title}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="text-lg">{file.researcher.emoji}</span>
          <span>{file.researcher.name}</span>
          <span className="text-slate-600">·</span>
          <span className="text-xs text-slate-500">
            {file.researcher.focus}
          </span>
        </div>

        {file.isStreaming && (
          <div className="flex items-center gap-2 text-xs text-indigo-400">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            Research in progress...
          </div>
        )}

        <div className="border-t border-slate-700 pt-3">
          <div className="prose prose-sm prose-invert max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
            {file.content || (
              <span className="text-slate-500 italic">
                No content yet...
              </span>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
