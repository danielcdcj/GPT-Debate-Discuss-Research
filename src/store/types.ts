export type DebateStyle = "balanced" | "adversarial" | "collaborative" | "socratic" | "devils_advocate";

export type DebatePhase =
  | "IDLE"
  | "AWAITING_USER"
  | "GUESTS_RESPONDING"
  | "HOST_SUMMARIZING"
  | "RESEARCH_PHASE"
  | "HOST_PRESENTING";

export type MessageRole = "host" | "guest" | "user" | "system";

export type RightPanelTab = "config" | "guests" | "research";

export interface StructuredMemory {
  my_positions: Array<{ topic: string; stance: string; confidence: number }>;
  key_moments: string[];
  other_guests_summary: string;
  user_preferences: string;
}

export interface Guest {
  id: string;
  name: string;
  avatar: string;
  personality: string;
  memory: StructuredMemory;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  guestId?: string;
  guestName?: string;
  guestAvatar?: string;
  isLoading: boolean;
  isStreaming: boolean;
  isSummary: boolean;
  isError: boolean;
  timestamp: number;
}

export interface ResearchFile {
  id: string;
  title: string;
  researcher: { name: string; emoji: string; focus: string };
  content: string;
  isStreaming: boolean;
  timestamp: number;
}

export interface DebateConfig {
  style: DebateStyle;
  maxRounds: number;
  customInstructions: string;
  autoResearch: boolean;
}

export interface DebateRoom {
  id: string;
  name: string;
  topic: string;
  config: DebateConfig;
  guests: Guest[];
  messages: Message[];
  researchFiles: ResearchFile[];
  phase: DebatePhase;
  round: number;
  hostMemory: StructuredMemory;
  pendingUserMessages: string[];
  createdAt: number;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
}

export interface ModelEndpoint {
  provider_name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  quantization?: string;
  context_length: number;
  max_completion_tokens?: number;
  status?: string;
}

export interface DirectorDecision {
  action: "present_to_guests" | "request_research" | "ask_user" | "conclude_round";
  message: string;
  research_queries?: string[];
}

export interface ResearcherProfile {
  name: string;
  emoji: string;
  focus: string;
}

export const RESEARCHER_PROFILES: ResearcherProfile[] = [
  { name: "Academic Scholar", emoji: "📚", focus: "peer-reviewed papers & academic sources" },
  { name: "News Analyst", emoji: "📰", focus: "current news articles & journalism" },
  { name: "Data Researcher", emoji: "📊", focus: "statistics, data, and empirical evidence" },
  { name: "Historical Analyst", emoji: "🏛️", focus: "historical context & precedents" },
];
