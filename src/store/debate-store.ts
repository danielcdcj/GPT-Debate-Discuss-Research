"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DebateRoom,
  DebatePhase,
  Guest,
  Message,
  OpenRouterModel,
  ResearchFile,
  RightPanelTab,
  StructuredMemory,
  DebateConfig,
} from "./types";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function emptyMemory(): StructuredMemory {
  return {
    my_positions: [],
    key_moments: [],
    other_guests_summary: "",
    user_preferences: "",
  };
}

function defaultConfig(): DebateConfig {
  return {
    style: "balanced",
    maxRounds: 10,
    customInstructions: "",
    autoResearch: false,
  };
}

interface DebateStoreState {
  // Auth
  apiKey: string;
  isAuthenticated: boolean;

  // Models cache
  models: OpenRouterModel[];
  modelsLoading: boolean;

  // Model assignments
  selectedHostModel: string;
  selectedGuestModel: string;
  selectedResearchModel: string;
  preferredProviders: Record<string, string[]>;

  // Rooms
  rooms: DebateRoom[];
  activeRoomId: string | null;

  // UI
  rightPanelTab: RightPanelTab;
  expandedMessageId: string | null;
  sidebarCollapsed: boolean;
}

interface DebateStoreActions {
  // Auth
  setApiKey: (key: string) => void;
  setAuthenticated: (val: boolean) => void;
  logout: () => void;

  // Models
  setModels: (models: OpenRouterModel[]) => void;
  setModelsLoading: (val: boolean) => void;
  setSelectedHostModel: (id: string) => void;
  setSelectedGuestModel: (id: string) => void;
  setSelectedResearchModel: (id: string) => void;
  setPreferredProviders: (modelId: string, providers: string[]) => void;

  // Rooms
  createRoom: (name: string, topic: string, config?: Partial<DebateConfig>) => string;
  deleteRoom: (id: string) => void;
  setActiveRoom: (id: string | null) => void;
  getActiveRoom: () => DebateRoom | undefined;
  updateRoomConfig: (roomId: string, config: Partial<DebateConfig>) => void;

  // Guests
  addGuest: (roomId: string, guest: Omit<Guest, "id" | "memory">) => void;
  removeGuest: (roomId: string, guestId: string) => void;
  updateGuestMemory: (roomId: string, guestId: string, memory: StructuredMemory) => void;

  // Messages
  addMessage: (roomId: string, message: Omit<Message, "id" | "timestamp">) => string;
  updateMessage: (roomId: string, messageId: string, updates: Partial<Message>) => void;
  appendToMessage: (roomId: string, messageId: string, content: string) => void;

  // Phase
  setPhase: (roomId: string, phase: DebatePhase) => void;
  incrementRound: (roomId: string) => void;

  // Host memory
  updateHostMemory: (roomId: string, memory: StructuredMemory) => void;

  // Pending messages
  queueUserMessage: (roomId: string, message: string) => void;
  dequeueUserMessage: (roomId: string) => string | undefined;

  // Research files
  addResearchFile: (roomId: string, file: Omit<ResearchFile, "id" | "timestamp">) => string;
  updateResearchFile: (roomId: string, fileId: string, updates: Partial<ResearchFile>) => void;
  appendToResearchFile: (roomId: string, fileId: string, content: string) => void;

  // UI
  setRightPanelTab: (tab: RightPanelTab) => void;
  setExpandedMessageId: (id: string | null) => void;
  setSidebarCollapsed: (val: boolean) => void;
}

type DebateStore = DebateStoreState & DebateStoreActions;

