"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfmModule from "remark-gfm";
import { Modal } from "@/components/ui/Modal";
import { ResearchFile } from "@/store/types";

// remark-gfm v4 is ESM-only; CJS interop wraps it in { default: fn }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const remarkGfm = (remarkGfmModule as any).default || remarkGfmModule;

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
          {file.content ? (
            <div className="markdown-content prose prose-sm prose-invert max-w-none text-slate-300 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {file.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-slate-500 italic">No content yet...</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
