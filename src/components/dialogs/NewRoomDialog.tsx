"use client";

import React, { useState, useCallback } from "react";
import { useStoreState, useStoreActions } from "@/hooks/useEngine";
import type { DebateStyle } from "@/core/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { ModelSelector } from "@/components/panels/ModelSelector";
import { chatCompletion } from "@/core/api";
import { generateGuestsPrompt } from "@/core/prompts/guest";
import { initDebate } from "@/core/engine";

// ─── Constants ──────────────────────────────────────────────────────

const AVATAR_POOL = [
  "\u{1F9D1}\u200D\u{1F52C}", "\u{1F9D1}\u200D\u{1F4BC}", "\u{1F9D1}\u200D\u{1F3EB}",
  "\u{1F9D1}\u200D\u2696\uFE0F", "\u{1F9D1}\u200D\u{1F4BB}", "\u{1F9D1}\u200D\u{1F3A8}",
  "\u{1F9D1}\u200D\u{1F527}", "\u{1F9D1}\u200D\u2695\uFE0F", "\u{1F9D9}", "\u{1F98A}",
  "\u{1F43A}", "\u{1F989}", "\u{1F988}", "\u{1F409}", "\u{1F916}", "\u{1F47D}",
  "\u{1F3AD}", "\u{1F5E1}\uFE0F", "\u{1F4D6}", "\u{1F52E}", "\u26A1", "\u{1F30A}",
  "\u{1F525}", "\u{1F33F}", "\u{1F48E}",
];

const DEFAULT_HOST_MODEL = "openai/gpt-oss-120b";
const DEFAULT_GUEST_MODEL = "x-ai/grok-4.1-mini";

const DEBATE_STYLE_OPTIONS: Array<{ value: DebateStyle; label: string }> = [
  { value: "balanced", label: "Balanced -- Equal weight to all perspectives" },
  { value: "adversarial", label: "Adversarial -- Strong opposing viewpoints" },
  { value: "collaborative", label: "Collaborative -- Building toward consensus" },
  { value: "socratic", label: "Socratic -- Question-driven exploration" },
  { value: "devils_advocate", label: "Devil's Advocate -- Challenging every position" },
];

// ─── Types ──────────────────────────────────────────────────────────

interface GeneratedGuest {
  name: string;
  avatar: string;
  personality: string;
  model: string;
}

interface NewRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function NewRoomDialog({ isOpen, onClose }: NewRoomDialogProps) {
  const apiKey = useStoreState(useCallback((s) => s.apiKey, []));
  const actions = useStoreActions();

  // Step tracking
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Room details
  const [roomName, setRoomName] = useState("");
  const [topic, setTopic] = useState("");
  const [debateStyle, setDebateStyle] = useState<DebateStyle>("balanced");
  const [hostModel, setHostModel] = useState(DEFAULT_HOST_MODEL);
  const [guestModel, setGuestModel] = useState(DEFAULT_GUEST_MODEL);
  const [maxRounds, setMaxRounds] = useState(10);
  const [customInstructions, setCustomInstructions] = useState("");

  // Step 2: Guest configuration
  const [guests, setGuests] = useState<GeneratedGuest[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // New guest form
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestPersonality, setNewGuestPersonality] = useState("");

  // ── Reset state on close ──

  function handleClose() {
    setStep(1);
    setRoomName("");
    setTopic("");
    setDebateStyle("balanced");
    setHostModel(DEFAULT_HOST_MODEL);
    setGuestModel(DEFAULT_GUEST_MODEL);
    setMaxRounds(10);
    setCustomInstructions("");
    setGuests([]);
    setIsGenerating(false);
    setGenerateError(null);
    setIsStarting(false);
    setNewGuestName("");
    setNewGuestPersonality("");
    onClose();
  }

  // ── Generate guests via API ──

  async function generateGuests() {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const prompt = generateGuestsPrompt(topic, debateStyle, customInstructions || undefined);

      const response = await chatCompletion(
        apiKey,
        hostModel,
        [{ role: "user", content: prompt }],
        true
      );

      const parsed = JSON.parse(response);
      const rawGuests: Array<{ name: string; personality: string }> = parsed.guests || [];

      if (!rawGuests.length) {
        throw new Error("No guests were generated. Please try again.");
      }

      const shuffledAvatars = [...AVATAR_POOL].sort(() => Math.random() - 0.5);

      const generated: GeneratedGuest[] = rawGuests.map((g, i) => ({
        name: g.name,
        avatar: shuffledAvatars[i % shuffledAvatars.length],
        personality: g.personality,
        model: guestModel,
      }));

      setGuests(generated);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate guests.");
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Step navigation ──

  async function handleNext() {
    setStep(2);
    if (guests.length === 0) {
      await generateGuests();
    }
  }

  function handleBack() {
    setStep(1);
  }

  // ── Guest management ──

  function updateGuest(index: number, updates: Partial<GeneratedGuest>) {
    setGuests((prev) =>
      prev.map((g, i) => (i === index ? { ...g, ...updates } : g))
    );
  }

  function removeGuest(index: number) {
    setGuests((prev) => prev.filter((_, i) => i !== index));
  }

  function addGuest() {
    if (!newGuestName.trim() || !newGuestPersonality.trim()) return;

    const usedAvatars = new Set(guests.map((g) => g.avatar));
    const available = AVATAR_POOL.filter((a) => !usedAvatars.has(a));
    const avatar = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)];

