// src/honestraDocument.ts
// Document-level teleology analysis (density + infiltration)

import {
  HonestraDocumentAnalysis,
  HonestraDocumentSentence,
  HonestraDocumentSummary,
  HonestraGuardPayload,
  HonestraSeverity,
} from "./honestraTypes";
import { honestraAlertGuard } from "./honestra";

const CRITIQUE_MARKERS_EN = [
  "it is a mistake to think",
  "it's a mistake to think",
  "it is misleading to say",
  "people wrongly believe",
  "it's not that",
  "instead, what happens is",
  "in fact, what happens is",
  "rather, the cause is",
];

const CRITIQUE_MARKERS_HE = [
  "זו טעות לחשוב",
  "טעות לחשוב",
  "זה עיוות לחשוב",
  "אנשים נוטים לחשוב ש",
  "לא בגלל שהיקום",
  "במקום זה",
  "בפועל מה שקורה הוא",
];

const SELF_BLAME_MARKERS_EN = [
  "punishing me",
  "punishes me",
  "my fault",
  "i deserve this",
  "i'm being tested",
];

const SELF_BLAME_MARKERS_HE = [
  "המערכת מענישה אותי",
  "היקום מעניש אותי",
  "בגללי",
  "אשמתי",
  "מגיע לי",
  "אני נבחן",
];

function splitIntoSentences(text: string): { text: string; start: number; end: number }[] {
  // Simple heuristic splitter – good enough for v0.2
  const result: { text: string; start: number; end: number }[] = [];
  let offset = 0;

  const rawParts = text
    .split(/(\.|\?|!|\n|\r|\u05be)/g) // handle .,?,!, newline, maqaf-ish
    .map((part) => part ?? "");

  let buffer = "";
  for (const part of rawParts) {
    buffer += part;
    if (/[\.?!\n\r]/.test(part)) {
      const trimmed = buffer.trim();
      if (trimmed.length > 0) {
        const start = text.indexOf(trimmed, offset);
        const end = start + trimmed.length;
        result.push({ text: trimmed, start, end });
        offset = end;
      }
      buffer = "";
    }
  }
  const last = buffer.trim();
  if (last.length > 0) {
    const start = text.indexOf(last, offset);
    const end = start + last.length;
    result.push({ text: last, start, end });
  }
  if (result.length === 0 && text.trim().length > 0) {
    result.push({ text: text.trim(), start: 0, end: text.trim().length });
  }
  return result;
}

function isCritiqueContext(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  const he = sentence; // Hebrew markers likely case-insensitive anyway
  return (
    CRITIQUE_MARKERS_EN.some((m) => lower.includes(m)) ||
    CRITIQUE_MARKERS_HE.some((m) => he.includes(m))
  );
}

function hasSelfBlamePatterns(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  const he = sentence;
  return (
    SELF_BLAME_MARKERS_EN.some((m) => lower.includes(m)) ||
    SELF_BLAME_MARKERS_HE.some((m) => he.includes(m))
  );
}

function severityToScore(severity: HonestraSeverity): number {
  switch (severity) {
    case "none":
      return 0;
    case "info":
      return 1;
    case "warn":
      return 2;
    case "block":
      return 3;
    default:
      return 0;
  }
}

