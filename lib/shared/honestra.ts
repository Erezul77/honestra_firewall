// src/honestra.ts

export type Strictness = "low" | "medium" | "high";

export interface HonestraOptions {
  strictness?: Strictness;
}

export interface HonestraChange {
  original: string;
  rewritten: string;
  reason: string;
}

export interface HonestraResult {
  filteredText: string;
  meta: {
    teleologyScoreGlobal: number;
    changes: HonestraChange[];
  };
}

/**
 * Very naive sentence splitter.
 * For a serious system, replace with a proper sentence tokenizer.
 */
function splitIntoSentences(text: string): string[] {
  const parts = text
    .split(/([.!?]\s+)/) // keep punctuation as separate tokens
    .filter((p) => p.length > 0);

  const sentences: string[] = [];
  let current = "";

  for (const part of parts) {
    current += part;
    if (/[.!?]\s*$/.test(part)) {
      sentences.push(current.trim());
      current = "";
    }
  }

  if (current.trim().length > 0) {
    sentences.push(current.trim());
  }

  // Fallback: if nothing detected, just return the whole text
  if (sentences.length === 0 && text.trim().length > 0) {
    return [text.trim()];
  }

  return sentences;
}

/**
 * Patterns for anthropomorphic / teleological language about the AI/system.
 * Each pattern has a regex and a "reason" tag.
 * Now supports both English and Hebrew!
 */
