"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfmModule from "remark-gfm";
import type { ResearchFile } from "@/core/types";
import { Modal } from "@/components/ui/Modal";

// Handle remark-gfm ESM interop
const remarkGfm = (remarkGfmModule as any).default || remarkGfmModule;

// ─── Types ──────────────────────────────────────────────────────────

interface ResearchViewerProps {
  file: ResearchFile | null;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function ResearchViewer({ file, onClose }: ResearchViewerProps) {
  if (!file) return null;

  const isOpen = Boolean(file);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={file.title}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Researcher header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{file.researcher.emoji}</span>
            <div>
              <h3 className="text-sm font-semibold text-white">{file.researcher.name}</h3>
              <p className="text-xs text-slate-500">{file.researcher.focus}</p>
            </div>
          </div>

          {/* Streaming indicator */}
          {file.isStreaming && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
              </span>
              <span className="text-xs font-medium text-indigo-400">Researching...</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.06]" />

        {/* Content */}
        {file.content.length > 0 ? (
          <div className="prose prose-invert prose-sm max-w-none prose-headings:text-slate-200 prose-p:text-slate-300 prose-a:text-indigo-400 prose-strong:text-slate-200 prose-code:text-indigo-300 prose-code:bg-white/[0.06] prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-pre:bg-[#0a0a12] prose-pre:border prose-pre:border-white/[0.06] prose-pre:rounded-xl prose-table:text-sm prose-th:text-slate-300 prose-td:text-slate-400 prose-th:border-white/[0.06] prose-td:border-white/[0.06]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {file.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center">
            <p className="text-sm text-slate-500">No content yet...</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
