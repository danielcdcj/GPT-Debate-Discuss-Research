"use client";

import React, { useState } from "react";
import { useDebateStore } from "@/store/debate-store";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DebateStyle } from "@/store/types";

interface NewRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewRoomDialog({ isOpen, onClose }: NewRoomDialogProps) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState<DebateStyle>("balanced");
  const [maxRounds, setMaxRounds] = useState(10);
  const [customInstructions, setCustomInstructions] = useState("");

  const createRoom = useDebateStore((s) => s.createRoom);

  const handleCreate = () => {
    if (!name.trim() || !topic.trim()) return;
    createRoom(name.trim(), topic.trim(), {
      style,
      maxRounds,
      customInstructions: customInstructions.trim(),
    });
    setName("");
    setTopic("");
    setStyle("balanced");
    setMaxRounds(10);
    setCustomInstructions("");
    onClose();
  };

  const styleOptions: Array<{ value: string; label: string }> = [
    { value: "balanced", label: "Balanced — Fair, multi-perspective discussion" },
    { value: "adversarial", label: "Adversarial — Guests challenge each other" },
    { value: "collaborative", label: "Collaborative — Build on each other's ideas" },
    { value: "socratic", label: "Socratic — Question-driven exploration" },
    { value: "devils_advocate", label: "Devil's Advocate — Challenge consensus" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Room">
      <div className="space-y-4">
        <Input
          label="Room Name"
          placeholder="e.g., AI Ethics Discussion"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <Textarea
          label="Topic"
          placeholder="What should the debate be about?"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={3}
        />

        <Select
          label="Debate Style"
          value={style}
          onChange={(e) => setStyle(e.target.value as DebateStyle)}
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
            value={maxRounds}
            onChange={(e) => setMaxRounds(parseInt(e.target.value) || 10)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <Textarea
          label="Custom Instructions (optional)"
          placeholder="Any specific instructions for the host..."
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          rows={2}
        />

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !topic.trim()}
          >
            Create Room
          </Button>
        </div>
      </div>
    </Modal>
  );
}