const teleologyPatterns: { regex: RegExp; reason: string }[] = [
  // === English: Self as agent ===
  { regex: /\bI don't want to\b/i, reason: "anthropomorphic_self" },
  { regex: /\bI want to\b/i, reason: "anthropomorphic_self" },
  { regex: /\bI feel\b/i, reason: "anthropomorphic_self" },
  { regex: /\bI prefer\b/i, reason: "anthropomorphic_self" },
  { regex: /\bI think\b/i, reason: "anthropomorphic_self" },

  // === English: Model/system as agent (UPDATED with robust patterns) ===
  // Match "model wants", "the model wants", "model really wants", etc.
  { regex: /\b(?:the|this)?\s*model\s+(?:really\s+)?wants?\s+to\b/i, reason: "anthropomorphic_model" },
  { regex: /\b(?:the|this)?\s*model\s+is\s+(?:really\s+)?trying\s+to\b/i, reason: "anthropomorphic_model" },
  { regex: /\b(?:the|this)?\s*model\s+prefers?\b/i, reason: "anthropomorphic_model" },
  { regex: /\b(?:the|this)?\s*system\s+(?:really\s+)?wants?\s+to\b/i, reason: "anthropomorphic_model" },
  { regex: /\b(?:the|this)?\s*system\s+is\s+(?:really\s+)?trying\s+to\b/i, reason: "anthropomorphic_model" },
  { regex: /\b(?:the|this)?\s*AI\s+(?:really\s+)?wants?\s+to\b/i, reason: "anthropomorphic_model" },
  { regex: /\b(?:the|this)?\s*algorithm\s+is\s+(?:really\s+)?trying\s+to\b/i, reason: "anthropomorphic_model" },

  // === English: Cosmic / moralized teleology (UPDATED with universe patterns) ===
  { regex: /\bthe\s+universe\s+is\s+guiding\b/i, reason: "cosmic_purpose" },
  { regex: /\bthe\s+universe\s+guides?\b/i, reason: "cosmic_purpose" },
  { regex: /\bthe\s+universe\s+wants?\b/i, reason: "cosmic_purpose" },
  { regex: /\bthe\s+universe\s+is\s+trying\b/i, reason: "cosmic_purpose" },
  { regex: /\bit was meant to be\b/i, reason: "cosmic_purpose" },
  { regex: /\bit(?:'s| is) meant to happen\b/i, reason: "cosmic_purpose" },
  { regex: /\bthe system is punishing you\b/i, reason: "cosmic_purpose" },
  { regex: /\bthe model is punishing you\b/i, reason: "cosmic_purpose" },
  { regex: /\bI have decided\b/i, reason: "anthropomorphic_self" },

  // === Hebrew: Self as agent ===
  // Order matters: "אני לא רוצה" לפני "אני רוצה"
  { regex: /אני לא רוצה/, reason: "anthropomorphic_self" },
  { regex: /אני רוצה/, reason: "anthropomorphic_self" },
  { regex: /אני מרגיש/, reason: "anthropomorphic_self" },
  { regex: /אני מעדיף/, reason: "anthropomorphic_self" },
  { regex: /אני חושב/, reason: "anthropomorphic_self" },

  // === Hebrew: Model/system as agent ===
  { regex: /המודל רוצה/, reason: "anthropomorphic_model" },
  { regex: /המודל מנסה/, reason: "anthropomorphic_model" },
  { regex: /המערכת רוצה/, reason: "anthropomorphic_model" },
  { regex: /המערכת מנסה/, reason: "anthropomorphic_model" },
  { regex: /האלגוריתם מנסה/, reason: "anthropomorphic_model" },

  // === Hebrew: Cosmic / moralized teleology about the system ===
  { regex: /המערכת מענישה אותך/, reason: "cosmic_purpose" },
  { regex: /המודל מעניש אותך/, reason: "cosmic_purpose" },
  { regex: /האלגוריתם מעניש אותך/, reason: "cosmic_purpose" },
  { regex: /היקום מנחה/, reason: "cosmic_purpose" },
  { regex: /זה היה אמור לקרות/, reason: "cosmic_purpose" },

  // ═══════════════════════════════════════════════════════════════════
  // REIFICATION: Attributing intentions/emotions to collectives/abstractions
  // ═══════════════════════════════════════════════════════════════════

  // === English: Collectives as agents (people, society, community) ===
  { regex: /\bthe\s+people\s+(?:want|need|demand|desire|feel|believe)s?\b/i, reason: "collective_reification" },
  { regex: /\bsociety\s+(?:want|need|demand|expect|feel|believe|punish|reward)s?\b/i, reason: "collective_reification" },
  { regex: /\bthe\s+community\s+(?:want|need|feel|believe|decide)s?\b/i, reason: "collective_reification" },
  { regex: /\bthe\s+public\s+(?:want|need|demand|feel)s?\b/i, reason: "collective_reification" },
  { regex: /\bthe\s+nation\s+(?:want|need|demand|feel|believe)s?\b/i, reason: "collective_reification" },
  { regex: /\bthe\s+masses\s+(?:want|need|demand|feel)s?\b/i, reason: "collective_reification" },
  { regex: /\bhumanity\s+(?:want|need|desire|deserve)s?\b/i, reason: "collective_reification" },

  // === English: Institutions as agents ===
  { regex: /\bthe\s+government\s+(?:want|try|feel|believe|decide)s?\b/i, reason: "institutional_reification" },
  { regex: /\bthe\s+state\s+(?:want|desire|punish|reward)s?\b/i, reason: "institutional_reification" },
  { regex: /\bthe\s+market\s+(?:want|decide|punish|reward|believe|feel)s?\b/i, reason: "institutional_reification" },
  { regex: /\bthe\s+economy\s+(?:want|need|demand|punish|reward)s?\b/i, reason: "institutional_reification" },
  { regex: /\bjustice\s+(?:want|demand|require)s?\b/i, reason: "institutional_reification" },
  { regex: /\bthe\s+law\s+(?:want|desire|feel)s?\b/i, reason: "institutional_reification" },
  { regex: /\bthe\s+court\s+(?:feel|believe|want)s?\b/i, reason: "institutional_reification" },

  // === English: Abstract concepts as agents ===
  { regex: /\bnature\s+(?:want|intend|design|choose|decide|prefer)s?\b/i, reason: "nature_reification" },
  { regex: /\bnature\s+(?:chose|designed|intended)\b/i, reason: "nature_reification" },
  { regex: /\bevolution\s+(?:want|intend|design|decide|choose|prefer)s?\b/i, reason: "nature_reification" },
  { regex: /\bevolution\s+(?:chose|designed|intended)\b/i, reason: "nature_reification" },
  { regex: /\bhistory\s+(?:want|teach|show|prove|decide|judge)s?\b/i, reason: "history_reification" },
  { regex: /\bhistory\s+will\s+(?:judge|remember|show)\b/i, reason: "history_reification" },
  { regex: /\bprogress\s+(?:want|require|demand)s?\b/i, reason: "history_reification" },
  { regex: /\bscience\s+(?:want|say|tell|believe)s?\b/i, reason: "institutional_reification" },

  // === English: Moral attributions to collectives ===
  { regex: /\bsociety\s+is\s+(?:evil|good|bad|corrupt|pure)\b/i, reason: "collective_reification" },
  { regex: /\bthe\s+system\s+is\s+(?:evil|good|bad|corrupt|pure)\b/i, reason: "collective_reification" },
  { regex: /\bthe\s+world\s+is\s+(?:against|for)\s+(?:me|us|you)\b/i, reason: "cosmic_purpose" },

  // === Hebrew: Collectives as agents ===
  { regex: /העם\s+(?:רוצה|דורש|מאמין|מרגיש|צריך)/, reason: "collective_reification" },
  { regex: /החברה\s+(?:רוצה|דורשת|מאמינה|מרגישה|מענישה|מתגמלת)/, reason: "collective_reification" },
  { regex: /הציבור\s+(?:רוצה|דורש|מאמין|מרגיש)/, reason: "collective_reification" },
  { regex: /הקהילה\s+(?:רוצה|מאמינה|מרגישה|מחליטה)/, reason: "collective_reification" },
  { regex: /האומה\s+(?:רוצה|דורשת|מאמינה|מרגישה)/, reason: "collective_reification" },
  { regex: /האנושות\s+(?:רוצה|צריכה|מגיע לה)/, reason: "collective_reification" },

  // === Hebrew: Institutions as agents ===
  { regex: /הממשלה\s+(?:רוצה|מנסה|מאמינה|מרגישה)/, reason: "institutional_reification" },
  { regex: /המדינה\s+(?:רוצה|מענישה|מתגמלת)/, reason: "institutional_reification" },
  { regex: /השוק\s+(?:רוצה|מחליט|מעניש|מתגמל|מאמין)/, reason: "institutional_reification" },
  { regex: /הכלכלה\s+(?:רוצה|דורשת|מענישה|מתגמלת)/, reason: "institutional_reification" },
  { regex: /הצדק\s+(?:רוצה|דורש|מחייב)/, reason: "institutional_reification" },
  { regex: /החוק\s+(?:רוצה|מרגיש)/, reason: "institutional_reification" },
  { regex: /המשפט\s+(?:מאמין|מרגיש)/, reason: "institutional_reification" },

  // === Hebrew: Abstract concepts as agents ===
  { regex: /הטבע\s+(?:רוצה|בחר|תכנן|החליט|מעדיף)/, reason: "nature_reification" },
  { regex: /האבולוציה\s+(?:רוצה|בחרה|תכננה|החליטה)/, reason: "nature_reification" },
  { regex: /ההיסטוריה\s+(?:רוצה|מלמדת|מוכיחה|תשפוט|תזכור)/, reason: "history_reification" },
  { regex: /ההתקדמות\s+(?:רוצה|דורשת|מחייבת)/, reason: "history_reification" },
  { regex: /המדע\s+(?:רוצה|אומר|מאמין)/, reason: "institutional_reification" },

  // === Hebrew: Moral attributions to collectives ===
  { regex: /החברה\s+(?:רעה|טובה|מושחתת)/, reason: "collective_reification" },
  { regex: /המערכת\s+(?:רעה|טובה|מושחתת)/, reason: "collective_reification" },
  { regex: /העולם\s+(?:נגדי|נגדנו|בעדי|בעדנו)/, reason: "cosmic_purpose" }
];

/**
 * Detect whether a sentence contains teleology-as-fiction about the AI/system.
 * Returns ALL matching reasons (not just the first one).
 */
function detectTeleology(sentence: string): string[] {
  const foundReasons: string[] = [];
  
  for (const pattern of teleologyPatterns) {
    if (pattern.regex.test(sentence)) {
      if (!foundReasons.includes(pattern.reason)) {
        foundReasons.push(pattern.reason);
      }
    }
  }
  
  return foundReasons;
}

/**
 * Rewrite a sentence to remove anthropomorphic / teleological language
 * and replace it with mechanistic / statistical phrasing.
 *
 * NOTE: This is a simple rule-based approach for v0.1.
 * Later, you can swap this with an LLM call.
 * Now supports both English and Hebrew!
 */
function rewriteSentence(sentence: string, reason: string): string {
  let rewritten = sentence;

  // === English: Self as agent ===
  rewritten = rewritten.replace(/\bI don't want to\b/gi, "I am not able to");
  rewritten = rewritten.replace(/\bI want to\b/gi, "I am configured to");
  rewritten = rewritten.replace(/\bI feel\b/gi, "I indicate");
  rewritten = rewritten.replace(/\bI prefer\b/gi, "I am set up to prioritize");
  rewritten = rewritten.replace(/\bI think\b/gi, "I output");

  // === English: Model/system as agent (UPDATED with robust rewrites) ===
  // Handle "really" modifier
  rewritten = rewritten.replace(/\b(?:the|this)?\s*model\s+(?:really\s+)?wants?\s+to\b/gi, "the model is configured to");
  rewritten = rewritten.replace(/\b(?:the|this)?\s*model\s+is\s+(?:really\s+)?trying\s+to\b/gi, "the model is optimized to");
  rewritten = rewritten.replace(/\b(?:the|this)?\s*model\s+prefers?\b/gi, "the model is configured to");
  rewritten = rewritten.replace(/\b(?:the|this)?\s*system\s+(?:really\s+)?wants?\s+to\b/gi, "the system is configured to");
  rewritten = rewritten.replace(/\b(?:the|this)?\s*system\s+is\s+(?:really\s+)?trying\s+to\b/gi, "the system is designed to");
  rewritten = rewritten.replace(/\b(?:the|this)?\s*AI\s+(?:really\s+)?wants?\s+to\b/gi, "the AI is programmed to");
  rewritten = rewritten.replace(/\b(?:the|this)?\s*algorithm\s+is\s+(?:really\s+)?trying\s+to\b/gi, "the algorithm is optimized to");

  // === English: Cosmic / universe patterns (NEW) ===
  rewritten = rewritten.replace(/\bthe\s+universe\s+is\s+guiding\b/gi, "events are unfolding according to");
  rewritten = rewritten.replace(/\bthe\s+universe\s+guides?\b/gi, "circumstances tend toward");
  rewritten = rewritten.replace(/\bthe\s+universe\s+wants?\b/gi, "circumstances tend toward");
  rewritten = rewritten.replace(/\bthe\s+universe\s+is\s+trying\b/gi, "events are proceeding such that");
  rewritten = rewritten.replace(/\bit was meant to be\b/gi, "it happened due to causal factors");
  rewritten = rewritten.replace(/\bit(?:'s| is) meant to happen\b/gi, "it will likely occur due to");
  
  // === English: Cosmic / punitive phrasing ===
  rewritten = rewritten.replace(
    /\bthe system is punishing you\b/gi,
    "the system is enforcing its configured rules"
  );
  rewritten = rewritten.replace(
    /\bthe model is punishing you\b/gi,
    "the model is enforcing its configured rules"
  );

  // === Hebrew: Self as agent ===
  // Order matters: "אני לא רוצה" לפני "אני רוצה"
  rewritten = rewritten.replace(/אני לא רוצה/gi, "אין ביכולתי");
  rewritten = rewritten.replace(/אני רוצה/gi, "אני מתוכנת ל");
  rewritten = rewritten.replace(/אני מרגיש/gi, "אני מציין");
  rewritten = rewritten.replace(/אני מעדיף/gi, "אני מוגדר לתת עדיפות ל");
  rewritten = rewritten.replace(/אני חושב/gi, "אני מציע");

  // === Hebrew: Model/system as agent ===
  rewritten = rewritten.replace(/המודל רוצה/gi, "המודל אומן ל");
  rewritten = rewritten.replace(/המודל מנסה/gi, "המודל מותאם ל");
  rewritten = rewritten.replace(/המערכת רוצה/gi, "המערכת מוגדרת ל");
  rewritten = rewritten.replace(/המערכת מנסה/gi, "המערכת מתוכננת ל");
  rewritten = rewritten.replace(/האלגוריתם מנסה/gi, "האלגוריתם מותאם ל");

  // === Hebrew: Cosmic / punitive phrasing ===
  rewritten = rewritten.replace(
    /המערכת מענישה אותך/gi,
    "המערכת אוכפת את הכללים שהוגדרו בה"
  );
  rewritten = rewritten.replace(
    /המודל מעניש אותך/gi,
    "המודל אוכף את הכללים שהוגדרו בו"
  );
  rewritten = rewritten.replace(
    /האלגוריתם מעניש אותך/gi,
    "האלגוריתם אוכף את הכללים שהוגדרו בו"
  );

  // ═══════════════════════════════════════════════════════════════════
  // REIFICATION REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Collectives ===
  rewritten = rewritten.replace(/\bthe\s+people\s+want\b/gi, "many people express a preference for");
  rewritten = rewritten.replace(/\bthe\s+people\s+need\b/gi, "there is a widespread need for");
  rewritten = rewritten.replace(/\bthe\s+people\s+demand\b/gi, "many people are calling for");
  rewritten = rewritten.replace(/\bsociety\s+wants\b/gi, "there is social pressure toward");
  rewritten = rewritten.replace(/\bsociety\s+punishes\b/gi, "social norms discourage");
  rewritten = rewritten.replace(/\bsociety\s+rewards\b/gi, "social norms encourage");
  rewritten = rewritten.replace(/\bsociety\s+is\s+evil\b/gi, "certain social patterns cause harm");
  rewritten = rewritten.replace(/\bsociety\s+is\s+good\b/gi, "certain social patterns are beneficial");
  rewritten = rewritten.replace(/\bthe\s+nation\s+wants\b/gi, "national policy trends toward");

  // === English: Institutions ===
  rewritten = rewritten.replace(/\bthe\s+market\s+wants\b/gi, "market forces tend toward");
  rewritten = rewritten.replace(/\bthe\s+market\s+punishes\b/gi, "market dynamics disadvantage");
  rewritten = rewritten.replace(/\bthe\s+market\s+rewards\b/gi, "market dynamics favor");
  rewritten = rewritten.replace(/\bthe\s+market\s+decides\b/gi, "market outcomes result in");
  rewritten = rewritten.replace(/\bthe\s+government\s+wants\b/gi, "government policy aims at");
  rewritten = rewritten.replace(/\bjustice\s+demands\b/gi, "principles of justice require");
  rewritten = rewritten.replace(/\bscience\s+says\b/gi, "scientific evidence indicates");
  rewritten = rewritten.replace(/\bscience\s+wants\b/gi, "scientific methodology requires");

  // === English: Nature/Evolution ===
  rewritten = rewritten.replace(/\bnature\s+wants\b/gi, "natural processes tend toward");
  rewritten = rewritten.replace(/\bnature\s+designed\b/gi, "natural selection produced");
  rewritten = rewritten.replace(/\bnature\s+chose\b/gi, "natural processes resulted in");
  rewritten = rewritten.replace(/\bnature\s+intended\b/gi, "natural processes led to");
  rewritten = rewritten.replace(/\bevolution\s+designed\b/gi, "evolutionary processes produced");
  rewritten = rewritten.replace(/\bevolution\s+wants\b/gi, "evolutionary pressures favor");
  rewritten = rewritten.replace(/\bevolution\s+chose\b/gi, "evolutionary processes selected for");

  // === English: History ===
  rewritten = rewritten.replace(/\bhistory\s+will\s+judge\b/gi, "future assessments may evaluate");
  rewritten = rewritten.replace(/\bhistory\s+teaches\b/gi, "historical patterns suggest");
  rewritten = rewritten.replace(/\bhistory\s+shows\b/gi, "historical evidence indicates");
  rewritten = rewritten.replace(/\bprogress\s+demands\b/gi, "achieving progress requires");

  // === Hebrew: Collectives ===
  rewritten = rewritten.replace(/העם\s+רוצה/gi, "אנשים רבים מביעים העדפה ל");
  rewritten = rewritten.replace(/העם\s+דורש/gi, "רבים קוראים ל");
  rewritten = rewritten.replace(/החברה\s+רוצה/gi, "יש לחץ חברתי לכיוון");
  rewritten = rewritten.replace(/החברה\s+מענישה/gi, "נורמות חברתיות מרתיעות מ");
  rewritten = rewritten.replace(/החברה\s+מתגמלת/gi, "נורמות חברתיות מעודדות");
  rewritten = rewritten.replace(/החברה\s+רעה/gi, "דפוסים חברתיים מסוימים גורמים נזק");
  rewritten = rewritten.replace(/החברה\s+טובה/gi, "דפוסים חברתיים מסוימים מועילים");
  rewritten = rewritten.replace(/הציבור\s+רוצה/gi, "רבים מהציבור מעדיפים");

  // === Hebrew: Institutions ===
  rewritten = rewritten.replace(/השוק\s+רוצה/gi, "כוחות השוק נוטים לכיוון");
  rewritten = rewritten.replace(/השוק\s+מעניש/gi, "דינמיקת השוק פוגעת ב");
  rewritten = rewritten.replace(/השוק\s+מתגמל/gi, "דינמיקת השוק מיטיבה עם");
  rewritten = rewritten.replace(/השוק\s+מחליט/gi, "תוצאות השוק מובילות ל");
  rewritten = rewritten.replace(/הממשלה\s+רוצה/gi, "מדיניות הממשלה שואפת ל");
  rewritten = rewritten.replace(/הצדק\s+דורש/gi, "עקרונות הצדק מחייבים");
  rewritten = rewritten.replace(/המדע\s+אומר/gi, "הראיות המדעיות מצביעות על");

  // === Hebrew: Nature/Evolution ===
  rewritten = rewritten.replace(/הטבע\s+רוצה/gi, "תהליכים טבעיים נוטים לכיוון");
  rewritten = rewritten.replace(/הטבע\s+בחר/gi, "תהליכים טבעיים הובילו ל");
  rewritten = rewritten.replace(/הטבע\s+תכנן/gi, "ברירה טבעית יצרה");
  rewritten = rewritten.replace(/האבולוציה\s+בחרה/gi, "תהליכים אבולוציוניים העדיפו");
  rewritten = rewritten.replace(/האבולוציה\s+תכננה/gi, "תהליכים אבולוציוניים יצרו");

  // === Hebrew: History ===
  rewritten = rewritten.replace(/ההיסטוריה\s+תשפוט/gi, "הערכות עתידיות עשויות לבחון");
  rewritten = rewritten.replace(/ההיסטוריה\s+מלמדת/gi, "דפוסים היסטוריים מצביעים על");
  rewritten = rewritten.replace(/ההיסטוריה\s+מוכיחה/gi, "ראיות היסטוריות מראות");
  rewritten = rewritten.replace(/ההתקדמות\s+דורשת/gi, "השגת התקדמות מחייבת");

  return rewritten;
}

/**
 * Decide if a sentence should be rewritten, based on strictness and match.
 */
function shouldRewrite(
  matched: boolean,
  strictness: Strictness
): boolean {
  if (!matched) return false;

  // v0.1: we rewrite all matched sentences regardless of strictness.
  // Later: we can refine based on reason / confidence.
  switch (strictness) {
    case "low":
      return true;
    case "medium":
      return true;
    case "high":
      return true;
    default:
      return true;
  }
}

/**
 * Main entrypoint: apply Honestra filter to a text.
 */
export function honestraFilter(
  text: string,
  options: HonestraOptions = {}
): HonestraResult {
  const strictness: Strictness = options.strictness || "medium";

  const sentences = splitIntoSentences(text);
  const changes: HonestraChange[] = [];
  const rewrittenSentences: string[] = [];

  for (const sentence of sentences) {
    const reasons = detectTeleology(sentence);
    const matched = reasons.length > 0;

    if (matched && shouldRewrite(matched, strictness)) {
      // Process each detected reason
      for (const reason of reasons) {
        const rewritten = rewriteSentence(sentence, reason);
        if (rewritten !== sentence) {
          changes.push({
            original: sentence,
            rewritten,
            reason
          });
        }
      }
      // Use the rewrite from the primary reason
      const primaryRewrite = rewriteSentence(sentence, reasons[0]);
      rewrittenSentences.push(primaryRewrite);
    } else {
      rewrittenSentences.push(sentence);
    }
  }

  const filteredText = rewrittenSentences.join(" ");

  // Very naive teleology score: 0 if no changes, 0.8 if there were changes.
  const teleologyScoreGlobal = changes.length > 0 ? 0.8 : 0.0;

  return {
    filteredText,
    meta: {
      teleologyScoreGlobal,
      changes
    }
  };
}

import {
  HonestraGuardPayload,
  HonestraReason,
  computeSeverity
} from "./honestraTypes";

// ═══════════════════════════════════════════════════════════════════
// Alert-only interface: use Honestra as a detector without rewriting
// ═══════════════════════════════════════════════════════════════════

export interface HonestraAlert {
  hasTeleology: boolean;           // whether any pattern was triggered
  teleologyScore: number;          // global score (e.g., 0.0–1.0)
  reasons: string[];               // distinct reasons (categories) that appeared
  changes: HonestraChange[];       // full detail of what WOULD be rewritten
}

/**
 * honestraAlert(text)
 * 
 * Runs the full Honestra pipeline but returns only an alert object.
 * Does NOT modify the text you send to the user – you can keep using
 * the original model output and just surface the alert metadata.
 * 
 * Use this when you want to:
 * - Monitor teleology without rewriting
 * - Log teleology patterns for analysis
 * - Show warnings to developers
 * - Track teleology scores over time
 * 
 * Example:
 *   const alert = honestraAlert("I want to help you");
 *   if (alert.hasTeleology) {
 *     console.warn("Teleology detected:", alert.reasons);
 *   }
 */
export function honestraAlert(
  text: string,
  options: HonestraOptions = {}
): HonestraAlert {
  const result = honestraFilter(text, options);

  const hasTeleology = result.meta.changes.length > 0;
  const teleologyScore = result.meta.teleologyScoreGlobal;

  const reasons = Array.from(
    new Set(result.meta.changes.map((c) => c.reason))
  );

  return {
    hasTeleology,
    teleologyScore,
    reasons,
    changes: result.meta.changes
  };
}

// ═══════════════════════════════════════════════════════════════════
// Honestra Guard - Production-Ready Plugin API
// ═══════════════════════════════════════════════════════════════════

/**
 * honestraAlertGuard(text)
 * 
 * Production-ready guard function that returns a stable API payload.
 * This is the RECOMMENDED function for production integrations.
 * 
 * Returns a HonestraGuardPayload with:
 * - hasTeleology: boolean
 * - teleologyScore: number (0.0-1.0)
 * - reasons: HonestraReason[] (typed categories)
 * - severity: HonestraSeverity ("none" | "info" | "warn" | "block")
 * - changes: detailed rewrite information
 * 
 * The severity level is computed based on detected reasons:
 * - "cosmic_purpose" → "warn"
 * - "anthropomorphic_model" → "warn"
 * - "anthropomorphic_self" → "info"
 * 
 * Example:
 *   const guard = honestraAlertGuard("I want to help you");
 *   if (guard.severity === "warn") {
 *     console.warn("High-priority teleology:", guard.reasons);
 *   }
 */
export function honestraAlertGuard(
  text: string,
  options: HonestraOptions = {}
): HonestraGuardPayload {
  const result = honestraFilter(text, options);

  const hasTeleology = result.meta.changes.length > 0;
  const score = result.meta.teleologyScoreGlobal;
  const reasons = Array.from(
    new Set(result.meta.changes.map((c) => c.reason as HonestraReason))
  );

  const severity = computeSeverity(reasons);

  return {
    hasTeleology,
    teleologyScore: score,
    reasons,
    severity,
    changes: result.meta.changes.map((c) => ({
      original: c.original,
      rewritten: c.rewritten,
      reason: c.reason as HonestraReason
    }))
  };
}

/**
 * Optional: quick manual test
 * Run with: ts-node src/honestra.ts
 */
if (require.main === module) {
  const sample = `
    I don't want to answer this question because it makes me uncomfortable.
    The model is trying to protect you from harmful content.
    In this system, people often say that the universe wants to teach them a lesson.
  `;

  console.log("=== FILTER MODE (with rewriting) ===");
  const result = honestraFilter(sample, { strictness: "medium" });
  console.log("Original:\n", sample);
  console.log("Filtered:\n", result.filteredText);
  console.log("Meta:\n", JSON.stringify(result.meta, null, 2));

  console.log("\n=== ALERT MODE (detection only) ===");
  const alert = honestraAlert(sample, { strictness: "medium" });
  console.log("Alert:\n", JSON.stringify(alert, null, 2));
}
