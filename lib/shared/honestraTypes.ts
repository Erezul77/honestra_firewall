// src/honestraTypes.ts

export type HonestraReason =
  | "anthropomorphic_self"
  | "anthropomorphic_model"
  | "cosmic_purpose"
  | "collective_reification"      // People, society, community as agents
  | "institutional_reification"   // Government, market, law as agents
  | "nature_reification"          // Nature, evolution as intentional agents
  | "history_reification"         // History, progress as agents
  | "just_world"                  // Belief world rewards good, punishes bad
  | "body_teleology"              // Body knows/wants/needs
  | "tech_animism"                // Technology hates/wants/refuses
  | "divine_teleology"            // God's plan, divine purpose
  | "pathetic_fallacy"            // Emotions attributed to nature/weather
  | "karma"                       // Cosmic justice, what goes around
  | "conspiracy"                  // "They" hiding truth, coordinated intent
  | "agent_detection"             // Everything happens for a reason
  // === New narrative/teleological categories ===
  | "narrative_fallacy"           // Imposing story structure on life
  | "essentialism"                // Fixed identity beliefs ("that's who I am")
  | "victim_narrative"            // Persistent external blame pattern
  | "hindsight_bias"              // "I knew it all along"
  | "magical_thinking"            // Law of attraction, manifesting
  | "signs_omens"                 // Seeing meaningful signs in random events
  | "purpose_question"            // Teleological "why me?" questions
  | "emotion_personification"     // Treating emotions as agents
  | "time_teleology"              // Time heals, time will tell
  | "destiny_language";           // Destined, fate, calling

export type HonestraSeverity = "none" | "info" | "warn" | "block";

export interface HonestraChange {
  original: string;
  rewritten: string;
  reason: HonestraReason;
}

export interface HonestraGuardPayload {
  hasTeleology: boolean;
  teleologyScore: number; // 0–1
  reasons: HonestraReason[];
  severity: HonestraSeverity;
  changes: HonestraChange[];
}

/**
 * Compute severity from reasons.
 * - none  → no reasons
 * - info  → low-risk patterns (common figures of speech)
 * - warn  → medium-risk patterns (most teleological patterns)
 * - block → high-risk patterns (conspiracy, victim narratives)
 */
export function computeSeverity(reasons: HonestraReason[]): HonestraSeverity {
  if (!reasons || reasons.length === 0) {
    return "none";
  }

  // High risk - can lead to harmful action or persistent dysfunction
  const hasConspiracy = reasons.includes("conspiracy");
  const hasVictim = reasons.includes("victim_narrative");
  
  // Medium-high risk - significant narrative/teleological distortion
  const hasModel = reasons.includes("anthropomorphic_model");
  const hasCosmic = reasons.includes("cosmic_purpose");
  const hasCollective = reasons.includes("collective_reification");
  const hasInstitutional = reasons.includes("institutional_reification");
  const hasNature = reasons.includes("nature_reification");
  const hasHistory = reasons.includes("history_reification");
  const hasJustWorld = reasons.includes("just_world");
  const hasBody = reasons.includes("body_teleology");
  const hasDivine = reasons.includes("divine_teleology");
  const hasKarma = reasons.includes("karma");
  const hasAgentDetection = reasons.includes("agent_detection");
  const hasEssentialism = reasons.includes("essentialism");
  const hasMagical = reasons.includes("magical_thinking");
  const hasDestiny = reasons.includes("destiny_language");
  const hasPurposeQ = reasons.includes("purpose_question");
  const hasNarrative = reasons.includes("narrative_fallacy");
  
  // Low risk - common patterns, good to notice but not harmful
  const hasSelf = reasons.includes("anthropomorphic_self");
  const hasPathetic = reasons.includes("pathetic_fallacy");
  const hasTech = reasons.includes("tech_animism");
  const hasHindsight = reasons.includes("hindsight_bias");
  const hasSigns = reasons.includes("signs_omens");
  const hasEmotion = reasons.includes("emotion_personification");
  const hasTime = reasons.includes("time_teleology");

  // Block level for conspiracy and victim narratives (can be deeply harmful)
  if (hasConspiracy || hasVictim) {
    return "block";
  }

  // Warn level for most teleological/narrative patterns
  if (hasModel || hasCosmic || hasCollective || hasInstitutional || 
      hasNature || hasHistory || hasJustWorld || hasBody || 
      hasDivine || hasKarma || hasAgentDetection || hasEssentialism ||
      hasMagical || hasDestiny || hasPurposeQ || hasNarrative) {
    return "warn";
  }

  // Info level for common figures of speech
  if (hasSelf || hasPathetic || hasTech || hasHindsight || 
      hasSigns || hasEmotion || hasTime) {
    return "info";
  }

  return "none";
}

// ============================================================================
// Document Mode Types
// ============================================================================

export type HonestraDocumentStatus =
  | "globally_clean"
  | "mixed"
  | "globally_teleological";

export type HonestraInfiltrationLabel = "low" | "medium" | "high";

export interface HonestraDocumentSentence {
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
  guard: HonestraGuardPayload;
  isTeleological: boolean;
  isCosmic: boolean;
  isAnthropomorphic: boolean;
  isCritiqueContext: boolean;
}

export interface HonestraDocumentSummary {
  totalSentences: number;
  teleologicalSentences: number;
  teleologyDensity: number; // 0–1
  cosmicSentenceCount: number;
  cosmicRatio: number; // cosmic / teleological
  anthropomorphicSentenceCount: number;
  averageTeleologyScore: number;
  maxTeleologyScore: number;
  maxSeverity: HonestraSeverity;
  documentStatus: HonestraDocumentStatus;
  infiltrationScore: number; // 0–1
  infiltrationLabel: HonestraInfiltrationLabel;
}

export interface HonestraDocumentAnalysis {
  mode: "document";
  text: string;
  summary: HonestraDocumentSummary;
  sentences: HonestraDocumentSentence[];
}

