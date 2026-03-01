import type {
  Room,
  Message,
  Phase,
  Guest,
  GuestMemory,
  StructuredMemory,
  ResearchFile,
  HostDecision,
  LLMModel,
  RightPanelTab,
} from "./types";

// ─── Event Map ───────────────────────────────────────────────────────

export interface DebateEventMap {
  [key: string]: unknown;
  // Room lifecycle
  "room:created": { room: Room };
  "room:deleted": { roomId: string };
  "room:updated": { room: Room };
  "room:active": { roomId: string | null };

  // Phase
  "phase:changed": { roomId: string; phase: Phase; previous: Phase };

  // Messages
  "message:added": { roomId: string; message: Message };
  "message:updated": { roomId: string; messageId: string; updates: Partial<Message> };
  "message:chunk": { roomId: string; messageId: string; chunk: string };

  // Host
  "host:deciding": { roomId: string };
  "host:decided": { roomId: string; decision: HostDecision };
  "host:memory:updated": { roomId: string; memory: StructuredMemory };

  // Guests
  "guest:added": { roomId: string; guest: Guest };
  "guest:removed": { roomId: string; guestId: string };
  "guest:model:changed": { roomId: string; guestId: string; model: string };
  "guest:memory:updated": { roomId: string; guestId: string; memory: GuestMemory };

  // Research
  "research:started": { roomId: string; queries: string[] };
  "research:file:added": { roomId: string; file: ResearchFile };
  "research:file:updated": { roomId: string; fileId: string; updates: Partial<ResearchFile> };
  "research:file:chunk": { roomId: string; fileId: string; chunk: string };
  "research:completed": { roomId: string };

  // Models
  "models:loaded": { models: LLMModel[] };
  "models:loading": { loading: boolean };

  // Auth
  "auth:changed": { isAuthenticated: boolean };

  // UI
  "ui:rightPanelTab": { tab: RightPanelTab };
  "ui:sidebarCollapsed": { collapsed: boolean };
  "ui:mobileSidebarOpen": { open: boolean };
  "ui:mobileRightPanelOpen": { open: boolean };

  // Debate dynamics
  "debate:intensity": { roomId: string; intensity: number };

  // State snapshot (for full re-sync)
  "state:snapshot": { rooms: Room[] };
}

// ─── Typed Event Emitter ─────────────────────────────────────────────

type Handler<T = unknown> = (data: T) => void;

export class EventEmitter<Events extends Record<string, unknown>> {
  private listeners = new Map<string, Set<Handler>>();

  on<K extends keyof Events & string>(event: K, handler: Handler<Events[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const h = handler as Handler;
    this.listeners.get(event)!.add(h);
    return () => {
      this.listeners.get(event)?.delete(h);
    };
  }

  off<K extends keyof Events & string>(event: K, handler: Handler<Events[K]>): void {
    this.listeners.get(event)?.delete(handler as Handler);
  }

  emit<K extends keyof Events & string>(event: K, data: Events[K]): void {
    this.listeners.get(event)?.forEach((h) => {
      try {
        h(data);
      } catch (err) {
        console.error(`Event handler error for "${event}":`, err);
      }
    });
  }

  removeAllListeners(event?: keyof Events & string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
