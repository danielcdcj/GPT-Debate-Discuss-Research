"use client";

import React, { useState } from "react";
import { useDebateStore } from "@/store/debate-store";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DebateStyle } from "@/store/types";
import { chatCompletion } from "@/lib/openrouter";
import { initDebate } from "@/lib/debate-engine";
import { ModelSelector } from "@/components/right-panel/ModelSelector";

interface NewRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GeneratedGuest {
  name: string;
  avatar: string;
  personality: string;
  model: string;
}

const AVATAR_POOL = [
  "\uD83E\uDDD1\u200D\uD83D\uDD2C", "\uD83E\uDDD1\u200D\uD83D\uDCBC", "\uD83E\uDDD1\u200D\uD83C\uDFEB",
  "\uD83E\uDDD1\u200D\u2696\uFE0F", "\uD83E\uDDD1\u200D\uD83D\uDCBB", "\uD83E\uDDD1\u200D\uD83C\uDFA8",
  "\uD83E\uDDD1\u200D\uD83D\uDD27", "\uD83E\uDDD1\u200D\u2695\uFE0F", "\uD83E\uDDD9", "\uD83E\uDD8A",
  "\uD83D\uDC3A", "\uD83E\uDD89", "\uD83E\uDD88", "\uD83D\uDC09", "\uD83E\uDD16",
  "\uD83D\uDC7D", "\uD83C\uDFAD", "\uD83D\uDDE1\uFE0F", "\uD83D\uDCD6", "\uD83D\uDD2E",
  "\u26A1", "\uD83C\uDF0A", "\uD83D\uDD25", "\uD83C\uDF3F", "\uD83D\uDC8E",
];

