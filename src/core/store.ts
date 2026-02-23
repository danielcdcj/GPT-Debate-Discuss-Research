import { EventEmitter, type DebateEventMap } from "./events";
import type {
  Room,
  Guest,
  GuestMemory,
  Message,
  Phase,
  StructuredMemory,
  ResearchFile,
  LLMModel,
  DebateConfig,
  RightPanelTab,
} from "./types";
import { generateId } from "@/lib/utils";
import { emptyGuestMemory, emptyStructuredMemory } from "./memory";

// ─── State Shape ─────────────────────────────────────────────────────

export interface StoreState {
  apiKey: string;
  isAuthenticated: boolean;
  models: LLMModel[];
  modelsLoading: boolean;
  selectedHostModel: string;
  selectedGuestModel: string;
  selectedResearchModel: string;
  preferredProviders: Record<string, string[]>;
  rooms: Room[];
  activeRoomId: string | null;
  rightPanelTab: RightPanelTab;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  mobileRightPanelOpen: boolean;
}

function defaultConfig(): DebateConfig {
  return {
    style: "balanced",
    maxRounds: 10,
    customInstructions: "",
    autoResearch: false,
  };
}

function initialState(): StoreState {
  return {
    apiKey: "",
    isAuthenticated: false,
    models: [],
    modelsLoading: false,
    selectedHostModel: "openai/gpt-oss-120b",
    selectedGuestModel: "x-ai/grok-4.1-mini",
    selectedResearchModel: "",
    preferredProviders: {},
    rooms: [],
    activeRoomId: null,
    rightPanelTab: "config",
    sidebarCollapsed: false,
    mobileSidebarOpen: false,
    mobileRightPanelOpen: false,
  };
}

// ─── Persistence ─────────────────────────────────────────────────────

const STORAGE_KEY = "debate-room-v2";

