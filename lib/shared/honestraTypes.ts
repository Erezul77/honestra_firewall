// src/honestraTypes.ts

export type HonestraReason =
  | "anthropomorphic_self"
  | "anthropomorphic_model"
  | "cosmic_purpose";

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
 * - warn  → any anthropomorphic_model or cosmic_purpose
 * - block → reserved for future (e.g., very high-risk patterns)
 */
export function computeSeverity(reasons: HonestraReason[]): HonestraSeverity {
  if (!reasons || reasons.length === 0) {
    return "none";
  }

  const hasModel = reasons.includes("anthropomorphic_model");
  const hasCosmic = reasons.includes("cosmic_purpose");
  const hasSelf = reasons.includes("anthropomorphic_self");

  if (hasModel || hasCosmic) {
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

