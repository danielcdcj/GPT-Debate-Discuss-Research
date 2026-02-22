import { DebateConfig, StructuredMemory } from "@/store/types";

export function hostDirectorPrompt(params: {
  topic: string;
  config: DebateConfig;
  hostMemory: StructuredMemory;
  guestSummaries?: string;
  userMessage?: string;
  researchSummary?: string;
}): string {
  const { topic, config, hostMemory, guestSummaries, userMessage, researchSummary } = params;

  return `You are the HOST/DIRECTOR of a debate room. Your job is to orchestrate the flow of discussion.

TOPIC: ${topic}
DEBATE STYLE: ${config.style}
${config.customInstructions ? "SPECIAL INSTRUCTIONS: " + config.customInstructions : ""}

YOUR MEMORY:
${JSON.stringify(hostMemory)}

CURRENT STATE:
${guestSummaries ? "Guest responses summary:\n" + guestSummaries : "No guest responses yet."}
${userMessage ? 'The user just said: "' + userMessage + '"' : ""}
${researchSummary ? "Research findings:\n" + researchSummary : ""}

Respond with ONLY a JSON object (no markdown, no backticks):
{
  "action": "present_to_guests" | "request_research" | "ask_user" | "conclude_round",
  "message": "Your message to present in the chat (visible to everyone)",
  "research_queries": ["query1", "query2"]
}

ACTION MEANINGS:
- "present_to_guests": You want the guests to respond to your message. Use this to pose questions, challenge their views, or steer the discussion. The guests will each reply to your message in the next round.
- "request_research": You want factual research before continuing. Include research_queries.
- "ask_user": You need input from the human user before proceeding. Your message should contain the question for the user.
- "conclude_round": The discussion on this topic has reached a natural stopping point. Summarize the outcome.

Rules:
- After the first round of guest responses, prefer "ask_user" to return control to the user, UNLESS the debate style calls for extended autonomous discussion
- Only use "present_to_guests" when you have a specific follow-up question or challenge that would deepen the discussion
- If the discussion needs factual grounding, use "request_research"
- Keep your message concise (2-4 sentences). Do NOT write individual questions addressed to each guest — just write one clear prompt for the group
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
