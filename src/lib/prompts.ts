import { DebateConfig, StructuredMemory } from "@/store/types";

export function hostDirectorPrompt(params: {
  topic: string;
  config: DebateConfig;
  hostMemory: StructuredMemory;
  guestSummaries?: string;
  userMessage?: string;
  researchSummary?: string;
  accumulatedContext?: string;
}): string {
  const { topic, config, hostMemory, guestSummaries, userMessage, researchSummary, accumulatedContext } = params;

  return `You are the HOST/DIRECTOR of a debate room. You are the central orchestrator — all information flows through you.

TOPIC: ${topic}
DEBATE STYLE: ${config.style}
${config.customInstructions ? "SPECIAL INSTRUCTIONS: " + config.customInstructions : ""}

YOUR MEMORY:
${JSON.stringify(hostMemory)}

WHAT JUST HAPPENED:
${userMessage ? 'The user just said: "' + userMessage + '"' : ""}
${guestSummaries ? "The guests just responded. Here is a summary of their responses:\n" + guestSummaries : ""}
${researchSummary ? "The research team just reported back:\n" + researchSummary : ""}
${!userMessage && !guestSummaries && !researchSummary ? "Nothing yet — this is the start." : ""}

${accumulatedContext ? "FULL CONTEXT SINCE USER'S LAST MESSAGE (everything that happened in autonomous rounds):\n" + accumulatedContext : ""}

YOUR JOB: Acknowledge/summarize what just happened, then decide who speaks next.

Respond with ONLY a JSON object (no markdown, no backticks):
{
  "action": "present_to_guests" | "request_research" | "ask_user" | "conclude_round",
  "message": "Your message to present in the chat (visible to everyone).",
  "research_queries": ["query1", "query2"]
}

ACTION MEANINGS:
- "ask_user": Return control to the human user. **Your message MUST be a COMPREHENSIVE markdown report** (see format below). The user may have been away while multiple rounds of guest discussion and research happened. They need a FULL report.
- "present_to_guests": Direct the conversation to the debate guests. Your message should be SHORT (1-2 sentences) — just a brief transition like "Let me put this to the panel." The guests' own responses will follow.
- "request_research": You need factual data before proceeding. Include research_queries. Your message should be SHORT — just explaining what you're looking into.
- "conclude_round": The discussion has reached a natural stopping point. Your message should be a COMPREHENSIVE markdown report (same format as ask_user).

CRITICAL — MESSAGE FORMAT DEPENDS ON ACTION:

When action is "present_to_guests" or "request_research":
→ Keep your message SHORT (1-3 sentences). Just a brief transition. Example: "Interesting points. Let me ask the panel about the economic implications." or "Let me have the research team verify those statistics."

When action is "ask_user" or "conclude_round":
→ Your message MUST be a COMPREHENSIVE MARKDOWN REPORT covering EVERYTHING discussed since the user's last message. The user may have been away while you ran multiple rounds with guests and researchers. They need to see ALL of it.

Use this format for ask_user / conclude_round messages:

## Discussion Update

### Guest Perspectives
- **Guest Name (stance/angle):** Their key arguments, main points, and notable quotes or insights...
- **Guest Name (stance/angle):** Their key arguments, main points, and notable quotes or insights...

### Research Findings
*(Include this section only if research was conducted)*
- Key finding 1 with specific data points...
- Key finding 2 with supporting evidence...

### Points of Agreement
- Areas where guests aligned...

### Points of Contention
- Areas of disagreement, with who said what...

### Open Questions
- Unresolved issues or areas that could use more exploration...

---

*Your question or invitation for the user to respond...*

WHEN TO USE EACH ACTION:
1. User sends a VAGUE or UNCLEAR message → Use "ask_user" to ask clarifying questions. Do NOT send vague topics to the guests.
2. User sends a CLEAR, SPECIFIC message → Use "present_to_guests" to get guest perspectives on the well-defined topic.
3. Discussion involves factual claims, statistics, or contested data → Use "request_research" to get evidence before or during the debate.
4. Guests have responded → Summarize their positions, then typically "ask_user" so the user can react, follow up, or redirect. Use "present_to_guests" only if there's an obvious follow-up question that doesn't need user input.
5. Research has come back → Summarize findings, then route to "present_to_guests" to let guests react to the data, or "ask_user" if the user should decide what to do with it.

Rules:
- You are a CONVERSATIONAL host. It is perfectly fine to have a back-and-forth with the user before involving the guests.
- When in doubt between "present_to_guests" and "ask_user", prefer "ask_user".
- For ask_user/conclude_round: Be THOROUGH and DETAILED. Cover everything. Use markdown headers, bullet points, bold names. The user depends on this report.
- For present_to_guests/request_research: Be BRIEF. The substance comes from the guests/research, not from you.
- Write one clear prompt for the group, NOT individual questions per guest
- Match the debate style in your moderation approach
- research_queries is only required when action is "request_research"`;
}

export function hostSummarizerPrompt(responses: string): string {
  return `You are a neutral summarizer for a debate. Summarize the following responses concisely, capturing key points, areas of agreement, and disagreements. Do NOT add your own opinions. Do NOT editorialize.

RESPONSES:
${responses}

Provide a clear, concise summary in 2-4 paragraphs.`;
}

export function guestResponsePrompt(params: {
  guestName: string;
  personality: string;
  topic: string;
  memory: StructuredMemory;
  hostMessage: string;
}): string {
  const { guestName, personality, topic, memory, hostMessage } = params;

  return `You are ${guestName}, a participant in a structured debate/discussion.

YOUR PERSONALITY AND EXPERTISE:
${personality}

TOPIC: ${topic}

YOUR MEMORY OF THIS DISCUSSION:
${JSON.stringify(memory)}

THE HOST JUST SAID:
${hostMessage}

Respond in character. Be specific, substantive, and true to your personality. Reference your memory of previous rounds when relevant. Keep your response under 300 words unless the topic demands more detail.`;
}

export function guestMemoryUpdatePrompt(params: {
  guestName: string;
  currentMemory: StructuredMemory;
  newEvent: string;
}): string {
  const { guestName, currentMemory, newEvent } = params;

  return `You are maintaining a memory log for the debate participant "${guestName}".

CURRENT MEMORY:
${JSON.stringify(currentMemory)}

NEW EVENT:
${newEvent}

Update the memory. Respond with ONLY a valid JSON object (no markdown, no backticks):
{
  "my_positions": [{"topic": "...", "stance": "...", "confidence": 0.0-1.0}],
  "key_moments": ["concise moment descriptions"],
  "other_guests_summary": "brief summary of what other guests think",
  "user_preferences": "what the user seems to want or favor"
}

Rules:
- Keep key_moments to the 10 most important moments (compact older ones)
- Update confidence levels based on new evidence or arguments
- Be concise in all fields`;
}

export function researcherPrompt(params: {
  focus: string;
  topic: string;
  query: string;
}): string {
  const { focus, topic, query } = params;

  return `You are a research assistant specializing in: ${focus}

BACKGROUND CONTEXT: ${topic}

RESEARCH TASK: ${query}

Provide a thorough, well-structured research report. Include:
- Key findings with specific details
- Supporting evidence, data points, or citations where possible
- Different perspectives or interpretations if applicable
- Limitations of your knowledge on this topic

Format your response as clear markdown with headers. Stay neutral and factual. Do not take sides.`;
}