export const useDebateStore = create<DebateStore>()(
  persist(
    (set, get) => ({
      // Initial state
      apiKey: "",
      isAuthenticated: false,
      models: [],
      modelsLoading: false,
      selectedHostModel: "",
      selectedGuestModel: "",
      selectedResearchModel: "",
      preferredProviders: {},
      rooms: [],
      activeRoomId: null,
      rightPanelTab: "config",
      expandedMessageId: null,
      sidebarCollapsed: false,

      // Auth
      setApiKey: (key) => set({ apiKey: key }),
      setAuthenticated: (val) => set({ isAuthenticated: val }),
      logout: () =>
        set({
          apiKey: "",
          isAuthenticated: false,
          models: [],
        }),

      // Models
      setModels: (models) => set({ models }),
      setModelsLoading: (val) => set({ modelsLoading: val }),
      setSelectedHostModel: (id) => set({ selectedHostModel: id }),
      setSelectedGuestModel: (id) => set({ selectedGuestModel: id }),
      setSelectedResearchModel: (id) => set({ selectedResearchModel: id }),
      setPreferredProviders: (modelId, providers) =>
        set((state) => ({
          preferredProviders: { ...state.preferredProviders, [modelId]: providers },
        })),

      // Rooms
      createRoom: (name, topic, config) => {
        const id = generateId();
        const room: DebateRoom = {
          id,
          name,
          topic,
          config: { ...defaultConfig(), ...config },
          guests: [],
          messages: [],
          researchFiles: [],
          phase: "IDLE",
          round: 0,
          hostMemory: emptyMemory(),
          pendingUserMessages: [],
          createdAt: Date.now(),
        };
        set((state) => ({
          rooms: [room, ...state.rooms],
          activeRoomId: id,
        }));
        return id;
      },

      deleteRoom: (id) =>
        set((state) => ({
          rooms: state.rooms.filter((r) => r.id !== id),
          activeRoomId: state.activeRoomId === id ? null : state.activeRoomId,
        })),

      setActiveRoom: (id) => set({ activeRoomId: id }),

      getActiveRoom: () => {
        const state = get();
        return state.rooms.find((r) => r.id === state.activeRoomId);
      },

      updateRoomConfig: (roomId, config) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, config: { ...r.config, ...config } } : r
          ),
        })),

      // Guests
      addGuest: (roomId, guest) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId
              ? {
                  ...r,
                  guests: [
                    ...r.guests,
                    { ...guest, id: generateId(), memory: emptyMemory() },
                  ],
                }
              : r
          ),
        })),

      removeGuest: (roomId, guestId) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId
              ? { ...r, guests: r.guests.filter((g) => g.id !== guestId) }
              : r
          ),
        })),

      updateGuestMemory: (roomId, guestId, memory) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId
              ? {
                  ...r,
                  guests: r.guests.map((g) =>
                    g.id === guestId ? { ...g, memory } : g
                  ),
                }
              : r
          ),
        })),

      // Messages
      addMessage: (roomId, message) => {
        const id = generateId();
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId
              ? {
                  ...r,
                  messages: [
                    ...r.messages,
                    { ...message, id, timestamp: Date.now() },
                  ],
                }
              : r
          ),
        }));
        return id;
      },

      updateMessage: (roomId, messageId, updates) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId
              ? {
                  ...r,
                  messages: r.messages.map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m
                  ),
                }
              : r
          ),
        })),

      appendToMessage: (roomId, messageId, content) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId
              ? {
                  ...r,
                  messages: r.messages.map((m) =>
                    m.id === messageId
                      ? { ...m, content: m.content + content }
                      : m
                  ),
                }
              : r
          ),
        })),

      // Phase
      setPhase: (roomId, phase) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, phase } : r
          ),
        })),

      incrementRound: (roomId) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, round: r.round + 1 } : r
          ),
        })),

      // Host memory
      updateHostMemory: (roomId, memory) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, hostMemory: memory } : r
          ),
        })),

      // Pending messages
      queueUserMessage: (roomId, message) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId
              ? { ...r, pendingUserMessages: [...r.pendingUserMessages, message] }
              : r
          ),
        })),

      dequeueUserMessage: (roomId) => {
        const room = get().rooms.find((r) => r.id === roomId);
        if (!room || room.pendingUserMessages.length === 0) return undefined;
        const [message, ...rest] = room.pendingUserMessages;
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, pendingUserMessages: rest } : r
          ),
        }));
        return message;
      },

      // Research files
      addResearchFile: (roomId, file) => {
        const id = generateId();
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId
              ? {
                  ...r,
                  researchFiles: [
                    ...r.researchFiles,
                    { ...file, id, timestamp: Date.now() },
                  ],
                }
              : r
          ),
        }));
        return id;
      },

      updateResearchFile: (roomId, fileId, updates) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId
              ? {
                  ...r,
                  researchFiles: r.researchFiles.map((f) =>
                    f.id === fileId ? { ...f, ...updates } : f
                  ),
                }
              : r
          ),
        })),

      appendToResearchFile: (roomId, fileId, content) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId
              ? {
                  ...r,
                  researchFiles: r.researchFiles.map((f) =>
                    f.id === fileId
                      ? { ...f, content: f.content + content }
                      : f
                  ),
                }
              : r
          ),
        })),

      // UI
      setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
      setExpandedMessageId: (id) => set({ expandedMessageId: id }),
      setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),
    }),
    {
      name: "debate-room-storage",
      version: 1,
      partialize: (state) => ({
        apiKey: state.apiKey,
        isAuthenticated: state.isAuthenticated,
        rooms: state.rooms,
        selectedHostModel: state.selectedHostModel,
        selectedGuestModel: state.selectedGuestModel,
        selectedResearchModel: state.selectedResearchModel,
        preferredProviders: state.preferredProviders,
      }),
    }
  )
);