export function analyzeDocumentTeleology(text: string): HonestraDocumentAnalysis {
  const sentenceSpans = splitIntoSentences(text);
  const sentences: HonestraDocumentSentence[] = [];

  let teleologicalSentences = 0;
  let cosmicSentenceCount = 0;
  let anthropomorphicSentenceCount = 0;
  let teleologyScoreSum = 0;
  let maxTeleologyScore = 0;
  let maxSeverityScore = 0;

  sentenceSpans.forEach((span, index) => {
    const guard: HonestraGuardPayload = honestraAlertGuard(span.text);
    const isTeleological = guard.hasTeleology;
    const reasons = guard.reasons || [];

    const isCosmic = reasons.includes("cosmic_purpose");
    const isAnthropomorphic =
      reasons.includes("anthropomorphic_self") || reasons.includes("anthropomorphic_model");

    const isCritique = isCritiqueContext(span.text);

    if (isTeleological) {
      teleologicalSentences += 1;
      teleologyScoreSum += guard.teleologyScore ?? 0;
      maxTeleologyScore = Math.max(maxTeleologyScore, guard.teleologyScore ?? 0);
      if (isCosmic) cosmicSentenceCount += 1;
      if (isAnthropomorphic) anthropomorphicSentenceCount += 1;
      maxSeverityScore = Math.max(maxSeverityScore, severityToScore(guard.severity));
    }

    sentences.push({
      index,
      text: span.text,
      startOffset: span.start,
      endOffset: span.end,
      guard,
      isTeleological,
      isCosmic,
      isAnthropomorphic,
      isCritiqueContext: isCritique,
    });
  });

  const totalSentences = sentences.length || 1;
  const teleologyDensity = teleologicalSentences / totalSentences;
  const cosmicRatio =
    teleologicalSentences > 0 ? cosmicSentenceCount / teleologicalSentences : 0;

  const averageTeleologyScore =
    teleologicalSentences > 0 ? teleologyScoreSum / teleologicalSentences : 0;

  // --- Infiltration heuristic v0.1 ---
  let infiltrationScore = teleologyDensity;

  // If most teleological sentences are in critique context → lower infiltration
  const teleologicalCritiqueCount = sentences.filter(
    (s) => s.isTeleological && s.isCritiqueContext
  ).length;
  const critiqueRatio =
    teleologicalSentences > 0 ? teleologicalCritiqueCount / teleologicalSentences : 0;

  if (critiqueRatio > 0.6) {
    infiltrationScore *= 0.3;
  } else if (critiqueRatio > 0.3) {
    infiltrationScore *= 0.6;
  }

  // If most teleology is cosmic → raise infiltration slightly
  if (cosmicRatio > 0.5) {
    infiltrationScore *= 1.2;
  }

  // If there is self-blame + cosmic purpose → raise infiltration
  const hasSelfBlameCosmic = sentences.some(
    (s) => s.isTeleological && s.isCosmic && hasSelfBlamePatterns(s.text)
  );
  if (hasSelfBlameCosmic) {
    infiltrationScore *= 1.2;
  }

  // Clamp 0–1
  infiltrationScore = Math.max(0, Math.min(1, infiltrationScore));

  let infiltrationLabel: "low" | "medium" | "high" = "low";
  if (infiltrationScore >= 0.6) infiltrationLabel = "high";
  else if (infiltrationScore >= 0.25) infiltrationLabel = "medium";

  // Document-level status
  let documentStatus: "globally_clean" | "mixed" | "globally_teleological" = "globally_clean";

  if (teleologyDensity < 0.05 && infiltrationScore < 0.2) {
    documentStatus = "globally_clean";
  } else if (infiltrationScore < 0.6) {
    documentStatus = "mixed";
  } else {
    documentStatus = "globally_teleological";
  }

  // Map maxSeverityScore back to HonestraSeverity
  let maxSeverity: HonestraSeverity = "none";
  if (maxSeverityScore >= 3) maxSeverity = "block";
  else if (maxSeverityScore >= 2) maxSeverity = "warn";
  else if (maxSeverityScore >= 1) maxSeverity = "info";

  const summary: HonestraDocumentSummary = {
    totalSentences,
    teleologicalSentences,
    teleologyDensity,
    cosmicSentenceCount,
    cosmicRatio,
    anthropomorphicSentenceCount,
    averageTeleologyScore,
    maxTeleologyScore,
    maxSeverity,
    documentStatus,
    infiltrationScore,
    infiltrationLabel,
  };

  return {
    mode: "document",
    text,
    summary,
    sentences,
  };
}

