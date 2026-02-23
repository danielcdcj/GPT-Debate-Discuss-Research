"use client";

import React, { useState, useCallback } from "react";
import { useStoreState, useStoreActions } from "@/hooks/useEngine";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { ModelSelector } from "@/components/panels/ModelSelector";

// ─── Constants ──────────────────────────────────────────────────────

const AVATAR_POOL = [
  "\u{1F9D1}\u200D\u{1F52C}", "\u{1F9D1}\u200D\u{1F4BC}", "\u{1F9D1}\u200D\u{1F3EB}",
  "\u{1F9D1}\u200D\u2696\uFE0F", "\u{1F9D1}\u200D\u{1F4BB}", "\u{1F9D1}\u200D\u{1F3A8}",
  "\u{1F9D1}\u200D\u{1F527}", "\u{1F9D1}\u200D\u2695\uFE0F", "\u{1F9D9}", "\u{1F98A}",
  "\u{1F43A}", "\u{1F989}", "\u{1F988}", "\u{1F409}", "\u{1F916}", "\u{1F47D}",
  "\u{1F3AD}", "\u{1F5E1}\uFE0F", "\u{1F4D6}", "\u{1F52E}", "\u26A1", "\u{1F30A}",
  "\u{1F525}", "\u{1F33F}", "\u{1F48E}",
];

interface QuickPreset {
  name: string;
  personality: string;
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    name: "The Pragmatist",
    personality:
      "A practical, results-oriented thinker who values evidence-based approaches. Cuts through theoretical debates to focus on what actually works in the real world. Skeptical of untested ideals but open to data-driven innovation.",
  },
  {
    name: "The Idealist",
    personality:
      "A visionary who focuses on long-term possibilities and ethical implications. Champions bold ideas and transformative change. Believes in the power of principles and moral frameworks to guide decisions, even when practicality is uncertain.",
  },
  {
    name: "The Skeptic",
    personality:
      "A critical analyst who questions assumptions and demands rigorous proof. Excels at identifying flaws in arguments and hidden biases. Not contrarian for its own sake, but deeply committed to intellectual honesty and epistemic rigor.",
  },
  {
    name: "The Technologist",
    personality:
      "A forward-thinking technologist who sees innovation as the primary driver of progress. Deep understanding of emerging technologies and their potential impact. Balances techno-optimism with awareness of unintended consequences.",
  },
];

// ─── Types ──────────────────────────────────────────────────────────

interface AddGuestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

// ─── Component ──────────────────────────────────────────────────────

export function AddGuestDialog({ isOpen, onClose, roomId }: AddGuestDialogProps) {
  const selectedGuestModel = useStoreState(useCallback((s) => s.selectedGuestModel, []));
  const actions = useStoreActions();

  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(
    AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)]
  );
  const [model, setModel] = useState(selectedGuestModel);

  function handleClose() {
    setName("");
    setPersonality("");
    setSelectedAvatar(AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)]);
    setModel(selectedGuestModel);
    onClose();
  }

  function applyPreset(preset: QuickPreset) {
    setName(preset.name);
    setPersonality(preset.personality);
  }

  function handleAddGuest() {
    if (!name.trim() || !personality.trim()) return;

    actions.addGuest(roomId, {
      name: name.trim(),
      avatar: selectedAvatar,
      personality: personality.trim(),
      model: model !== selectedGuestModel ? model : undefined,
    });

    handleClose();
  }

  const canAdd = name.trim().length > 0 && personality.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Guest" maxWidth="max-w-lg">
      <div className="space-y-5">
        {/* Quick Presets */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400">Quick Presets</label>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`
                  text-left rounded-lg border px-3 py-2.5 transition-all duration-150
                  ${
                    name === preset.name
                      ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                      : "border-white/[0.06] bg-white/[0.02] text-slate-300 hover:border-white/10 hover:bg-white/[0.04]"
                  }
                `}
              >
                <span className="text-sm font-medium">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Avatar Picker */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400">Avatar</label>
          <div className="flex flex-wrap gap-1.5">
            {AVATAR_POOL.map((avatar) => (
              <button
                key={avatar}
                type="button"
                onClick={() => setSelectedAvatar(avatar)}
                className={`
                  w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all duration-150
                  ${
                    selectedAvatar === avatar
                      ? "bg-indigo-500/20 ring-2 ring-indigo-500 scale-110"
                      : "bg-white/[0.03] hover:bg-white/[0.08] hover:scale-105"
                  }
                `}
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <Input
          label="Name"
          placeholder="e.g., The Historian, Dr. Smith"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Personality */}
        <Textarea
          label="Personality"
          placeholder="Describe their expertise, perspective, debating style, and specific angle..."
          rows={4}
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
        />

        {/* Model Selector */}
        <ModelSelector
          label="Model"
          value={model}
          onChange={setModel}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAddGuest} disabled={!canAdd}>
            Add Guest
          </Button>
        </div>
      </div>
    </Modal>
  );
}
