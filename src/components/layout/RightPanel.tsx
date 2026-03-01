"use client";

import React, { useCallback } from "react";
import { useStoreState, useStoreActions } from "@/hooks/useEngine";
import type { RightPanelTab, Room } from "@/core/types";
import { ConfigPanel } from "@/components/panels/ConfigPanel";
import { GuestsPanel } from "@/components/panels/GuestsPanel";
import { ResearchPanel } from "@/components/panels/ResearchPanel";
import { PositionTracker } from "@/components/panels/PositionTracker";

// ─── Tab Definition ─────────────────────────────────────────────────

interface TabDef {
  id: RightPanelTab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  {
    id: "config",
    label: "Config",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    id: "guests",
    label: "Guests",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    id: "positions" as RightPanelTab,
    label: "Tracker",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    id: "research",
    label: "Research",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
];

// ─── Tab Button ─────────────────────────────────────────────────────

function TabButton({
  tab,
  isActive,
  badge,
  onClick,
}: {
  tab: TabDef;
  isActive: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium
        transition-all duration-150 rounded-lg
        ${
          isActive
            ? "bg-indigo-500/15 text-indigo-400"
            : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
        }
      `}
    >
      {tab.icon}
      <span>{tab.label}</span>

      {/* Count badge */}
      {badge !== undefined && badge > 0 && (
        <span
          className={`
            ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold
            inline-flex items-center justify-center leading-none
            ${
              isActive
                ? "bg-indigo-500/25 text-indigo-300"
                : "bg-white/[0.06] text-slate-500"
            }
          `}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Right Panel ────────────────────────────────────────────────────

export function RightPanel() {
  const activeTab = useStoreState(useCallback((s) => s.rightPanelTab, []));
  const mobileRightPanelOpen = useStoreState(
    useCallback((s) => s.mobileRightPanelOpen, [])
  );
  const activeRoom = useStoreState(
    useCallback(
      (s): Room | undefined => {
        if (!s.activeRoomId) return undefined;
        return s.rooms.find((r) => r.id === s.activeRoomId);
      },
      []
    )
  );
  const actions = useStoreActions();

  const guestCount = activeRoom?.guests.length ?? 0;
  const researchCount = activeRoom?.researchFiles.length ?? 0;

  function getBadge(tabId: RightPanelTab): number | undefined {
    if (tabId === "guests") return guestCount;
    if (tabId === "research") return researchCount;
    return undefined;
  }

  // Render the active panel content
  function renderActivePanel() {
    switch (activeTab) {
      case "config":
        return <ConfigPanel />;
      case "guests":
        return <GuestsPanel />;
      case "positions":
        return <PositionTracker />;
      case "research":
        return <ResearchPanel />;
      default:
        return null;
    }
  }

  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Header with close button for mobile */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 md:hidden">
        <h2 className="text-sm font-semibold text-slate-200">Settings</h2>
        <button
          onClick={() => actions.setMobileRightPanelOpen(false)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.06]">
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            badge={getBadge(tab.id)}
            onClick={() => actions.setRightPanelTab(tab.id)}
          />
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeRoom ? (
          renderActivePanel()
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-slate-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-sm text-slate-500">No room selected</p>
            <p className="text-xs text-slate-600 mt-1">
              Select or create a room to configure
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop panel */}
      <aside
        className="
          hidden md:flex flex-col flex-shrink-0 w-80 h-full
          bg-[#08080e] border-l border-white/[0.06]
        "
      >
        {panelContent}
      </aside>

      {/* Mobile overlay */}
      {mobileRightPanelOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => actions.setMobileRightPanelOpen(false)}
          />

          {/* Panel slides from right */}
          <aside className="absolute right-0 top-0 w-80 max-w-[85vw] h-full bg-[#08080e] border-l border-white/[0.06] shadow-2xl">
            {panelContent}
          </aside>
        </div>
      )}
    </>
  );
}
