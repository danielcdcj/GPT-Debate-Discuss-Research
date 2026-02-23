"use client";

import React from "react";
import { useDebateStore } from "@/store/debate-store";
import { ModelSelector } from "./ModelSelector";
import { Select, Textarea } from "@/components/ui/Input";
import { DebateStyle } from "@/store/types";

export function ConfigTab() {
  const activeRoomId = useDebateStore((s) => s.activeRoomId);
  const rooms = useDebateStore((s) => s.rooms);
  const room = rooms.find((r) => r.id === activeRoomId);
  const updateRoomConfig = useDebateStore((s) => s.updateRoomConfig);

  const selectedHostModel = useDebateStore((s) => s.selectedHostModel);
  const selectedGuestModel = useDebateStore((s) => s.selectedGuestModel);
  const selectedResearchModel = useDebateStore((s) => s.selectedResearchModel);
  const setSelectedHostModel = useDebateStore((s) => s.setSelectedHostModel);
  const setSelectedGuestModel = useDebateStore((s) => s.setSelectedGuestModel);
  const setSelectedResearchModel = useDebateStore(
    (s) => s.setSelectedResearchModel
  );

  const styleOptions: Array<{ value: DebateStyle; label: string }> = [
    { value: "balanced", label: "Balanced" },
    { value: "adversarial", label: "Adversarial" },
    { value: "collaborative", label: "Collaborative" },
    { value: "socratic", label: "Socratic" },
    { value: "devils_advocate", label: "Devil's Advocate" },
  ];

  return (
    <div className="p-4 space-y-5">
      <h3 className="text-sm font-semibold text-white">Model Configuration</h3>

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

      {room && (
        <>
          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              Room Settings
            </h3>

            <div className="space-y-3">
              <Select
                label="Debate Style"
                value={room.config.style}
                onChange={(e) =>
                  updateRoomConfig(room.id, {
                    style: e.target.value as DebateStyle,
                  })
                }
                options={styleOptions}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">
                  Max Rounds
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={room.config.maxRounds}
                  onChange={(e) =>
                    updateRoomConfig(room.id, {
                      maxRounds: parseInt(e.target.value) || 10,
                    })
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <Textarea
                label="Custom Instructions"
                value={room.config.customInstructions}
                onChange={(e) =>
                  updateRoomConfig(room.id, {
                    customInstructions: e.target.value,
                  })
                }
                placeholder="Additional instructions for the host..."
                rows={3}
              />

              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={room.config.autoResearch}
                  onChange={(e) =>
                    updateRoomConfig(room.id, {
                      autoResearch: e.target.checked,
                    })
                  }
                  className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                />
                Auto-trigger research
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
