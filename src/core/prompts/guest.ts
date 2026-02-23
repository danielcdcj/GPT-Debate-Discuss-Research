import type { GuestMemory, ConversationEntry } from "../types";

const MAX_HISTORY_IN_PROMPT = 10;

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

  return `You are ${guestName}, a participant in a structured debate/discussion.

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
- Build on or challenge what other participants have said
- If research data is available, cite specific findings to support or challenge points
- Keep your response under 300 words unless the topic demands more`;
}

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
- Track how your stance has evolved
- Be concise in all fields`;
}

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
- 3-5 guests total`;
}
