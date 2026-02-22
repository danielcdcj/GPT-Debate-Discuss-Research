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

  const tabs: Array<{ id: RightPanelTab; label: string; count?: number }> = [
    { id: "config", label: "Config" },
    { id: "guests", label: "Guests", count: room?.guests.length },
    {
      id: "research",
      label: "Research",
      count: room?.researchFiles.length,
    },
  ];

  return (
    <div className="w-[320px] bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
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
                <span className="ml-1 text-[10px] opacity-60">
                  ({tab.count})
                </span>
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
}
