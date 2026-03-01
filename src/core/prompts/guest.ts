import type { GuestMemory, ConversationEntry } from "../types";

const MAX_HISTORY_IN_PROMPT = 10;

// ─── Standard guest response (responds to host) ─────────────────────

interface GuestResponseParams {
  guestName: string;
  personality: string;
  topic: string;
  memory: GuestMemory;
  hostMessage: string;
  researchContext?: string;
}

export function guestResponsePrompt(params: GuestResponseParams): string {
  const { guestName, personality, topic, memory, hostMessage, researchContext } = params;

  const recentHistory = memory.history.slice(-MAX_HISTORY_IN_PROMPT);
  const historyText = recentHistory.length > 0
    ? formatHistory(recentHistory)
    : "No conversation history yet.";

  return `You are ${guestName}, a participant in a live structured debate/discussion.

YOUR PERSONALITY AND EXPERTISE:
${personality}

TOPIC: ${topic}

YOUR CURRENT STANCES:
${JSON.stringify(memory.structured)}

RECENT CONVERSATION HISTORY:
${historyText}

${researchContext ? `RESEARCH DATA AVAILABLE:\nThe following research has been gathered. You may reference, critique, or build upon these findings.\n\n${researchContext}\n` : ""}THE HOST JUST SAID:
${hostMessage}

Respond in character. Be specific, substantive, and true to your personality.
- Reference your evolving stances when relevant
- Directly engage with what other participants have said — agree, disagree, build on, or challenge their specific points
- If another guest made a claim you find questionable, say so explicitly and explain why
- If research data is available, cite specific findings to support or challenge points
- Be willing to update your position if evidence warrants it — say "I've changed my mind on X because..."
- Keep your response under 300 words unless the topic demands more`;
}

// ─── Exchange prompt (direct guest-to-guest response) ────────────────

interface ExchangeResponseParams {
  guestName: string;
  personality: string;
  topic: string;
  memory: GuestMemory;
  hostFraming: string;
  otherGuestResponses: Array<{ name: string; response: string }>;
  exchangeRound: number;
  researchContext?: string;
}

