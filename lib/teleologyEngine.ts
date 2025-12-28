import OpenAI from "openai";

// Lazy initialization of OpenAI client (server-side only)
// This will only be used in API routes, never in client components
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export type TeleologyType =
  | "personal"
  | "religious"
  | "moralistic"
  | "national/ideological"
  | "conspiracy"
  | "harmless/weak";

export type ManipulationRisk = "low" | "medium" | "high";

export interface TeleologyAnalysis {
  teleologyScore: number; // 0.0–1.0, how strongly teleological the text is
  teleologyType: TeleologyType | null;
  manipulationRisk: ManipulationRisk;
  detectedPhrases: string[]; // raw phrases like "meant to", "in order to", "punishment", etc.
  purposeClaim: string | null; // short summary of the core "in order to" story, if present
  neutralCausalParaphrase: string | null; // same content rewritten in causal terms
}

/**
 * Generate purpose claim and neutral causal paraphrase using LLM
 */
async function generateTeleologySummaries(input: string): Promise<{
  purposeClaim: string | null;
  neutralCausalParaphrase: string | null;
}> {
  if (!input.trim()) {
    return { purposeClaim: null, neutralCausalParaphrase: null };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // No LLM available – fall back to heuristics only
    return {
      purposeClaim: null,
      neutralCausalParaphrase: null,
    };
  }

  try {
    const prompt = `
You are an assistant that analyzes teleological (purpose-based) language.

The user has written the following text:

---
${input}
---

1. First, identify the main *teleological story* in this text, if any. That is: how does the text explain events as happening "in order to", "meant to", "for the sake of", "as punishment", "as reward", etc. Summarize this in ONE short sentence. If there is no clear teleological story, return an empty string.

2. Second, rewrite the user's text as a neutral **causal description**:
   - Only talk about causes, conditions, actions, incentives, history, context.
   - Do NOT use "in order to", "meant to", "destiny", "fate", "punishment", "deserves", "reward", "for a reason", or any similar purpose-language.
   - The tone should be descriptive and matter-of-fact.

Return a JSON object with exactly the following fields:
{
  "purposeClaim": string,
  "neutralCausalParaphrase": string
}
If there is no teleological story, set "purposeClaim" to an empty string.
`;

    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a careful analyst of teleological language. You always return valid JSON that matches the requested schema.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = response.choices?.[0]?.message?.content;
    if (!raw) {
      return { purposeClaim: null, neutralCausalParaphrase: null };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { purposeClaim: null, neutralCausalParaphrase: null };
    }

    const purposeClaim =
      typeof parsed.purposeClaim === "string" && parsed.purposeClaim.trim().length > 0
        ? parsed.purposeClaim.trim()
        : null;

    const neutralCausalParaphrase =
      typeof parsed.neutralCausalParaphrase === "string" &&
      parsed.neutralCausalParaphrase.trim().length > 0
        ? parsed.neutralCausalParaphrase.trim()
        : null;

    return { purposeClaim, neutralCausalParaphrase };
  } catch (err) {
    console.error("[teleologyEngine] LLM summaries failed", err);
    return {
      purposeClaim: null,
      neutralCausalParaphrase: null,
    };
  }
}

/**
 * analyzeTeleology
 *
 * Shared entry point for teleology analysis.
 *
 * For now, this can be implemented in several ways:
 *  - a simple heuristic-based detector (regex over typical teleology phrases),
 *  - a call to an LLM (e.g. OpenAI) with a prompt that returns a JSON TeleologyAnalysis,
 *  - or a combination of both.
 *
 * The important thing is to keep the function signature stable so that:
 *  - SpiñO can call it on user messages,
 *  - Honestra components can call it on feed content / posts.
 */
export async function analyzeTeleology(input: string): Promise<TeleologyAnalysis> {
  // Heuristic-based detection (keywords, patterns)
  const lower = input.toLowerCase();

  const teleologyKeywords = [
    "in order to",
    "so that",
    "meant to",
    "trying to",
    "supposed to",
    "punishment",
    "deserves",
    "deserve",
    "fate",
    "destiny",
    "chosen",
    "god wants",
    "history wants",
    "the universe wants",
    "the world is",
    "the world wants",
    "teaching me",
    "showing me",
    "telling me"
  ];

  const detected: string[] = teleologyKeywords.filter((k) => lower.includes(k));
  const score = detected.length > 0 ? Math.min(1, 0.3 + detected.length * 0.1) : 0;

  // Very naive classification for now:
  let teleologyType: TeleologyType | null = null;
  let manipulationRisk: ManipulationRisk = "low";

  if (score === 0) {
    teleologyType = null;
    manipulationRisk = "low";
  } else {
    if (lower.includes("god") || lower.includes("universe") || lower.includes("fate") || lower.includes("destiny")) {
      teleologyType = "religious";
    } else if (lower.includes("nation") || lower.includes("history") || lower.includes("the people")) {
      teleologyType = "national/ideological";
    } else if (lower.includes("conspiracy") || lower.includes("they are all") || lower.includes("everything is orchestrated")) {
      teleologyType = "conspiracy";
    } else {
      teleologyType = "personal";
    }

    // Risk heuristic
    if (lower.includes("deserve") || lower.includes("punishment") || lower.includes("cleanse") || lower.includes("eradicate")) {
      manipulationRisk = "high";
    } else if (teleologyType === "religious" || teleologyType === "national/ideological" || teleologyType === "conspiracy") {
      manipulationRisk = "medium";
    } else {
      manipulationRisk = "low";
    }
  }

  // Call LLM to generate purposeClaim and neutralCausalParaphrase
  const { purposeClaim, neutralCausalParaphrase } = await generateTeleologySummaries(input);

  const analysis: TeleologyAnalysis = {
    teleologyScore: score,
    teleologyType,
    manipulationRisk,
    detectedPhrases: detected,
    purposeClaim,
    neutralCausalParaphrase,
  };

  return analysis;
}

