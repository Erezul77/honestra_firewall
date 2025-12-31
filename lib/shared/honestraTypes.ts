// src/honestraTypes.ts

export type HonestraReason =
  | "anthropomorphic_self"
  | "anthropomorphic_model"
  | "cosmic_purpose"
  | "collective_reification"      // People, society, community as agents
  | "institutional_reification"   // Government, market, law as agents
  | "nature_reification"          // Nature, evolution as intentional agents
  | "history_reification";        // History, progress as agents

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
 * - info  → only anthropomorphic_self
 * - warn  → anthropomorphic_model, cosmic_purpose, reification types
 * - block → reserved for future (e.g., very high-risk patterns)
 */
export function computeSeverity(reasons: HonestraReason[]): HonestraSeverity {
  if (!reasons || reasons.length === 0) {
    return "none";
  }

  const hasModel = reasons.includes("anthropomorphic_model");
  const hasCosmic = reasons.includes("cosmic_purpose");
  const hasSelf = reasons.includes("anthropomorphic_self");
  
  // New reification categories
  const hasCollective = reasons.includes("collective_reification");
  const hasInstitutional = reasons.includes("institutional_reification");
  const hasNature = reasons.includes("nature_reification");
  const hasHistory = reasons.includes("history_reification");
  const hasReification = hasCollective || hasInstitutional || hasNature || hasHistory;

  // Reification and cosmic/model patterns are "warn" level
  if (hasModel || hasCosmic || hasReification) {
    return "warn";
  }

  if (hasSelf) {
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