function loadPersistedState(): Partial<StoreState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function persistState(state: StoreState): void {
  if (typeof window === "undefined") return;
  try {
    const toSave = {
      apiKey: state.apiKey,
      isAuthenticated: state.isAuthenticated,
      rooms: state.rooms,
      selectedHostModel: state.selectedHostModel,
      selectedGuestModel: state.selectedGuestModel,
      selectedResearchModel: state.selectedResearchModel,
      preferredProviders: state.preferredProviders,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // storage full or unavailable
  }
}

// ─── Store ───────────────────────────────────────────────────────────

export class DebateStore extends EventEmitter<DebateEventMap> {
  private state: StoreState;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    const persisted = loadPersistedState();
    this.state = { ...initialState(), ...persisted };
  }

  // ── Getters ──

  getState(): StoreState {
    return this.state;
  }

  getRoom(roomId: string): Room | undefined {
    return this.state.rooms.find((r) => r.id === roomId);
  }

  getActiveRoom(): Room | undefined {
    if (!this.state.activeRoomId) return undefined;
    return this.getRoom(this.state.activeRoomId);
  }

  // ── Private mutation helper ──

  private update(partial: Partial<StoreState>): void {
    this.state = { ...this.state, ...partial };
    this.schedulePersist();
  }

  private updateRoom(roomId: string, updater: (room: Room) => Room): void {
    this.state = {
      ...this.state,
      rooms: this.state.rooms.map((r) => (r.id === roomId ? updater(r) : r)),
    };
    this.schedulePersist();
  }

  private schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => persistState(this.state), 200);
  }

  // ── Auth ──

  setApiKey(key: string): void {
    this.update({ apiKey: key });
  }

  setAuthenticated(val: boolean): void {
    this.update({ isAuthenticated: val });
    this.emit("auth:changed", { isAuthenticated: val });
  }

  logout(): void {
    this.update({ apiKey: "", isAuthenticated: false, models: [] });
    this.emit("auth:changed", { isAuthenticated: false });
  }

  // ── Models ──

  setModels(models: LLMModel[]): void {
    this.update({ models });
    this.emit("models:loaded", { models });
  }

  setModelsLoading(loading: boolean): void {
    this.update({ modelsLoading: loading });
    this.emit("models:loading", { loading });
  }

  setSelectedHostModel(id: string): void {
    this.update({ selectedHostModel: id });
  }

  setSelectedGuestModel(id: string): void {
    this.update({ selectedGuestModel: id });
  }

  setSelectedResearchModel(id: string): void {
    this.update({ selectedResearchModel: id });
  }

  setPreferredProviders(modelId: string, providers: string[]): void {
    this.update({
      preferredProviders: { ...this.state.preferredProviders, [modelId]: providers },
    });
  }

  // ── Rooms ──

  createRoom(name: string, topic: string, config?: Partial<DebateConfig>): string {
    const id = generateId();
    const room: Room = {
      id,
      name,
      topic,
      config: { ...defaultConfig(), ...config },
      guests: [],
      messages: [],
      researchFiles: [],
      phase: "IDLE",
      round: 0,
      hostMemory: emptyStructuredMemory(),
      pendingUserMessages: [],
      createdAt: Date.now(),
    };
    this.update({
      rooms: [room, ...this.state.rooms],
      activeRoomId: id,
    });
    this.emit("room:created", { room });
    this.emit("room:active", { roomId: id });
    return id;
  }

  deleteRoom(id: string): void {
    this.update({
      rooms: this.state.rooms.filter((r) => r.id !== id),
      activeRoomId: this.state.activeRoomId === id ? null : this.state.activeRoomId,
    });
    this.emit("room:deleted", { roomId: id });
  }

  setActiveRoom(id: string | null): void {
    this.update({ activeRoomId: id, mobileSidebarOpen: false });
    this.emit("room:active", { roomId: id });
  }

  updateRoomConfig(roomId: string, config: Partial<DebateConfig>): void {
    this.updateRoom(roomId, (r) => ({ ...r, config: { ...r.config, ...config } }));
    const room = this.getRoom(roomId);
    if (room) this.emit("room:updated", { room });
  }

  // ── Guests ──

  addGuest(roomId: string, guest: Omit<Guest, "id" | "memory">): string {
    const id = generateId();
    const newGuest: Guest = { ...guest, id, memory: emptyGuestMemory() };
    this.updateRoom(roomId, (r) => ({ ...r, guests: [...r.guests, newGuest] }));
    this.emit("guest:added", { roomId, guest: newGuest });
    return id;
  }

  removeGuest(roomId: string, guestId: string): void {
    this.updateRoom(roomId, (r) => ({
      ...r,
      guests: r.guests.filter((g) => g.id !== guestId),
    }));
    this.emit("guest:removed", { roomId, guestId });
  }

  updateGuestModel(roomId: string, guestId: string, model: string): void {
    this.updateRoom(roomId, (r) => ({
      ...r,
      guests: r.guests.map((g) => (g.id === guestId ? { ...g, model } : g)),
    }));
    this.emit("guest:model:changed", { roomId, guestId, model });
  }

  updateGuestMemory(roomId: string, guestId: string, memory: GuestMemory): void {
    this.updateRoom(roomId, (r) => ({
      ...r,
      guests: r.guests.map((g) => (g.id === guestId ? { ...g, memory } : g)),
    }));
    this.emit("guest:memory:updated", { roomId, guestId, memory });
  }

  // ── Messages ──

  addMessage(roomId: string, message: Omit<Message, "id" | "timestamp">): string {
    const id = generateId();
    const full: Message = { ...message, id, timestamp: Date.now() };
    this.updateRoom(roomId, (r) => ({
      ...r,
      messages: [...r.messages, full],
    }));
    this.emit("message:added", { roomId, message: full });
    return id;
  }

  updateMessage(roomId: string, messageId: string, updates: Partial<Message>): void {
    this.updateRoom(roomId, (r) => ({
      ...r,
      messages: r.messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m)),
    }));
    this.emit("message:updated", { roomId, messageId, updates });
  }

  appendToMessage(roomId: string, messageId: string, chunk: string): void {
    this.updateRoom(roomId, (r) => ({
      ...r,
      messages: r.messages.map((m) =>
        m.id === messageId ? { ...m, content: m.content + chunk } : m
      ),
    }));
    this.emit("message:chunk", { roomId, messageId, chunk });
  }

  // ── Phase ──

  setPhase(roomId: string, phase: Phase): void {
    const room = this.getRoom(roomId);
    if (!room) return;
    const previous = room.phase;
    this.updateRoom(roomId, (r) => ({ ...r, phase }));
    this.emit("phase:changed", { roomId, phase, previous });
  }

  incrementRound(roomId: string): void {
    this.updateRoom(roomId, (r) => ({ ...r, round: r.round + 1 }));
  }

  // ── Host Memory ──

  updateHostMemory(roomId: string, memory: StructuredMemory): void {
    this.updateRoom(roomId, (r) => ({ ...r, hostMemory: memory }));
    this.emit("host:memory:updated", { roomId, memory });
  }

  // ── Pending Messages ──

  queueUserMessage(roomId: string, message: string): void {
    this.updateRoom(roomId, (r) => ({
      ...r,
      pendingUserMessages: [...r.pendingUserMessages, message],
    }));
  }

  dequeueUserMessage(roomId: string): string | undefined {
    const room = this.getRoom(roomId);
    if (!room || room.pendingUserMessages.length === 0) return undefined;
    const [message, ...rest] = room.pendingUserMessages;
    this.updateRoom(roomId, (r) => ({ ...r, pendingUserMessages: rest }));
    return message;
  }

  // ── Research Files ──

  addResearchFile(roomId: string, file: Omit<ResearchFile, "id" | "timestamp">): string {
    const id = generateId();
    const full: ResearchFile = { ...file, id, timestamp: Date.now() };
    this.updateRoom(roomId, (r) => ({
      ...r,
      researchFiles: [...r.researchFiles, full],
    }));
    this.emit("research:file:added", { roomId, file: full });
    return id;
  }

  updateResearchFile(roomId: string, fileId: string, updates: Partial<ResearchFile>): void {
    this.updateRoom(roomId, (r) => ({
      ...r,
      researchFiles: r.researchFiles.map((f) => (f.id === fileId ? { ...f, ...updates } : f)),
    }));
    this.emit("research:file:updated", { roomId, fileId, updates });
  }

  appendToResearchFile(roomId: string, fileId: string, chunk: string): void {
    this.updateRoom(roomId, (r) => ({
      ...r,
      researchFiles: r.researchFiles.map((f) =>
        f.id === fileId ? { ...f, content: f.content + chunk } : f
      ),
    }));
    this.emit("research:file:chunk", { roomId, fileId, chunk });
  }

  // ── UI State ──

  setRightPanelTab(tab: RightPanelTab): void {
    this.update({ rightPanelTab: tab });
    this.emit("ui:rightPanelTab", { tab });
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.update({ sidebarCollapsed: collapsed });
    this.emit("ui:sidebarCollapsed", { collapsed });
  }

  setMobileSidebarOpen(open: boolean): void {
    this.update({
      mobileSidebarOpen: open,
      ...(open ? { mobileRightPanelOpen: false } : {}),
    });
    this.emit("ui:mobileSidebarOpen", { open });
  }

  setMobileRightPanelOpen(open: boolean): void {
    this.update({
      mobileRightPanelOpen: open,
      ...(open ? { mobileSidebarOpen: false } : {}),
    });
    this.emit("ui:mobileRightPanelOpen", { open });
  }
}

// Singleton for the app
let storeInstance: DebateStore | null = null;

export function getStore(): DebateStore {
  if (!storeInstance) {
    storeInstance = new DebateStore();
  }
  return storeInstance;
}
