"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useStoreState } from "@/hooks/useEngine";
import type { LLMModel } from "@/core/types";

interface ModelSelectorProps {
  label: string;
  value: string;
  onChange: (modelId: string) => void;
}

const MAX_VISIBLE_RESULTS = 100;

export function ModelSelector({ label, value, onChange }: ModelSelectorProps) {
  const models = useStoreState(useCallback((s) => s.models, []));
  const modelsLoading = useStoreState(useCallback((s) => s.modelsLoading, []));
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedModel = models.find((m) => m.id === value);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const filteredModels = models
    .filter((m) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
      );
    })
    .slice(0, MAX_VISIBLE_RESULTS);

  function handleSelect(model: LLMModel) {
    onChange(model.id);
    setOpen(false);
    setSearch("");
  }

  function formatContextLength(length: number): string {
    if (length >= 1000) {
      return `${Math.round(length / 1000)}k ctx`;
    }
    return `${length} ctx`;
  }

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <label className="text-xs font-medium text-slate-400">{label}</label>

      <div className="relative">
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`
            w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors
            ${
              open
                ? "border-indigo-500 ring-1 ring-indigo-500/50"
                : "border-white/[0.06] hover:border-white/[0.12]"
            }
            bg-[rgba(255,255,255,0.03)]
          `}
        >
          {selectedModel ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-white truncate">{selectedModel.name}</span>
              <span className="text-[11px] text-slate-500 truncate">
                {selectedModel.id}
              </span>
            </div>
          ) : (
            <span className="text-slate-500">Select a model...</span>
          )}

          {/* Chevron */}
          <svg
            className={`
              absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500
              transition-transform duration-150
              ${open ? "rotate-180" : ""}
            `}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div
            className="
              absolute left-0 right-0 top-full mt-1 z-50
              rounded-xl border border-white/[0.06] bg-[#0c0c14] shadow-2xl shadow-black/50
              overflow-hidden
            "
          >
            {/* Search */}
            <div className="p-2 border-b border-white/[0.06]">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models..."
                className="
                  w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5
                  text-sm text-white placeholder-slate-500
                  focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50
                "
              />
            </div>

            {/* Options list */}
            <div className="max-h-64 overflow-y-auto overscroll-contain">
              {filteredModels.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-slate-500">
                  {modelsLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading models...
                    </span>
                  ) : (
                    "No models found"
                  )}
                </div>
              ) : (
                filteredModels.map((model) => {
                  const isSelected = model.id === value;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleSelect(model)}
                      className={`
                        w-full text-left px-3 py-2 transition-colors
                        ${
                          isSelected
                            ? "bg-indigo-600/15 border-l-2 border-l-indigo-500"
                            : "border-l-2 border-l-transparent hover:bg-white/[0.04]"
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-sm truncate ${
                              isSelected ? "text-indigo-300" : "text-white"
                            }`}
                          >
                            {model.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {model.id}
                          </div>
                        </div>
                        {model.context_length > 0 && (
                          <span className="shrink-0 text-[10px] text-slate-600 mt-0.5">
                            {formatContextLength(model.context_length)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