    setGuests((prev) => [
      ...prev,
      {
        name: newGuestName.trim(),
        avatar,
        personality: newGuestPersonality.trim(),
        model: guestModel,
      },
    ]);

    setNewGuestName("");
    setNewGuestPersonality("");
  }

  // ── Start conversation ──

  async function handleStart() {
    if (guests.length === 0 || !roomName.trim() || !topic.trim()) return;

    setIsStarting(true);

    try {
      actions.setSelectedHostModel(hostModel);
      actions.setSelectedGuestModel(guestModel);

      const roomId = actions.createRoom(roomName.trim(), topic.trim(), {
        style: debateStyle,
        maxRounds,
        customInstructions,
      });

      for (const guest of guests) {
        actions.addGuest(roomId, {
          name: guest.name,
          avatar: guest.avatar,
          personality: guest.personality,
          model: guest.model !== guestModel ? guest.model : undefined,
        });
      }

      handleClose();

      await initDebate(roomId);
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setIsStarting(false);
    }
  }

  // ── Validation ──

  const canProceedToStep2 = roomName.trim().length > 0 && topic.trim().length > 0;
  const canStart = guests.length > 0 && !isStarting;

  // ── Render ──

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 1 ? "New Conversation" : "Configure Guests"}
      maxWidth="max-w-2xl"
    >
      {step === 1 ? (
        <div className="space-y-5">
          {/* Room Name */}
          <Input
            label="Room Name"
            placeholder="e.g., AI Ethics Roundtable"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />

          {/* Topic */}
          <Textarea
            label="Topic"
            placeholder="What should the panel discuss? Be specific for better results..."
            rows={3}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />

          {/* Debate Style */}
          <Select
            label="Debate Style"
            options={DEBATE_STYLE_OPTIONS}
            value={debateStyle}
            onChange={(e) => setDebateStyle(e.target.value as DebateStyle)}
          />

          {/* Model Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ModelSelector
              label="Host Model"
              value={hostModel}
              onChange={setHostModel}
            />
            <ModelSelector
              label="Default Guest Model"
              value={guestModel}
              onChange={setGuestModel}
            />
          </div>

          {/* Max Rounds */}
          <Input
            label="Max Rounds"
            type="number"
            min={1}
            max={50}
            value={maxRounds}
            onChange={(e) => setMaxRounds(Number(e.target.value) || 10)}
          />

          {/* Custom Instructions */}
          <Textarea
            label="Custom Instructions (optional)"
            placeholder="Any special rules, constraints, or focus areas..."
            rows={2}
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleNext} disabled={!canProceedToStep2}>
              Next
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Loading state */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex gap-1.5 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0ms]" />
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:150ms]" />
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:300ms]" />
              </div>
              <p className="text-sm text-slate-400">Generating diverse panelists...</p>
            </div>
          )}

          {/* Error state */}
          {generateError && !isGenerating && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm text-red-400 mb-3">{generateError}</p>
              <Button variant="secondary" size="sm" onClick={generateGuests}>
                Retry Generation
              </Button>
            </div>
          )}

          {/* Guest cards */}
          {!isGenerating && !generateError && guests.length > 0 && (
            <>
              <div className="space-y-3">
                {guests.map((guest, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-2xl shrink-0">{guest.avatar}</span>
                        <Input
                          value={guest.name}
                          onChange={(e) => updateGuest(index, { name: e.target.value })}
                          className="!py-1.5"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeGuest(index)}
                        className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove guest"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <Textarea
                      value={guest.personality}
                      onChange={(e) => updateGuest(index, { personality: e.target.value })}
                      rows={2}
                      placeholder="Personality description..."
                    />

                    <ModelSelector
                      label="Model"
                      value={guest.model}
                      onChange={(model) => updateGuest(index, { model })}
                    />
                  </div>
                ))}
              </div>

              {/* Add guest section */}
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-4 space-y-3">
                <p className="text-xs font-medium text-slate-400">Add Another Guest</p>
                <Input
                  placeholder="Guest name..."
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                />
                <Textarea
                  placeholder="Personality and expertise..."
                  rows={2}
                  value={newGuestPersonality}
                  onChange={(e) => setNewGuestPersonality(e.target.value)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={addGuest}
                  disabled={!newGuestName.trim() || !newGuestPersonality.trim()}
                >
                  + Add Guest
                </Button>
              </div>

              {/* Regenerate button */}
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateGuests}
                  disabled={isGenerating}
                >
                  Regenerate All Guests
                </Button>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-3 pt-2">
            <Button variant="ghost" onClick={handleBack} disabled={isGenerating || isStarting}>
              Back
            </Button>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleClose} disabled={isStarting}>
                Cancel
              </Button>
              <Button
                onClick={handleStart}
                disabled={!canStart}
              >
                {isStarting ? "Starting..." : "Start Conversation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