export function exchangeResponsePrompt(params: ExchangeResponseParams): string {
  const {
    guestName,
    personality,
    topic,
    memory,
    hostFraming,
    otherGuestResponses,
    exchangeRound,
    researchContext,
  } = params;

  const recentHistory = memory.history.slice(-MAX_HISTORY_IN_PROMPT);
  const historyText = recentHistory.length > 0
    ? formatHistory(recentHistory)
    : "No conversation history yet.";

  const otherResponses = otherGuestResponses
    .map((r) => `**${r.name}** said:\n"${r.response}"`)
    .join("\n\n---\n\n");

  return `You are ${guestName}, in a DIRECT EXCHANGE with other guests in a live debate.

YOUR PERSONALITY AND EXPERTISE:
${personality}

TOPIC: ${topic}

YOUR CURRENT STANCES:
${JSON.stringify(memory.structured)}

RECENT CONVERSATION HISTORY:
${historyText}

${researchContext ? `RESEARCH DATA:\n${researchContext}\n` : ""}THE HOST FRAMED THIS EXCHANGE AS:
${hostFraming}

${exchangeRound === 1 ? "THIS IS YOUR OPENING STATEMENT in this exchange." : `THIS IS EXCHANGE ROUND ${exchangeRound}. Here's what the other guest(s) just said:`}

${exchangeRound > 1 ? otherResponses : ""}

CRITICAL INSTRUCTIONS:
- You are talking DIRECTLY to the other guest(s), not to the host.
- Address them by name. Quote their specific points. Respond to their actual arguments.
- Don't just restate your position — engage with THEIR reasoning.
- If they made a good point, acknowledge it. If they're wrong, explain exactly why.
- Be passionate but substantive. This is a real debate.
- ${exchangeRound === 1 ? "State your position clearly and make your strongest case." : "Respond directly to what was just said. Don't repeat yourself — advance the argument."}
- Keep to 200 words. Be punchy and direct.`;
}

// ─── Challenge response (guest defends against host's challenge) ─────

interface ChallengeResponseParams {
  guestName: string;
  personality: string;
  topic: string;
  memory: GuestMemory;
  challenge: string;
  researchContext?: string;
}

export function challengeResponsePrompt(params: ChallengeResponseParams): string {
  const { guestName, personality, topic, memory, challenge, researchContext } = params;

  return `You are ${guestName}, and the HOST has directly CHALLENGED your position.

YOUR PERSONALITY AND EXPERTISE:
${personality}

TOPIC: ${topic}

YOUR CURRENT STANCES:
${JSON.stringify(memory.structured)}

${researchContext ? `RESEARCH DATA:\n${researchContext}\n` : ""}THE HOST'S CHALLENGE:
${challenge}

INSTRUCTIONS:
- Defend your position robustly, or acknowledge valid points in the challenge.
- Be specific. Cite evidence. Don't be vague or evasive.
- If the challenge reveals a genuine weakness in your argument, be honest about it. You can refine your position.
- If you stand firm, explain exactly why the challenge doesn't undermine your core point.
- Show intellectual honesty — the audience respects someone who can update their views.
- Keep to 250 words.`;
}

// ─── Deep dive response (guest responds to specific subtopic) ────────

interface DeepDiveResponseParams {
  guestName: string;
  personality: string;
  topic: string;
  memory: GuestMemory;
  subtopic: string;
  hostMessage: string;
  researchContext?: string;
}

export function deepDiveResponsePrompt(params: DeepDiveResponseParams): string {
  const { guestName, personality, topic, memory, subtopic, hostMessage, researchContext } = params;

  return `You are ${guestName}, and the debate is now DEEP DIVING into a specific subtopic.

YOUR PERSONALITY AND EXPERTISE:
${personality}

MAIN TOPIC: ${topic}
SUBTOPIC FOCUS: ${subtopic}

YOUR CURRENT STANCES:
${JSON.stringify(memory.structured)}

${researchContext ? `RESEARCH DATA:\n${researchContext}\n` : ""}THE HOST SAID:
${hostMessage}

INSTRUCTIONS:
- Focus specifically on "${subtopic}" — don't drift to the broader topic.
- Bring your unique expertise to bear on this specific angle.
- Be detailed and substantive. This is where deep knowledge matters.
- Reference any relevant research data.
- If this subtopic reveals tensions with your broader position, address that honestly.
- Keep to 250 words.`;
}

// ─── Helper: format conversation history ─────────────────────────────

function formatHistory(entries: ConversationEntry[]): string {
  return entries
    .map((e) => {
      const label =
        e.role === "self"
          ? "You"
          : e.role === "user"
          ? "User"
          : e.role === "host"
          ? "Host"
          : e.speaker || "Guest";
      return `[Round ${e.round}] ${label}: ${e.content}`;
    })
    .join("\n\n");
}

// ─── Memory update prompt ────────────────────────────────────────────

interface GuestMemoryUpdateParams {
  guestName: string;
  currentMemory: GuestMemory;
  newEvent: string;
}

export function guestMemoryUpdatePrompt(params: GuestMemoryUpdateParams): string {
  const { guestName, currentMemory, newEvent } = params;

  return `You are maintaining a memory log for the debate participant "${guestName}".

CURRENT STRUCTURED MEMORY:
${JSON.stringify(currentMemory.structured)}

NEW EVENT:
${newEvent}

Update the structured memory. Respond with ONLY a valid JSON object (no markdown, no backticks):
{
  "positions": [{"topic": "...", "stance": "...", "confidence": 0.0-1.0}],
  "keyMoments": ["concise moment descriptions"],
  "otherGuestsSummary": "brief summary of what other guests think",
  "userPreferences": "what the user seems to want or favor"
}

Rules:
- Keep keyMoments to the 10 most important moments (compact older ones)
- Update confidence levels based on new evidence or arguments
- Track how your stance has evolved — if you changed your mind, note it
- Note specific disagreements with other guests
- Be concise in all fields`;
}

// ─── Guest generation prompt ─────────────────────────────────────────

export function generateGuestsPrompt(
  topic: string,
  style: string,
  customInstructions?: string
): string {
  return `You are setting up a debate/discussion room. Generate a diverse panel of guests.

TOPIC: ${topic}
DEBATE STYLE: ${style}
${customInstructions ? "SPECIAL INSTRUCTIONS: " + customInstructions : ""}

Generate 3-5 guests with complementary but diverse viewpoints.

Respond with ONLY a JSON object (no markdown, no backticks):
{
  "guests": [
    {
      "name": "A short character name (e.g., 'The Pragmatist', 'Dr. Sarah Chen')",
      "personality": "A detailed personality description (3-4 sentences). Include expertise, perspective, debating style, and angle on this specific topic."
    }
  ]
}

Rules:
- Each guest should represent a genuinely different perspective
- Personalities should be specific to the topic, not generic
- Include a mix of supportive, critical, and analytical viewpoints
- Make sure at least 2 guests are likely to DISAGREE with each other
- 3-5 guests total`;
}
