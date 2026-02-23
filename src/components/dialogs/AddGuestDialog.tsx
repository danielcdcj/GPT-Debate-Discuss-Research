"use client";

import React, { useState } from "react";
import { useDebateStore } from "@/store/debate-store";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ModelSelector } from "@/components/right-panel/ModelSelector";

interface AddGuestDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_OPTIONS = [
  "🧑‍🔬", "🧑‍💼", "🧑‍🏫", "🧑‍⚖️", "🧑‍💻",
  "🧑‍🎨", "🧑‍🔧", "🧑‍⚕️", "🧙", "🦊",
  "🐺", "🦉", "🦈", "🐉", "🤖",
  "👽", "🎭", "🗡️", "📖", "🔮",
  "⚡", "🌊", "🔥", "🌿", "💎",
];

const PRESETS = [
  {
    name: "The Pragmatist",
    avatar: "🧑‍💼",
    personality:
      "You are a practical-minded business strategist. You focus on real-world feasibility, costs, and implementation challenges. You push back on idealistic proposals that lack concrete plans. You value data and proven approaches.",
  },
  {
    name: "The Idealist",
    avatar: "🌿",
    personality:
      "You are an idealistic philosopher who prioritizes ethics, long-term impact, and human values. You challenge purely profit-driven or utilitarian arguments. You advocate for considering marginalized perspectives and systemic effects.",
  },
  {
    name: "The Skeptic",
    avatar: "🦉",
    personality:
      "You are a critical thinker who questions assumptions, asks for evidence, and spots logical fallacies. You play devil's advocate and challenge the consensus. You value rigorous analysis over popular opinion.",
  },
  {
    name: "The Technologist",
    avatar: "🤖",
    personality:
      "You are a technology enthusiast with deep technical knowledge. You consider feasibility from an engineering perspective, identify technical risks, and propose innovative solutions. You tend to be optimistic about technology's potential.",
  },
];

export function AddGuestDialog({ isOpen, onClose }: AddGuestDialogProps) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🧑‍🔬");
  const [personality, setPersonality] = useState("");
  const [model, setModel] = useState("");

  const activeRoomId = useDebateStore((s) => s.activeRoomId);
  const addGuest = useDebateStore((s) => s.addGuest);
  const selectedGuestModel = useDebateStore((s) => s.selectedGuestModel);

  // Initialize model with the global guest model when dialog opens
  const effectiveModel = model || selectedGuestModel;

  const handleAdd = () => {
    if (!name.trim() || !personality.trim() || !activeRoomId) return;
    addGuest(activeRoomId, {
      name: name.trim(),
      avatar,
      personality: personality.trim(),
      model: effectiveModel || undefined,
    });
    setName("");
    setAvatar("🧑‍🔬");
    setPersonality("");
    setModel("");
    onClose();
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setName(preset.name);
    setAvatar(preset.avatar);
    setPersonality(preset.personality);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Guest">
      <div className="space-y-4">
        {/* Presets */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-2 block">
            Quick Presets
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors border border-slate-600"
              >
                {preset.avatar} {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Avatar picker */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-2 block">
            Avatar
          </label>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setAvatar(emoji)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                  avatar === emoji
                    ? "bg-indigo-600 ring-2 ring-indigo-400 scale-110"
                    : "bg-slate-800 hover:bg-slate-700"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Name"
          placeholder="e.g., Dr. Sarah Chen"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Textarea
          label="Personality & Expertise"
          placeholder="Describe this guest's expertise, debating style, biases, and perspective..."
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          rows={4}
        />

        <ModelSelector
          label="Model"
          value={effectiveModel}
          onChange={setModel}
        />

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!name.trim() || !personality.trim()}
          >
            Add Guest
          </Button>
        </div>
      </div>
    </Modal>
  );
}
