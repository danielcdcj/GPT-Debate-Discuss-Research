"use client";

import React, { useState, useRef, useEffect } from "react";
import { useDebateStore } from "@/store/debate-store";

interface ModelSelectorProps {
  label: string;
  value: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ label, value, onChange }: ModelSelectorProps) {
  const models = useDebateStore((s) => s.models);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = models.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase())
  );

  const selectedModel = models.find((m) => m.id === value);

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <label className="text-xs font-medium text-slate-400">{label}</label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-white hover:border-slate-500 transition-colors"
        >
          {selectedModel ? (
            <div>
              <div className="font-medium truncate">{selectedModel.name}</div>
              <div className="text-slate-500 truncate">{selectedModel.id}</div>
            </div>
          ) : (
            <span className="text-slate-500">Select a model...</span>
          )}
        </button>

        {isOpen && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-[300px] overflow-hidden">
            <div className="p-2 border-b border-slate-700">
              <input
                type="text"
                placeholder="Search models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-[250px]">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-xs text-slate-500 text-center">
                  No models found
                </div>
              ) : (
                filtered.slice(0, 100).map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onChange(model.id);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-700 transition-colors ${
                      model.id === value
                        ? "bg-indigo-900/30 text-indigo-300"
                        : "text-slate-300"
                    }`}
                  >
                    <div className="font-medium truncate">{model.name}</div>
                    <div className="text-slate-500 text-[10px] flex gap-2 mt-0.5">
                      <span className="truncate">{model.id}</span>
                      <span className="shrink-0">
                        {model.context_length
                          ? `${Math.round(model.context_length / 1000)}k ctx`
                          : ""}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
