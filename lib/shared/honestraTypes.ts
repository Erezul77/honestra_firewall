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
  | "agent_detection";            // Everything happens for a reason

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
 * - info  → low-risk patterns (anthropomorphic_self, pathetic_fallacy, tech_animism)
 * - warn  → medium-risk patterns (most teleological patterns)
 * - block → high-risk patterns (conspiracy, some divine claims)
 */
export function computeSeverity(reasons: HonestraReason[]): HonestraSeverity {
  if (!reasons || reasons.length === 0) {
    return "none";
  }

  // High risk - potential for harmful action
  const hasConspiracy = reasons.includes("conspiracy");
  
  // Medium risk - significant teleological distortion
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
  
  // Low risk - common figures of speech
  const hasSelf = reasons.includes("anthropomorphic_self");
  const hasPathetic = reasons.includes("pathetic_fallacy");
  const hasTech = reasons.includes("tech_animism");

  // Block level for conspiracy (can lead to harmful actions)
  if (hasConspiracy) {
    return "block";
  }

  // Warn level for most teleological patterns
  if (hasModel || hasCosmic || hasCollective || hasInstitutional || 
      hasNature || hasHistory || hasJustWorld || hasBody || 
      hasDivine || hasKarma || hasAgentDetection) {
    return "warn";
  }

  // Info level for common figures of speech
  if (hasSelf || hasPathetic || hasTech) {
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

