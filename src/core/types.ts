// ─── Debate Configuration ────────────────────────────────────────────

export type DebateStyle =
  | "balanced"
  | "adversarial"
  | "collaborative"
  | "socratic"
  | "devils_advocate";

export interface DebateConfig {
  style: DebateStyle;
  maxRounds: number;
  customInstructions: string;
  autoResearch: boolean;
}

// ─── Phases ──────────────────────────────────────────────────────────

export type Phase =
  | "IDLE"
  | "AWAITING_USER"
  | "HOST_THINKING"
  | "HOST_PRESENTING"
  | "GUESTS_RESPONDING"
  | "RESEARCH_PHASE";

// ─── Messages ────────────────────────────────────────────────────────

export type MessageRole = "host" | "guest" | "user" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  guestId?: string;
  guestName?: string;
  guestAvatar?: string;
  isStreaming: boolean;
  isSummary: boolean;
  isError: boolean;
  timestamp: number;
}

// ─── Guest Memory ────────────────────────────────────────────────────

export interface GuestPosition {
  topic: string;
  stance: string;
  confidence: number;
}

export interface ConversationEntry {
  round: number;
  role: "host" | "user" | "self" | "other_guest";
  speaker?: string;
  content: string;
}

export interface StructuredMemory {
  positions: GuestPosition[];
  keyMoments: string[];
  otherGuestsSummary: string;
  userPreferences: string;
}

export interface GuestMemory {
  structured: StructuredMemory;
  history: ConversationEntry[];
}

// ─── Guest ───────────────────────────────────────────────────────────

export interface Guest {
  id: string;
  name: string;
  avatar: string;
  personality: string;
  model?: string;
  memory: GuestMemory;
}

// ─── Research ────────────────────────────────────────────────────────

export interface ResearcherProfile {
  name: string;
  emoji: string;
  focus: string;
}

export interface ResearchFile {
  id: string;
  title: string;
  researcher: ResearcherProfile;
  content: string;
  isStreaming: boolean;
  timestamp: number;
}

export const RESEARCHER_PROFILES: ResearcherProfile[] = [
  { name: "Academic Scholar", emoji: "📚", focus: "peer-reviewed papers & academic sources" },
  { name: "News Analyst", emoji: "📰", focus: "current news articles & journalism" },
  { name: "Data Researcher", emoji: "📊", focus: "statistics, data, and empirical evidence" },
  { name: "Historical Analyst", emoji: "🏛️", focus: "historical context & precedents" },
];

// ─── Room ────────────────────────────────────────────────────────────

export interface Room {
  id: string;
  name: string;
  topic: string;
  config: DebateConfig;
  guests: Guest[];
  messages: Message[];
  researchFiles: ResearchFile[];
  phase: Phase;
  round: number;
  hostMemory: StructuredMemory;
  pendingUserMessages: string[];
  createdAt: number;
}

// ─── Host Decision ──────────────────────────────────────────────────

export interface HostDecision {
  action: "research" | "guests" | "ask_user" | "conclude";
  message: string;
  research_queries?: string[];
}

// ─── Models ──────────────────────────────────────────────────────────

export interface LLMModel {
  id: string;
  name: string;
  pricing: { prompt: string; completion: string };
  context_length: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
}

export interface ModelConfig {
  host: string;
  defaultGuest: string;
  research: string;
}

// ─── UI State ────────────────────────────────────────────────────────

export type RightPanelTab = "config" | "guests" | "research";