export function NewRoomDialog({ isOpen, onClose }: NewRoomDialogProps) {
  // Step 1 state
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState<DebateStyle>("balanced");
  const [maxRounds, setMaxRounds] = useState(10);
  const [customInstructions, setCustomInstructions] = useState("");
  const [hostModel, setHostModel] = useState("openai/gpt-oss-120b");
  const [defaultGuestModel, setDefaultGuestModel] = useState("x-ai/grok-4.1-mini");

  // Step 2 state
  const [step, setStep] = useState<1 | 2>(1);
  const [guests, setGuests] = useState<GeneratedGuest[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  // Adding new guest inline
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestPersonality, setNewGuestPersonality] = useState("");

  const apiKey = useDebateStore((s) => s.apiKey);
  const createRoom = useDebateStore((s) => s.createRoom);
  const addGuest = useDebateStore((s) => s.addGuest);
  const setSelectedHostModel = useDebateStore((s) => s.setSelectedHostModel);
  const setSelectedGuestModel = useDebateStore((s) => s.setSelectedGuestModel);
  const preferredProviders = useDebateStore((s) => s.preferredProviders);

  const resetForm = () => {
    setName("");
    setTopic("");
    setStyle("balanced");
    setMaxRounds(10);
    setCustomInstructions("");
    setHostModel("openai/gpt-oss-120b");
    setDefaultGuestModel("x-ai/grok-4.1-mini");
    setStep(1);
    setGuests([]);
    setIsGenerating(false);
    setGenerateError("");
    setShowAddGuest(false);
    setNewGuestName("");
    setNewGuestPersonality("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const generateGuests = async () => {
    setIsGenerating(true);
    setGenerateError("");

    const prompt = `You are setting up a debate/discussion room. Generate a diverse panel of guests who can cover all perspectives on the given topic.

TOPIC: ${topic.trim()}
DEBATE STYLE: ${style}
${customInstructions ? "SPECIAL INSTRUCTIONS: " + customInstructions : ""}

Generate 3-5 guests with complementary but diverse viewpoints. Together, they should cover all major angles and perspectives on this topic.

Respond with ONLY a JSON object (no markdown, no backticks):
{
  "guests": [
    {
      "name": "A short character name (e.g., 'The Pragmatist', 'Dr. Sarah Chen', 'The Skeptic')",
      "personality": "A detailed personality description (3-4 sentences). Include their expertise, perspective, debating style, and what angle they bring to this specific topic. Be specific to the topic."
    }
  ]
}

Rules:
- Each guest should represent a genuinely different perspective
- Personalities should be specific to the topic, not generic
- Include a mix of supportive, critical, and analytical viewpoints
- 3-5 guests total`;

    try {
      const response = await chatCompletion(
        apiKey,
        hostModel,
        [
          { role: "system", content: prompt },
          { role: "user", content: `Generate guests for the topic: "${topic.trim()}"` },
        ],
        true,
        preferredProviders[hostModel]
      );

      const parsed = JSON.parse(response);
      const generatedGuests: GeneratedGuest[] = (parsed.guests || []).map(
        (g: { name: string; personality: string }, i: number) => ({
          name: g.name,
          avatar: AVATAR_POOL[i % AVATAR_POOL.length],
          personality: g.personality,
          model: defaultGuestModel,
        })
      );

      if (generatedGuests.length === 0) {
        setGenerateError("No guests were generated. Try again.");
      } else {
        setGuests(generatedGuests);
      }
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Failed to generate guests"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = async () => {
    setStep(2);
    await generateGuests();
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleCreate = () => {
    if (!name.trim() || !topic.trim() || guests.length < 2) return;

    // Set models globally
    setSelectedHostModel(hostModel);
    setSelectedGuestModel(defaultGuestModel);

    // Create the room
    const roomId = createRoom(name.trim(), topic.trim(), {
      style,
      maxRounds,
      customInstructions: customInstructions.trim(),
    });

    // Add all guests with their individual models
    for (const guest of guests) {
      addGuest(roomId, {
        name: guest.name,
        avatar: guest.avatar,
        personality: guest.personality,
        model: guest.model,
      });
    }

    handleClose();

    // Kick off the conversation — host decides what to do first
    initDebate(roomId);
  };

  const updateGuest = (index: number, updates: Partial<GeneratedGuest>) => {
    setGuests((prev) =>
      prev.map((g, i) => (i === index ? { ...g, ...updates } : g))
    );
  };

  const removeGuest = (index: number) => {
    setGuests((prev) => prev.filter((_, i) => i !== index));
  };

  const addNewGuest = () => {
    if (!newGuestName.trim() || !newGuestPersonality.trim()) return;
    setGuests((prev) => [
      ...prev,
      {
        name: newGuestName.trim(),
        avatar: AVATAR_POOL[prev.length % AVATAR_POOL.length],
        personality: newGuestPersonality.trim(),
        model: defaultGuestModel,
      },
    ]);
    setNewGuestName("");
    setNewGuestPersonality("");
    setShowAddGuest(false);
  };

  const styleOptions: Array<{ value: string; label: string }> = [
    { value: "balanced", label: "Balanced \u2014 Fair, multi-perspective discussion" },
    { value: "adversarial", label: "Adversarial \u2014 Guests challenge each other" },
    { value: "collaborative", label: "Collaborative \u2014 Build on each other's ideas" },
    { value: "socratic", label: "Socratic \u2014 Question-driven exploration" },
    { value: "devils_advocate", label: "Devil's Advocate \u2014 Challenge consensus" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 1 ? "Create New Room" : "Configure Guests"}
      maxWidth="max-w-xl"
    >
      {step === 1 ? (
        /* ── Step 1: Room Details ── */
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

          <ModelSelector
            label="Host Model"
            value={hostModel}
            onChange={setHostModel}
          />

          <ModelSelector
            label="Default Guest Model"
            value={defaultGuestModel}
            onChange={setDefaultGuestModel}
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
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleNext}
              disabled={!name.trim() || !topic.trim() || !hostModel}
            >
              Next
            </Button>
          </div>
        </div>
      ) : (
        /* ── Step 2: Guest Configuration ── */
        <div className="space-y-4">
          {/* Generating state */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <p className="text-sm text-slate-400">
                Generating guest panel for your topic...
              </p>
            </div>
          )}

          {/* Error state */}
          {generateError && !isGenerating && (
            <div className="text-center py-4">
              <p className="text-sm text-red-400 mb-3">{generateError}</p>
              <Button onClick={generateGuests} variant="secondary">
                Retry
              </Button>
            </div>
          )}

          {/* Guest list */}
          {!isGenerating && guests.length > 0 && (
            <>
              <p className="text-xs text-slate-400">
                {guests.length} guest{guests.length !== 1 ? "s" : ""} generated.
                Edit personalities, add, or remove guests as needed.
                {guests.length < 2 && (
                  <span className="text-amber-400 ml-1">(Minimum 2 guests required)</span>
                )}
              </p>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {guests.map((guest, index) => (
                  <div
                    key={index}
                    className="border border-slate-700 rounded-lg p-3 bg-slate-800/50"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xl shrink-0 mt-0.5">{guest.avatar}</span>
                      <input
                        type="text"
                        value={guest.name}
                        onChange={(e) =>
                          updateGuest(index, { name: e.target.value })
                        }
                        className="flex-1 text-sm font-medium text-white bg-transparent border-b border-slate-600 focus:border-indigo-500 focus:outline-none pb-0.5"
                      />
                      <button
                        onClick={() => removeGuest(index)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-slate-700 shrink-0"
                        title="Remove guest"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <textarea
                      value={guest.personality}
                      onChange={(e) =>
                        updateGuest(index, { personality: e.target.value })
                      }
                      rows={3}
                      className="w-full text-xs text-slate-300 bg-slate-900/50 rounded-md border border-slate-700 px-2.5 py-2 focus:border-indigo-500 focus:outline-none resize-none"
                    />
                    <div className="mt-2">
                      <ModelSelector
                        label="Model"
                        value={guest.model}
                        onChange={(modelId) => updateGuest(index, { model: modelId })}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add guest section */}
              {showAddGuest ? (
                <div className="border border-slate-600 border-dashed rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Guest name..."
                    value={newGuestName}
                    onChange={(e) => setNewGuestName(e.target.value)}
                    className="w-full text-sm text-white bg-slate-800 rounded-md border border-slate-600 px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
                    autoFocus
                  />
                  <textarea
                    placeholder="Personality & expertise..."
                    value={newGuestPersonality}
                    onChange={(e) => setNewGuestPersonality(e.target.value)}
                    rows={3}
                    className="w-full text-xs text-slate-300 bg-slate-800 rounded-md border border-slate-600 px-2.5 py-2 focus:border-indigo-500 focus:outline-none resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowAddGuest(false);
                        setNewGuestName("");
                        setNewGuestPersonality("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={addNewGuest}
                      disabled={!newGuestName.trim() || !newGuestPersonality.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddGuest(true)}
                  className="w-full border border-slate-600 border-dashed rounded-lg py-2.5 text-xs text-slate-400 hover:text-white hover:border-slate-500 transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Guest
                </button>
              )}

              {/* Regenerate button */}
              <button
                onClick={generateGuests}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate all guests
              </button>
            </>
          )}

          {/* Footer buttons */}
          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={handleBack}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={guests.length < 2 || isGenerating}
              >
                Start Conversation
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
