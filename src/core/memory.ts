import type { StructuredMemory, GuestMemory, ConversationEntry } from "./types";

const MAX_HISTORY_ENTRIES = 10;

export function emptyStructuredMemory(): StructuredMemory {
  return {
    positions: [],
    keyMoments: [],
    otherGuestsSummary: "",
    userPreferences: "",
  };
}

export function emptyGuestMemory(): GuestMemory {
  return {
    structured: emptyStructuredMemory(),
    history: [],
  };
}

export function addToHistory(
  memory: GuestMemory,
  entry: Omit<ConversationEntry, "round">,
  round: number
): GuestMemory {
  const newEntry: ConversationEntry = { ...entry, round };
  const updated = [...memory.history, newEntry];

  return {
    ...memory,
    history: updated.slice(-MAX_HISTORY_ENTRIES),
  };
}

export function trimHistory(memory: GuestMemory, maxEntries = MAX_HISTORY_ENTRIES): GuestMemory {
  if (memory.history.length <= maxEntries) return memory;
  return {
    ...memory,
    history: memory.history.slice(-maxEntries),
  };
}
