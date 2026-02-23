"use client";

import React, { useCallback } from "react";
import { useStoreState, useStoreActions } from "@/hooks/useEngine";
import type { DebateStyle, Room } from "@/core/types";
import { Select, Textarea, Input } from "@/components/ui/Input";
import { ModelSelector } from "@/components/panels/ModelSelector";

const DEBATE_STYLE_OPTIONS: Array<{ value: DebateStyle; label: string }> = [
  { value: "balanced", label: "Balanced" },
  { value: "adversarial", label: "Adversarial" },
  { value: "collaborative", label: "Collaborative" },
  { value: "socratic", label: "Socratic" },
  { value: "devils_advocate", label: "Devil's Advocate" },
];

export function ConfigPanel() {
  const selectedHostModel = useStoreState(
    useCallback((s) => s.selectedHostModel, [])
  );
  const selectedGuestModel = useStoreState(
    useCallback((s) => s.selectedGuestModel, [])
  );
  const selectedResearchModel = useStoreState(
    useCallback((s) => s.selectedResearchModel, [])
  );
  const activeRoom: Room | undefined = useStoreState(
    useCallback(
      (s) => (s.activeRoomId ? s.rooms.find((r) => r.id === s.activeRoomId) : undefined),
      []
    )
  );

  const {
    setSelectedHostModel,
    setSelectedGuestModel,
    setSelectedResearchModel,
    updateRoomConfig,
  } = useStoreActions();

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      {/* Model Configuration */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Model Configuration
        </h3>

        <div className="flex flex-col gap-4">
          <ModelSelector
            label="Host Model"
            value={selectedHostModel}
            onChange={setSelectedHostModel}
          />
          <ModelSelector
            label="Default Guest Model"
            value={selectedGuestModel}
            onChange={setSelectedGuestModel}
          />
          <ModelSelector
            label="Research Model"
            value={selectedResearchModel}
            onChange={setSelectedResearchModel}
          />
        </div>
      </section>

      {/* Room Settings -- only shown when a room is active */}
      {activeRoom && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Room Settings
          </h3>

          <div className="flex flex-col gap-4">
            {/* Debate Style */}
            <Select
              label="Debate Style"
              options={DEBATE_STYLE_OPTIONS}
              value={activeRoom.config.style}
              onChange={(e) =>
                updateRoomConfig(activeRoom.id, {
                  style: e.target.value as DebateStyle,
                })
              }
            />

            {/* Max Rounds */}
            <Input
              label="Max Rounds"
              type="number"
              min={1}
              max={50}
              value={activeRoom.config.maxRounds}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= 50) {
                  updateRoomConfig(activeRoom.id, { maxRounds: val });
                }
              }}
            />

            {/* Custom Instructions */}
            <Textarea
              label="Custom Instructions"
              placeholder="Add custom instructions for this debate..."
              rows={3}
              value={activeRoom.config.customInstructions}
              onChange={(e) =>
                updateRoomConfig(activeRoom.id, {
                  customInstructions: e.target.value,
                })
              }
            />

            {/* Auto-trigger Research */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={activeRoom.config.autoResearch}
                  onChange={(e) =>
                    updateRoomConfig(activeRoom.id, {
                      autoResearch: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div
                  className="
                    h-5 w-9 rounded-full border border-white/[0.06]
                    bg-white/[0.03] transition-colors
                    peer-checked:bg-indigo-600 peer-checked:border-indigo-500
                  "
                />
                <div
                  className="
                    absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-slate-400
                    transition-all
                    peer-checked:translate-x-4 peer-checked:bg-white
                  "
                />
              </div>
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                Auto-trigger research
              </span>
            </label>
          </div>
        </section>
      )}
    </div>
  );
}

export default ConfigPanel;
