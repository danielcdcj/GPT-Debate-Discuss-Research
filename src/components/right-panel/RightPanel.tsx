"use client";

import React from "react";
import { useDebateStore } from "@/store/debate-store";
import { RightPanelTab } from "@/store/types";
import { ConfigTab } from "./ConfigTab";
import { GuestsTab } from "./GuestsTab";
import { ResearchTab } from "./ResearchTab";

export function RightPanel() {
  const rightPanelTab = useDebateStore((s) => s.rightPanelTab);
  const setRightPanelTab = useDebateStore((s) => s.setRightPanelTab);
  const activeRoomId = useDebateStore((s) => s.activeRoomId);
  const rooms = useDebateStore((s) => s.rooms);
  const room = rooms.find((r) => r.id === activeRoomId);
  const mobileRightPanelOpen = useDebateStore((s) => s.mobileRightPanelOpen);
  const setMobileRightPanelOpen = useDebateStore((s) => s.setMobileRightPanelOpen);

  const tabs: Array<{ id: RightPanelTab; label: string; count?: number }> = [
    { id: "config", label: "Config" },
    { id: "guests", label: "Guests", count: room?.guests.length },
    { id: "research", label: "Research", count: room?.researchFiles.length },
  ];

  const panelContent = (
    <div className="w-[320px] max-w-[85vw] bg-slate-900 border-l border-slate-800 flex flex-col h-full">
      {/* Mobile close header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 lg:hidden">
        <span className="text-sm font-semibold text-white">Panel</span>
        <button
          onClick={() => setMobileRightPanelOpen(false)}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-800 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRightPanelTab(tab.id)}
            className={`flex-1 py-3 text-xs font-medium transition-colors relative ${
              rightPanelTab === tab.id
                ? "text-indigo-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span>
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 text-[10px] opacity-60">({tab.count})</span>
              )}
            </span>
            {rightPanelTab === tab.id && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {rightPanelTab === "config" && <ConfigTab />}
        {rightPanelTab === "guests" && <GuestsTab />}
        {rightPanelTab === "research" && <ResearchTab />}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop panel — always visible on lg+ */}
      <div className="hidden lg:block shrink-0">{panelContent}</div>

      {/* Mobile panel — overlay when open */}
      {mobileRightPanelOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileRightPanelOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 animate-slide-in-right">
            {panelContent}
          </div>
        </div>
      )}
    </>
  );
}
