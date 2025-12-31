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
  { regex: /העולם\s+(?:נגדי|נגדנו|בעדי|בעדנו)/, reason: "cosmic_purpose" },

  // ═══════════════════════════════════════════════════════════════════
  // JUST WORLD FALLACY: Belief that the world rewards good and punishes bad
  // ═══════════════════════════════════════════════════════════════════

  // === English: Just World ===
  { regex: /\b(?:he|she|they)\s+(?:got|gets)\s+what\s+(?:he|she|they)\s+deserve[ds]?\b/i, reason: "just_world" },
  { regex: /\b(?:you|we|I)\s+(?:got|get)\s+what\s+(?:you|we|I)\s+deserve[ds]?\b/i, reason: "just_world" },
  { regex: /\bdeserve[ds]?\s+(?:what|this|that|it)\b/i, reason: "just_world" },
  { regex: /\b(?:good|bad)\s+things\s+happen\s+to\s+(?:good|bad)\s+people\b/i, reason: "just_world" },
  { regex: /\bkarma\s+(?:will|is going to)\b/i, reason: "just_world" },
  { regex: /\bit(?:'s| is)\s+(?:only\s+)?fair\s+that\b/i, reason: "just_world" },
  { regex: /\bhad\s+it\s+coming\b/i, reason: "just_world" },
  { regex: /\breap\s+what\s+(?:you|they|we)\s+sow\b/i, reason: "just_world" },

  // === Hebrew: Just World ===
  { regex: /מגיע\s+(?:לו|לה|להם|לך|לי)/, reason: "just_world" },
  { regex: /קיבל\s+(?:את\s+)?מה\s+שמגיע/, reason: "just_world" },
  { regex: /ראוי\s+ל(?:עונש|גמול|שכר)/, reason: "just_world" },
  { regex: /צדק\s+(?:נעשה|התקיים)/, reason: "just_world" },
  { regex: /קארמה/, reason: "just_world" },

  // ═══════════════════════════════════════════════════════════════════
  // BODY TELEOLOGY: Attributing knowledge/intention to the body
  // ═══════════════════════════════════════════════════════════════════

  // === English: Body Teleology ===
  { regex: /\byour\s+body\s+(?:knows?|wants?|needs?|is\s+telling|is\s+trying)\b/i, reason: "body_teleology" },
  { regex: /\bthe\s+body\s+(?:knows?|wants?|needs?|remembers?)\b/i, reason: "body_teleology" },
  { regex: /\blisten\s+to\s+your\s+body\b/i, reason: "body_teleology" },
  { regex: /\byour\s+body\s+is\s+(?:wise|smart|intelligent)\b/i, reason: "body_teleology" },
  { regex: /\byour\s+(?:gut|intuition)\s+(?:knows?|tells?|says?)\b/i, reason: "body_teleology" },
  { regex: /\byour\s+(?:heart|soul)\s+(?:knows?|wants?|tells?)\b/i, reason: "body_teleology" },
  { regex: /\binnate\s+(?:wisdom|knowledge|intelligence)\b/i, reason: "body_teleology" },

  // === Hebrew: Body Teleology ===
  { regex: /הגוף\s+(?:יודע|רוצה|צריך|מנסה|זוכר)/, reason: "body_teleology" },
  { regex: /תקשיב\s+לגוף/, reason: "body_teleology" },
  { regex: /הגוף\s+(?:חכם|אינטליגנטי)/, reason: "body_teleology" },
  { regex: /(?:הבטן|האינטואיציה)\s+(?:יודעת|אומרת)/, reason: "body_teleology" },
  { regex: /הלב\s+(?:יודע|רוצה|אומר)/, reason: "body_teleology" },
  { regex: /חוכמה\s+(?:פנימית|מולדת|טבעית)/, reason: "body_teleology" },

  // ═══════════════════════════════════════════════════════════════════
  // TECHNOLOGY ANIMISM: Attributing intention to non-AI technology
  // ═══════════════════════════════════════════════════════════════════

  // === English: Technology Animism ===
  { regex: /\b(?:the\s+)?computer\s+(?:hates?|loves?|wants?|refuses?|decides?)\b/i, reason: "tech_animism" },
  { regex: /\b(?:the\s+)?(?:phone|laptop|device)\s+(?:hates?|loves?|wants?|refuses?)\b/i, reason: "tech_animism" },
  { regex: /\b(?:the\s+)?(?:printer|machine)\s+(?:hates?|refuses?|won't)\b/i, reason: "tech_animism" },
  { regex: /\b(?:the\s+)?(?:app|application|software)\s+(?:wants?|refuses?|won't let)\b/i, reason: "tech_animism" },
  { regex: /\b(?:the\s+)?internet\s+(?:hates?|wants?|decides?)\b/i, reason: "tech_animism" },
  { regex: /\btechnology\s+(?:wants?|hates?|loves?)\b/i, reason: "tech_animism" },

  // === Hebrew: Technology Animism ===
  { regex: /המחשב\s+(?:שונא|אוהב|רוצה|מסרב|מחליט)/, reason: "tech_animism" },
  { regex: /הטלפון\s+(?:שונא|רוצה|מסרב)/, reason: "tech_animism" },
  { regex: /המדפסת\s+(?:שונאת|מסרבת|לא רוצה)/, reason: "tech_animism" },
  { regex: /האפליקציה\s+(?:רוצה|מסרבת|לא נותנת)/, reason: "tech_animism" },
  { regex: /האינטרנט\s+(?:שונא|רוצה|מחליט)/, reason: "tech_animism" },
  { regex: /הטכנולוגיה\s+(?:רוצה|שונאת)/, reason: "tech_animism" },

  // ═══════════════════════════════════════════════════════════════════
  // DIVINE/RELIGIOUS TELEOLOGY: Religious/spiritual purpose attribution
  // ═══════════════════════════════════════════════════════════════════

  // === English: Divine Teleology ===
  { regex: /\bgod\s+(?:wants?|wills?|intends?|has\s+a\s+plan)\b/i, reason: "divine_teleology" },
  { regex: /\bgod(?:'s|s)?\s+(?:plan|will|intention)\b/i, reason: "divine_teleology" },
  { regex: /\bthe\s+lord\s+(?:wants?|wills?)\b/i, reason: "divine_teleology" },
  { regex: /\bdivine\s+(?:plan|purpose|will|intention)\b/i, reason: "divine_teleology" },
  { regex: /\b(?:it's|this\s+is)\s+a\s+(?:test|sign)\s+from\s+(?:god|above|heaven)\b/i, reason: "divine_teleology" },
  { regex: /\bblessed\s+(?:by|with)\b/i, reason: "divine_teleology" },
  { regex: /\bcursed\s+(?:by|with)\b/i, reason: "divine_teleology" },
  { regex: /\bheaven\s+(?:wants?|wills?|sent)\b/i, reason: "divine_teleology" },
  { regex: /\bprovidence\b/i, reason: "divine_teleology" },
  { regex: /\bspiritual\s+(?:purpose|meaning|lesson)\b/i, reason: "divine_teleology" },

  // === Hebrew: Divine Teleology ===
  { regex: /אלוהים\s+(?:רוצה|מתכנן|מבחן)/, reason: "divine_teleology" },
  { regex: /(?:רצון|תוכנית)\s+(?:ה['׳]|אלוהים)/, reason: "divine_teleology" },
  { regex: /השגחה\s+(?:עליונה|פרטית|אלוהית)/, reason: "divine_teleology" },
  { regex: /מבחן\s+(?:מלמעלה|משמיים|אלוהי)/, reason: "divine_teleology" },
  { regex: /סימן\s+(?:מלמעלה|משמיים)/, reason: "divine_teleology" },
  { regex: /(?:מבורך|מקולל)\s+(?:על\s+ידי|מ)/, reason: "divine_teleology" },
  { regex: /הכל\s+(?:בהשגחה|מאת\s+ה['׳])/, reason: "divine_teleology" },
  { regex: /גזירת\s+(?:שמיים|גורל)/, reason: "divine_teleology" },

  // ═══════════════════════════════════════════════════════════════════
  // PATHETIC FALLACY: Attributing emotions to nature/weather
  // ═══════════════════════════════════════════════════════════════════

  // === English: Pathetic Fallacy ===
  { regex: /\b(?:the\s+)?(?:sky|skies)\s+(?:cry|cries|crying|weep|weeps|weeping)\b/i, reason: "pathetic_fallacy" },
  { regex: /\b(?:the\s+)?(?:sky|skies)\s+(?:is|are)\s+(?:sad|angry|happy|crying)\b/i, reason: "pathetic_fallacy" },
  { regex: /\b(?:the\s+)?(?:sun|moon)\s+(?:smiles?|smiling|frowns?|frowning)\b/i, reason: "pathetic_fallacy" },
  { regex: /\bangry\s+(?:storm|sea|ocean|clouds?|wind)\b/i, reason: "pathetic_fallacy" },
  { regex: /\b(?:the\s+)?(?:sea|ocean)\s+(?:is\s+)?(?:angry|furious|calm|peaceful)\b/i, reason: "pathetic_fallacy" },
  { regex: /\b(?:the\s+)?wind\s+(?:whispers?|howls?|screams?|sighs?)\b/i, reason: "pathetic_fallacy" },
  { regex: /\b(?:the\s+)?(?:trees?|flowers?)\s+(?:dance|dancing|sway|swaying|rejoice)\b/i, reason: "pathetic_fallacy" },
  { regex: /\bnature\s+(?:mourns?|rejoices?|celebrates?|grieves?)\b/i, reason: "pathetic_fallacy" },

  // === Hebrew: Pathetic Fallacy ===
  { regex: /השמיים\s+(?:בוכים|עצובים|כועסים|שמחים)/, reason: "pathetic_fallacy" },
  { regex: /השמש\s+(?:מחייכת|זורחת\s+בשמחה)/, reason: "pathetic_fallacy" },
  { regex: /הים\s+(?:זועם|כועס|שליו|רגוע)/, reason: "pathetic_fallacy" },
  { regex: /הרוח\s+(?:לוחשת|יללה|צורחת|נאנחת)/, reason: "pathetic_fallacy" },
  { regex: /(?:העצים|הפרחים)\s+(?:רוקדים|שמחים)/, reason: "pathetic_fallacy" },
  { regex: /הטבע\s+(?:מתאבל|שמח|חוגג)/, reason: "pathetic_fallacy" },
  { regex: /סערה\s+(?:זועמת|כועסת)/, reason: "pathetic_fallacy" },

  // ═══════════════════════════════════════════════════════════════════
  // KARMA / MORAL LUCK: Belief in automatic cosmic justice
  // ═══════════════════════════════════════════════════════════════════

  // === English: Karma ===
  { regex: /\bwhat\s+goes\s+around\s+comes\s+around\b/i, reason: "karma" },
  { regex: /\bkarma\s+(?:is|will)\b/i, reason: "karma" },
  { regex: /\b(?:good|bad)\s+karma\b/i, reason: "karma" },
  { regex: /\bit\s+will\s+come\s+back\s+to\s+(?:you|them|him|her)\b/i, reason: "karma" },
  { regex: /\b(?:you|they)\s+will\s+pay\s+for\s+(?:this|that|it)\b/i, reason: "karma" },
  { regex: /\bthe\s+universe\s+will\s+(?:punish|reward|repay)\b/i, reason: "karma" },
  { regex: /\bpoetic\s+justice\b/i, reason: "karma" },
  { regex: /\bjust\s+desserts\b/i, reason: "karma" },

  // === Hebrew: Karma ===
  { regex: /מה\s+שהולך\s+חוזר/, reason: "karma" },
  { regex: /זה\s+יחזור\s+(?:אליו|אליה|אליך|אליהם)/, reason: "karma" },
  { regex: /(?:גמול|עונש)\s+(?:משמיים|מהיקום)/, reason: "karma" },
  { regex: /ישלם\s+על\s+(?:זה|מעשיו)/, reason: "karma" },
  { regex: /צדק\s+(?:פואטי|קוסמי)/, reason: "karma" },

  // ═══════════════════════════════════════════════════════════════════
  // CONSPIRACY PATTERNS: Attributing coordinated malicious intent to "them"
  // ═══════════════════════════════════════════════════════════════════

  // === English: Conspiracy ===
  { regex: /\bthey\s+don't\s+want\s+(?:you|us)\s+to\s+know\b/i, reason: "conspiracy" },
  { regex: /\bthey\s+(?:are\s+)?hiding\s+(?:the\s+truth|this|it)\b/i, reason: "conspiracy" },
  { regex: /\bthe\s+(?:truth|real\s+story)\s+(?:they|that)\s+(?:hide|don't\s+want)\b/i, reason: "conspiracy" },
  { regex: /\bwake\s+up\s+(?:sheeple|people)\b/i, reason: "conspiracy" },
  { regex: /\bit's\s+all\s+(?:connected|planned|orchestrated)\b/i, reason: "conspiracy" },
  { regex: /\b(?:the\s+)?(?:elites?|cabal|powers\s+that\s+be)\s+(?:want|control|plan)\b/i, reason: "conspiracy" },
  { regex: /\bfollow\s+the\s+money\b/i, reason: "conspiracy" },
  { regex: /\bopen\s+your\s+eyes\b/i, reason: "conspiracy" },
  { regex: /\bthe\s+(?:mainstream\s+)?media\s+(?:lies?|won't\s+tell|hides?)\b/i, reason: "conspiracy" },

  // === Hebrew: Conspiracy ===
  { regex: /הם\s+(?:לא\s+רוצים\s+ש|מסתירים)/, reason: "conspiracy" },
  { regex: /(?:האמת|הסיפור\s+האמיתי)\s+(?:שמסתירים|שלא\s+רוצים)/, reason: "conspiracy" },
  { regex: /תתעוררו/, reason: "conspiracy" },
  { regex: /הכל\s+(?:מתוכנן|מתואם|קשור)/, reason: "conspiracy" },
  { regex: /(?:האליטות|השלטון)\s+(?:רוצים|שולטים|מתכננים)/, reason: "conspiracy" },
  { regex: /(?:התקשורת|המדיה)\s+(?:משקרת|מסתירה|לא\s+מספרת)/, reason: "conspiracy" },
  { regex: /תפתחו\s+(?:עיניים|את\s+העיניים)/, reason: "conspiracy" },

  // ═══════════════════════════════════════════════════════════════════
  // AGENT DETECTION BIAS: Seeing intention in randomness
  // ═══════════════════════════════════════════════════════════════════

  // === English: Agent Detection ===
  { regex: /\beverything\s+happens\s+for\s+a\s+reason\b/i, reason: "agent_detection" },
  { regex: /\bthere\s+(?:are\s+)?no\s+(?:such\s+thing\s+as\s+)?coincidences?\b/i, reason: "agent_detection" },
  { regex: /\bit(?:'s|\s+is)\s+no\s+(?:accident|coincidence)\b/i, reason: "agent_detection" },
  { regex: /\bit\s+was\s+(?:meant|supposed)\s+to\s+(?:be|happen)\b/i, reason: "agent_detection" },
  { regex: /\bthings\s+happen\s+for\s+a\s+reason\b/i, reason: "agent_detection" },
  { regex: /\bnothing\s+(?:is|happens)\s+by\s+(?:chance|accident)\b/i, reason: "agent_detection" },
  { regex: /\b(?:there\s+)?must\s+be\s+a\s+reason\b/i, reason: "agent_detection" },
  { regex: /\bsomeone\s+(?:or\s+something\s+)?is\s+(?:behind|responsible)\b/i, reason: "agent_detection" },

  // === Hebrew: Agent Detection ===
  { regex: /הכל\s+קורה\s+(?:מסיבה|לא\s+במקרה)/, reason: "agent_detection" },
  { regex: /(?:אין|לא\s+קיימים)\s+(?:מקרים|צירופי\s+מקרים)/, reason: "agent_detection" },
  { regex: /זה\s+(?:לא\s+מקרי|לא\s+במקרה)/, reason: "agent_detection" },
  { regex: /זה\s+היה\s+(?:אמור|צריך)\s+לקרות/, reason: "agent_detection" },
  { regex: /(?:בטח|חייב)\s+(?:יש|שיש)\s+סיבה/, reason: "agent_detection" },
  { regex: /שום\s+דבר\s+לא\s+(?:קורה\s+)?במקרה/, reason: "agent_detection" },
  { regex: /מישהו\s+(?:עומד\s+)?מאחורי\s+(?:זה|הכל)/, reason: "agent_detection" },

  // ═══════════════════════════════════════════════════════════════════
  // NARRATIVE FALLACY: Imposing story structure on random events
  // ═══════════════════════════════════════════════════════════════════

  // === English: Narrative Fallacy ===
  { regex: /\bthe\s+story\s+of\s+my\s+life\b/i, reason: "narrative_fallacy" },
  { regex: /\bmy\s+(?:life\s+)?journey\b/i, reason: "narrative_fallacy" },
  { regex: /\b(?:new|next)\s+chapter\s+(?:in|of)\s+(?:my|life)\b/i, reason: "narrative_fallacy" },
  { regex: /\bhero(?:'s)?\s+(?:journey|story)\b/i, reason: "narrative_fallacy" },
  { regex: /\bmy\s+(?:origin|redemption|transformation)\s+story\b/i, reason: "narrative_fallacy" },
  { regex: /\bthis\s+is\s+(?:my|the)\s+(?:story|narrative)\b/i, reason: "narrative_fallacy" },
  { regex: /\bplot\s+twist\s+in\s+(?:my|life)\b/i, reason: "narrative_fallacy" },
  { regex: /\bwriting\s+(?:my|the\s+next)\s+chapter\b/i, reason: "narrative_fallacy" },
  { regex: /\bthe\s+(?:arc|trajectory)\s+of\s+(?:my|life)\b/i, reason: "narrative_fallacy" },

  // === Hebrew: Narrative Fallacy ===
  { regex: /הסיפור\s+של\s+(?:חיי|החיים\s+שלי)/, reason: "narrative_fallacy" },
  { regex: /(?:פרק\s+חדש|פרק\s+הבא)\s+ב(?:חיי|חיים)/, reason: "narrative_fallacy" },
  { regex: /המסע\s+שלי/, reason: "narrative_fallacy" },
  { regex: /גיבור\s+(?:הסיפור|החיים)\s+שלי/, reason: "narrative_fallacy" },
  { regex: /סיפור\s+(?:הגאולה|ההתמרה|המקור)\s+שלי/, reason: "narrative_fallacy" },
  { regex: /(?:טוויסט|תפנית)\s+(?:בסיפור|בחיים)/, reason: "narrative_fallacy" },
  { regex: /כותב\s+(?:את\s+)?(?:הפרק|הסיפור)\s+הבא/, reason: "narrative_fallacy" },

  // ═══════════════════════════════════════════════════════════════════
  // ESSENTIALISM: Fixed identity beliefs that block change
  // ═══════════════════════════════════════════════════════════════════

  // === English: Essentialism ===
  { regex: /\bthat(?:'s| is)\s+(?:just\s+)?(?:who|how)\s+I\s+am\b/i, reason: "essentialism" },
  { regex: /\bI\s+(?:was\s+)?born\s+(?:this\s+way|like\s+this)\b/i, reason: "essentialism" },
  { regex: /\bit(?:'s| is)\s+in\s+my\s+(?:nature|DNA|genes|blood)\b/i, reason: "essentialism" },
  { regex: /\bI(?:'ve| have)\s+always\s+been\s+(?:this\s+way|like\s+this)\b/i, reason: "essentialism" },
  { regex: /\bI\s+can(?:'t| not)\s+change\s+(?:who|what)\s+I\s+am\b/i, reason: "essentialism" },
  { regex: /\bpeople\s+(?:don't|never)\s+(?:really\s+)?change\b/i, reason: "essentialism" },
  { regex: /\ba\s+leopard\s+(?:can't|never)\s+change\s+(?:its|his)\s+spots\b/i, reason: "essentialism" },
  { regex: /\bonce\s+a\s+\w+,?\s+always\s+a\s+\w+\b/i, reason: "essentialism" },

  // === Hebrew: Essentialism ===
  { regex: /זה\s+(?:פשוט\s+)?מי\s+שאני/, reason: "essentialism" },
  { regex: /ככה\s+(?:אני|נולדתי)/, reason: "essentialism" },
  { regex: /זה\s+ב(?:דנ"א|טבע|דם)\s+שלי/, reason: "essentialism" },
  { regex: /תמיד\s+הייתי\s+(?:ככה|כזה)/, reason: "essentialism" },
  { regex: /אני\s+לא\s+(?:יכול|מסוגל)\s+להשתנות/, reason: "essentialism" },
  { regex: /אנשים\s+לא\s+(?:באמת\s+)?משתנים/, reason: "essentialism" },
  { regex: /פעם\s+\S+\s+תמיד\s+\S+/, reason: "essentialism" },

  // ═══════════════════════════════════════════════════════════════════
  // VICTIM NARRATIVE: Persistent external blame pattern
  // ═══════════════════════════════════════════════════════════════════

  // === English: Victim Narrative ===
  { regex: /\bthey\s+always\s+do\s+this\s+to\s+me\b/i, reason: "victim_narrative" },
  { regex: /\bnothing\s+(?:ever|good)\s+(?:works|happens)\s+(?:for|to)\s+me\b/i, reason: "victim_narrative" },
  { regex: /\beveryone\s+is\s+(?:against|out\s+to\s+get)\s+me\b/i, reason: "victim_narrative" },
  { regex: /\bI(?:'m| am)\s+(?:always\s+)?the\s+(?:victim|one\s+who\s+suffers)\b/i, reason: "victim_narrative" },
  { regex: /\bwhy\s+does\s+this\s+(?:always|only)\s+happen\s+to\s+me\b/i, reason: "victim_narrative" },
  { regex: /\bI\s+(?:never|can't)\s+(?:catch|get)\s+a\s+break\b/i, reason: "victim_narrative" },
  { regex: /\bthe\s+(?:world|universe|life)\s+is\s+(?:against|unfair\s+to)\s+me\b/i, reason: "victim_narrative" },
  { regex: /\bI(?:'m| am)\s+cursed\b/i, reason: "victim_narrative" },

  // === Hebrew: Victim Narrative ===
  { regex: /תמיד\s+(?:עושים|מתייחסים)\s+(?:אלי|לי)\s+(?:ככה|כך)/, reason: "victim_narrative" },
  { regex: /(?:אף\s+פעם|שום\s+דבר)\s+לא\s+(?:יוצא|עובד|מצליח)\s+לי/, reason: "victim_narrative" },
  { regex: /(?:כולם|העולם)\s+נגדי/, reason: "victim_narrative" },
  { regex: /אני\s+(?:תמיד\s+)?הקורבן/, reason: "victim_narrative" },
  { regex: /למה\s+(?:תמיד\s+)?(?:זה|דברים)\s+קורים\s+(?:דווקא\s+)?לי/, reason: "victim_narrative" },
  { regex: /(?:אני\s+)?(?:מקולל|בלי\s+מזל)/, reason: "victim_narrative" },
  { regex: /החיים\s+(?:לא\s+)?(?:הוגנים|צודקים)\s+(?:אלי|אתי)/, reason: "victim_narrative" },

  // ═══════════════════════════════════════════════════════════════════
  // HINDSIGHT BIAS: "I knew it all along" after the fact
  // ═══════════════════════════════════════════════════════════════════

  // === English: Hindsight Bias ===
  { regex: /\bI\s+knew\s+(?:it|this)\s+(?:would|was\s+going\s+to)\b/i, reason: "hindsight_bias" },
  { regex: /\bI\s+(?:always\s+)?knew\s+(?:it|this)\s+(?:all\s+along)?\b/i, reason: "hindsight_bias" },
  { regex: /\b(?:it\s+)?was\s+(?:so\s+)?obvious\s+(?:from\s+the\s+start)?\b/i, reason: "hindsight_bias" },
  { regex: /\bI\s+should\s+have\s+(?:known|seen\s+it\s+coming)\b/i, reason: "hindsight_bias" },
  { regex: /\b(?:anyone|everyone)\s+could\s+(?:have\s+)?(?:seen|predicted)\s+(?:it|this)\b/i, reason: "hindsight_bias" },
  { regex: /\bthe\s+(?:signs|writing)\s+(?:were|was)\s+(?:all\s+)?there\b/i, reason: "hindsight_bias" },
  { regex: /\bin\s+(?:hind|retro)sight\b/i, reason: "hindsight_bias" },

  // === Hebrew: Hindsight Bias ===
  { regex: /ידעתי\s+(?:שזה|שככה)\s+(?:יקרה|יהיה)/, reason: "hindsight_bias" },
  { regex: /(?:היה\s+)?ברור\s+(?:מראש|מההתחלה)/, reason: "hindsight_bias" },
  { regex: /הייתי\s+(?:צריך|אמור)\s+לדעת/, reason: "hindsight_bias" },
  { regex: /(?:כל\s+אחד|כולם)\s+(?:היו\s+)?(?:יכולים\s+)?לראות\s+את\s+זה/, reason: "hindsight_bias" },
  { regex: /הסימנים\s+היו\s+(?:שם|ברורים)/, reason: "hindsight_bias" },
  { regex: /במבט\s+(?:לאחור|רטרוספקטיבי)/, reason: "hindsight_bias" },

  // ═══════════════════════════════════════════════════════════════════
  // MAGICAL THINKING: Belief in non-causal influence
  // ═══════════════════════════════════════════════════════════════════

  // === English: Magical Thinking ===
  { regex: /\b(?:the\s+)?law\s+of\s+attraction\b/i, reason: "magical_thinking" },
  { regex: /\bI(?:'m| am)\s+manifesting\b/i, reason: "magical_thinking" },
  { regex: /\bI\s+(?:attracted|manifested)\s+(?:this|it)\b/i, reason: "magical_thinking" },
  { regex: /\bpositive\s+(?:thinking|thoughts?|energy)\s+(?:will|can)\s+(?:bring|attract)\b/i, reason: "magical_thinking" },
  { regex: /\bsend(?:ing)?\s+(?:good\s+)?(?:vibes|energy|thoughts)\s+(?:to|into)\s+the\s+universe\b/i, reason: "magical_thinking" },
  { regex: /\bthe\s+universe\s+(?:will\s+)?(?:provide|deliver|give\s+me)\b/i, reason: "magical_thinking" },
  { regex: /\b(?:put|putting)\s+it\s+out\s+(?:there|into\s+the\s+universe)\b/i, reason: "magical_thinking" },
  { regex: /\bif\s+I\s+(?:just\s+)?(?:believe|think\s+positive)\s+(?:enough|hard\s+enough)\b/i, reason: "magical_thinking" },
  { regex: /\bwishing\s+(?:it\s+)?into\s+(?:existence|being|reality)\b/i, reason: "magical_thinking" },

  // === Hebrew: Magical Thinking ===
  { regex: /חוק\s+המשיכה/, reason: "magical_thinking" },
  { regex: /(?:אני\s+)?(?:ממניפסט|מגשים)/, reason: "magical_thinking" },
  { regex: /משכתי\s+(?:את\s+)?(?:זה|הדבר)/, reason: "magical_thinking" },
  { regex: /(?:מחשבה|אנרגיה)\s+חיובית\s+(?:תביא|תמשוך)/, reason: "magical_thinking" },
  { regex: /(?:שולח|שלחתי)\s+(?:לעולם|ליקום)/, reason: "magical_thinking" },
  { regex: /היקום\s+(?:יספק|ייתן|יביא)/, reason: "magical_thinking" },
  { regex: /אם\s+(?:רק\s+)?(?:אאמין|אחשוב\s+חיובי)\s+מספיק/, reason: "magical_thinking" },

  // ═══════════════════════════════════════════════════════════════════
  // SIGNS AND OMENS: Seeing meaningful signs in random events
  // ═══════════════════════════════════════════════════════════════════

  // === English: Signs/Omens ===
  { regex: /\b(?:it(?:'s| is)|that(?:'s| is))\s+a\s+sign\b/i, reason: "signs_omens" },
  { regex: /\bthe\s+(?:signs|universe)\s+(?:is|are)\s+(?:telling|showing|sending)\s+me\b/i, reason: "signs_omens" },
  { regex: /\bI\s+(?:saw|got|received)\s+a\s+sign\b/i, reason: "signs_omens" },
  { regex: /\b(?:it|this)\s+(?:must\s+)?mean\s+something\b/i, reason: "signs_omens" },
  { regex: /\bthe\s+universe\s+is\s+(?:sending|giving)\s+me\s+(?:a\s+)?(?:sign|message)\b/i, reason: "signs_omens" },
  { regex: /\b(?:it's|this\s+is)\s+(?:an?\s+)?omen\b/i, reason: "signs_omens" },
  { regex: /\b(?:I|we)\s+(?:need|should)\s+(?:to\s+)?(?:pay\s+attention\s+to|heed)\s+(?:the\s+)?signs\b/i, reason: "signs_omens" },

  // === Hebrew: Signs/Omens ===
  { regex: /זה\s+סימן/, reason: "signs_omens" },
  { regex: /(?:היקום|העולם)\s+(?:שולח|נותן)\s+לי\s+(?:סימן|מסר)/, reason: "signs_omens" },
  { regex: /(?:ראיתי|קיבלתי)\s+סימן/, reason: "signs_omens" },
  { regex: /זה\s+(?:בטח|חייב)\s+(?:אומר|מסמן)\s+משהו/, reason: "signs_omens" },
  { regex: /(?:צריך|חייב)\s+לשים\s+לב\s+לסימנים/, reason: "signs_omens" },
  { regex: /זה\s+(?:אות|סימן)\s+(?:מלמעלה|משמיים)/, reason: "signs_omens" },

  // ═══════════════════════════════════════════════════════════════════
  // PURPOSE QUESTIONS: Teleological "why" questions
  // ═══════════════════════════════════════════════════════════════════

  // === English: Purpose Questions ===
  { regex: /\bwhy\s+(?:is\s+this\s+happening|did\s+this\s+happen)\s+to\s+me\b/i, reason: "purpose_question" },
  { regex: /\bwhat(?:'s| is)\s+the\s+(?:purpose|meaning|point)\s+of\s+(?:this|all\s+this)\b/i, reason: "purpose_question" },
  { regex: /\bwhat\s+(?:am\s+I|are\s+we)\s+(?:supposed|meant)\s+to\s+learn\s+(?:from\s+this)?\b/i, reason: "purpose_question" },
  { regex: /\bwhat(?:'s| is)\s+the\s+lesson\s+(?:here|in\s+this)\b/i, reason: "purpose_question" },
  { regex: /\bwhy\s+me\b/i, reason: "purpose_question" },
  { regex: /\bthere\s+must\s+be\s+a\s+(?:reason|purpose)\s+(?:for\s+this)?\b/i, reason: "purpose_question" },

  // === Hebrew: Purpose Questions ===
  { regex: /למה\s+(?:זה|דווקא)\s+(?:קורה|קרה)\s+לי/, reason: "purpose_question" },
  { regex: /מה\s+(?:המטרה|המשמעות|הטעם)\s+(?:של\s+)?(?:זה|כל\s+זה)/, reason: "purpose_question" },
  { regex: /מה\s+אני\s+(?:אמור|צריך)\s+ללמוד\s+(?:מזה|מהמצב)/, reason: "purpose_question" },
  { regex: /מה\s+הלקח\s+(?:כאן|בזה)/, reason: "purpose_question" },
  { regex: /למה\s+(?:דווקא\s+)?אני/, reason: "purpose_question" },
  { regex: /(?:בטח|חייב)\s+(?:יש|שיש)\s+(?:סיבה|מטרה)\s+לזה/, reason: "purpose_question" },

  // ═══════════════════════════════════════════════════════════════════
  // EMOTION PERSONIFICATION: Treating emotions as agents
  // ═══════════════════════════════════════════════════════════════════

  // === English: Emotion Personification ===
  { regex: /\bmy\s+(?:fear|anxiety|depression|anger)\s+(?:tells?|says?|wants?|knows?)\b/i, reason: "emotion_personification" },
  { regex: /\b(?:fear|anxiety|depression|anger)\s+(?:is\s+)?(?:lying|lying\s+to\s+me)\b/i, reason: "emotion_personification" },
  { regex: /\b(?:fear|anxiety|depression)\s+(?:won't|doesn't)\s+let\s+me\b/i, reason: "emotion_personification" },
  { regex: /\blistening\s+to\s+(?:my\s+)?(?:fear|anxiety|depression)\b/i, reason: "emotion_personification" },
  { regex: /\b(?:my\s+)?(?:fear|anxiety|depression)\s+(?:is\s+)?(?:controlling|running)\s+(?:my\s+life|me)\b/i, reason: "emotion_personification" },
  { regex: /\b(?:my\s+)?inner\s+(?:critic|voice)\s+(?:says?|tells?|wants?)\b/i, reason: "emotion_personification" },

  // === Hebrew: Emotion Personification ===
  { regex: /(?:הפחד|החרדה|הדיכאון|הכעס)\s+(?:שלי\s+)?(?:אומר|רוצה|יודע)/, reason: "emotion_personification" },
  { regex: /(?:הפחד|החרדה|הדיכאון)\s+משקר/, reason: "emotion_personification" },
  { regex: /(?:הפחד|החרדה|הדיכאון)\s+לא\s+(?:נותן|מרשה)\s+לי/, reason: "emotion_personification" },
  { regex: /להקשיב\s+ל(?:פחד|חרדה|דיכאון)/, reason: "emotion_personification" },
  { regex: /(?:הפחד|החרדה|הדיכאון)\s+(?:שולט|מנהל)\s+(?:את\s+)?(?:החיים|אותי)/, reason: "emotion_personification" },
  { regex: /(?:הקול|המבקר)\s+הפנימי\s+(?:שלי\s+)?(?:אומר|רוצה)/, reason: "emotion_personification" },

  // ═══════════════════════════════════════════════════════════════════
  // TIME TELEOLOGY: Attributing agency to time
  // ═══════════════════════════════════════════════════════════════════

  // === English: Time Teleology ===
  { regex: /\btime\s+(?:will\s+)?(?:tell|show|prove|reveal)\b/i, reason: "time_teleology" },
  { regex: /\btime\s+heals?\s+(?:all\s+)?(?:wounds?)?\b/i, reason: "time_teleology" },
  { regex: /\btime\s+(?:will\s+)?(?:take\s+care\s+of|sort\s+out|fix)\b/i, reason: "time_teleology" },
  { regex: /\bgive\s+it\s+time\b/i, reason: "time_teleology" },
  { regex: /\btime\s+(?:is\s+)?(?:on\s+my|our)\s+side\b/i, reason: "time_teleology" },
  { regex: /\bonly\s+time\s+(?:will\s+)?(?:tell|know)\b/i, reason: "time_teleology" },

  // === Hebrew: Time Teleology ===
  { regex: /הזמן\s+(?:יגיד|יראה|יוכיח|יחשוף)/, reason: "time_teleology" },
  { regex: /הזמן\s+(?:ירפא|מרפא)/, reason: "time_teleology" },
  { regex: /הזמן\s+(?:יטפל|יסדר|יתקן)/, reason: "time_teleology" },
  { regex: /(?:תן|תני)\s+לזמן/, reason: "time_teleology" },
  { regex: /הזמן\s+(?:בצד|עם|לטובת)\s+(?:שלי|שלנו)/, reason: "time_teleology" },
  { regex: /רק\s+הזמן\s+(?:יגיד|יודע)/, reason: "time_teleology" },

  // ═══════════════════════════════════════════════════════════════════
  // DESTINY LANGUAGE: Predetermined path/calling
  // ═══════════════════════════════════════════════════════════════════

  // === English: Destiny Language ===
  { regex: /\bI(?:'m| am|was)\s+(?:destined|fated)\s+(?:to|for)\b/i, reason: "destiny_language" },
  { regex: /\b(?:it(?:'s| is)|this\s+is)\s+my\s+(?:destiny|fate|calling)\b/i, reason: "destiny_language" },
  { regex: /\bmeant\s+(?:to\s+be|for\s+me|for\s+each\s+other)\b/i, reason: "destiny_language" },
  { regex: /\b(?:it|this)\s+was\s+(?:written|predetermined)\b/i, reason: "destiny_language" },
  { regex: /\bmy\s+(?:true\s+)?(?:calling|purpose|mission)\s+(?:in\s+life)?\b/i, reason: "destiny_language" },
  { regex: /\bI\s+was\s+(?:put|placed)\s+(?:here|on\s+earth)\s+(?:to|for)\b/i, reason: "destiny_language" },
  { regex: /\b(?:we|they)\s+were\s+meant\s+to\s+(?:meet|find\s+each\s+other)\b/i, reason: "destiny_language" },
  { regex: /\bfate\s+(?:brought|led)\s+(?:us|me)\b/i, reason: "destiny_language" },

  // === Hebrew: Destiny Language ===
  { regex: /(?:אני\s+)?נועד(?:תי)?\s+ל/, reason: "destiny_language" },
  { regex: /זה\s+(?:הגורל|היעוד|הייעוד)\s+שלי/, reason: "destiny_language" },
  { regex: /(?:היינו\s+)?אמורים\s+(?:להיפגש|למצוא\s+אחד\s+את\s+השני)/, reason: "destiny_language" },
  { regex: /(?:זה\s+)?היה\s+(?:כתוב|נקבע\s+מראש)/, reason: "destiny_language" },
  { regex: /(?:הייעוד|המשימה|הקריאה)\s+(?:האמיתי|שלי)\s+(?:בחיים)?/, reason: "destiny_language" },
  { regex: /(?:הושמתי|נשלחתי)\s+(?:לכאן|לעולם)\s+(?:כדי|בשביל)/, reason: "destiny_language" },
  { regex: /הגורל\s+(?:הפגיש|הוביל)\s+(?:אותנו|אותי)/, reason: "destiny_language" }
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

  // ═══════════════════════════════════════════════════════════════════
  // JUST WORLD FALLACY REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Just World ===
  rewritten = rewritten.replace(/\b(?:he|she)\s+got\s+what\s+(?:he|she)\s+deserved\b/gi, "circumstances led to this outcome for them");
  rewritten = rewritten.replace(/\bthey\s+got\s+what\s+they\s+deserved\b/gi, "circumstances led to this outcome for them");
  rewritten = rewritten.replace(/\bdeserves?\s+(?:this|that|it)\b/gi, "this is the outcome they received");
  rewritten = rewritten.replace(/\bhad\s+it\s+coming\b/gi, "this was a predictable consequence");
  rewritten = rewritten.replace(/\breap\s+what\s+(?:you|they|we)\s+sow\b/gi, "actions have consequences");
  rewritten = rewritten.replace(/\bgood\s+things\s+happen\s+to\s+good\s+people\b/gi, "outcomes vary regardless of character");
  rewritten = rewritten.replace(/\bbad\s+things\s+happen\s+to\s+bad\s+people\b/gi, "outcomes vary regardless of character");

  // === Hebrew: Just World ===
  rewritten = rewritten.replace(/מגיע\s+(?:לו|לה|להם)/gi, "זו התוצאה שקיבל/ה");
  rewritten = rewritten.replace(/קיבל\s+(?:את\s+)?מה\s+שמגיע/gi, "הנסיבות הובילו לתוצאה זו");
  rewritten = rewritten.replace(/ראוי\s+לעונש/gi, "צפויה תוצאה שלילית");
  rewritten = rewritten.replace(/צדק\s+נעשה/gi, "התקבלה תוצאה");

  // ═══════════════════════════════════════════════════════════════════
  // BODY TELEOLOGY REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Body Teleology ===
  rewritten = rewritten.replace(/\byour\s+body\s+knows\b/gi, "physiological processes indicate");
  rewritten = rewritten.replace(/\byour\s+body\s+wants\b/gi, "your body's signals suggest a need for");
  rewritten = rewritten.replace(/\byour\s+body\s+is\s+telling\s+you\b/gi, "physical symptoms may indicate");
  rewritten = rewritten.replace(/\byour\s+body\s+is\s+trying\b/gi, "your body is responding by");
  rewritten = rewritten.replace(/\blisten\s+to\s+your\s+body\b/gi, "pay attention to physical symptoms");
  rewritten = rewritten.replace(/\byour\s+body\s+is\s+wise\b/gi, "your body has regulatory systems");
  rewritten = rewritten.replace(/\byour\s+gut\s+knows\b/gi, "your intuitive response suggests");
  rewritten = rewritten.replace(/\byour\s+heart\s+knows\b/gi, "your emotional response indicates");
  rewritten = rewritten.replace(/\binnate\s+wisdom\b/gi, "evolved mechanisms");

  // === Hebrew: Body Teleology ===
  rewritten = rewritten.replace(/הגוף\s+יודע/gi, "תהליכים פיזיולוגיים מצביעים על");
  rewritten = rewritten.replace(/הגוף\s+רוצה/gi, "איתותי הגוף מרמזים על צורך ב");
  rewritten = rewritten.replace(/הגוף\s+מנסה/gi, "הגוף מגיב באמצעות");
  rewritten = rewritten.replace(/תקשיב\s+לגוף/gi, "שים לב לסימפטומים הפיזיים");
  rewritten = rewritten.replace(/הגוף\s+חכם/gi, "לגוף יש מערכות ויסות");
  rewritten = rewritten.replace(/הבטן\s+יודעת/gi, "התגובה האינטואיטיבית שלך מרמזת");
  rewritten = rewritten.replace(/הלב\s+יודע/gi, "התגובה הרגשית שלך מצביעה על");
  rewritten = rewritten.replace(/חוכמה\s+(?:פנימית|מולדת)/gi, "מנגנונים שהתפתחו");

  // ═══════════════════════════════════════════════════════════════════
  // TECHNOLOGY ANIMISM REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Technology Animism ===
  rewritten = rewritten.replace(/\bthe?\s*computer\s+hates\s+me\b/gi, "the computer is malfunctioning");
  rewritten = rewritten.replace(/\bthe?\s*computer\s+wants\b/gi, "the computer is configured to");
  rewritten = rewritten.replace(/\bthe?\s*computer\s+refuses\b/gi, "the computer cannot process");
  rewritten = rewritten.replace(/\bthe?\s*printer\s+hates\b/gi, "the printer is malfunctioning");
  rewritten = rewritten.replace(/\bthe?\s*printer\s+refuses\b/gi, "the printer cannot process");
  rewritten = rewritten.replace(/\bthe?\s*app\s+wants\b/gi, "the app is designed to");
  rewritten = rewritten.replace(/\bthe?\s*app\s+refuses\b/gi, "the app cannot");
  rewritten = rewritten.replace(/\btechnology\s+hates\b/gi, "technology is failing");

  // === Hebrew: Technology Animism ===
  rewritten = rewritten.replace(/המחשב\s+שונא\s+אותי/gi, "המחשב לא עובד כראוי");
  rewritten = rewritten.replace(/המחשב\s+רוצה/gi, "המחשב מוגדר ל");
  rewritten = rewritten.replace(/המחשב\s+מסרב/gi, "המחשב לא מצליח לעבד");
  rewritten = rewritten.replace(/המדפסת\s+(?:שונאת|מסרבת)/gi, "המדפסת לא עובדת כראוי");
  rewritten = rewritten.replace(/האפליקציה\s+רוצה/gi, "האפליקציה מתוכננת ל");
  rewritten = rewritten.replace(/האפליקציה\s+מסרבת/gi, "האפליקציה לא יכולה");
  rewritten = rewritten.replace(/הטכנולוגיה\s+שונאת/gi, "הטכנולוגיה לא תקינה");

  // ═══════════════════════════════════════════════════════════════════
  // DIVINE TELEOLOGY REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Divine Teleology ===
  rewritten = rewritten.replace(/\bgod\s+wants\b/gi, "religious belief holds that");
  rewritten = rewritten.replace(/\bgod\s+has\s+a\s+plan\b/gi, "some believe there is a purpose behind events");
  rewritten = rewritten.replace(/\bgod's\s+plan\b/gi, "the religious concept of divine purpose");
  rewritten = rewritten.replace(/\bdivine\s+plan\b/gi, "the concept of predetermined purpose");
  rewritten = rewritten.replace(/\bdivine\s+purpose\b/gi, "a sense of meaning or purpose");
  rewritten = rewritten.replace(/\bit's\s+a\s+test\s+from\s+god\b/gi, "this situation is challenging");
  rewritten = rewritten.replace(/\bit's\s+a\s+sign\s+from\s+(?:god|above)\b/gi, "this coincidence is notable");
  rewritten = rewritten.replace(/\bblessed\s+with\b/gi, "fortunate to have");
  rewritten = rewritten.replace(/\bcursed\s+with\b/gi, "burdened with");
  rewritten = rewritten.replace(/\bprovidence\b/gi, "fortunate circumstances");

  // === Hebrew: Divine Teleology ===
  rewritten = rewritten.replace(/אלוהים\s+רוצה/gi, "על פי אמונה דתית");
  rewritten = rewritten.replace(/תוכנית\s+(?:ה['׳]|אלוהים)/gi, "המושג הדתי של מטרה אלוהית");
  rewritten = rewritten.replace(/השגחה\s+(?:עליונה|פרטית)/gi, "נסיבות שקרו");
  rewritten = rewritten.replace(/מבחן\s+מלמעלה/gi, "מצב מאתגר");
  rewritten = rewritten.replace(/סימן\s+מלמעלה/gi, "צירוף מקרים בולט");
  rewritten = rewritten.replace(/מבורך\s+ב/gi, "בר מזל עם");
  rewritten = rewritten.replace(/מקולל\s+ב/gi, "נושא בנטל של");
  rewritten = rewritten.replace(/הכל\s+בהשגחה/gi, "האירועים התרחשו");
  rewritten = rewritten.replace(/גזירת\s+(?:שמיים|גורל)/gi, "נסיבות שלא בשליטתנו");

  // ═══════════════════════════════════════════════════════════════════
  // PATHETIC FALLACY REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Pathetic Fallacy ===
  rewritten = rewritten.replace(/\bthe\s+(?:sky|skies)\s+(?:cry|cries|is\s+crying)\b/gi, "it is raining");
  rewritten = rewritten.replace(/\bthe\s+(?:sky|skies)\s+(?:weep|weeps|is\s+weeping)\b/gi, "it is raining");
  rewritten = rewritten.replace(/\bthe\s+sun\s+(?:smiles?|is\s+smiling)\b/gi, "the sun is shining brightly");
  rewritten = rewritten.replace(/\bangry\s+storm\b/gi, "intense storm");
  rewritten = rewritten.replace(/\bangry\s+sea\b/gi, "turbulent sea");
  rewritten = rewritten.replace(/\bthe\s+sea\s+is\s+angry\b/gi, "the sea is turbulent");
  rewritten = rewritten.replace(/\bthe\s+wind\s+whispers\b/gi, "the wind blows gently");
  rewritten = rewritten.replace(/\bthe\s+wind\s+howls\b/gi, "the wind blows strongly");
  rewritten = rewritten.replace(/\bthe\s+wind\s+screams\b/gi, "the wind blows violently");
  rewritten = rewritten.replace(/\bnature\s+mourns\b/gi, "the environment appears somber");
  rewritten = rewritten.replace(/\bnature\s+rejoices\b/gi, "conditions are favorable");

  // === Hebrew: Pathetic Fallacy ===
  rewritten = rewritten.replace(/השמיים\s+בוכים/gi, "יורד גשם");
  rewritten = rewritten.replace(/השמיים\s+עצובים/gi, "השמיים מעוננים");
  rewritten = rewritten.replace(/השמש\s+מחייכת/gi, "השמש זורחת בעוצמה");
  rewritten = rewritten.replace(/הים\s+זועם/gi, "הים סוער");
  rewritten = rewritten.replace(/הים\s+כועס/gi, "הים סוער");
  rewritten = rewritten.replace(/הרוח\s+לוחשת/gi, "הרוח נושבת בעדינות");
  rewritten = rewritten.replace(/הרוח\s+יללה/gi, "הרוח נושבת בעוצמה");
  rewritten = rewritten.replace(/הטבע\s+מתאבל/gi, "הסביבה נראית קודרת");
  rewritten = rewritten.replace(/הטבע\s+שמח/gi, "התנאים נוחים");
  rewritten = rewritten.replace(/סערה\s+זועמת/gi, "סערה עזה");

  // ═══════════════════════════════════════════════════════════════════
  // KARMA REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Karma ===
  rewritten = rewritten.replace(/\bwhat\s+goes\s+around\s+comes\s+around\b/gi, "actions can have consequences");
  rewritten = rewritten.replace(/\bkarma\s+will\b/gi, "consequences may follow");
  rewritten = rewritten.replace(/\bgood\s+karma\b/gi, "positive outcomes");
  rewritten = rewritten.replace(/\bbad\s+karma\b/gi, "negative outcomes");
  rewritten = rewritten.replace(/\bit\s+will\s+come\s+back\s+to\s+(?:you|them)\b/gi, "there may be consequences");
  rewritten = rewritten.replace(/\bthe\s+universe\s+will\s+punish\b/gi, "there may be negative consequences for");
  rewritten = rewritten.replace(/\bthe\s+universe\s+will\s+reward\b/gi, "positive outcomes may follow");
  rewritten = rewritten.replace(/\bpoetic\s+justice\b/gi, "an ironic outcome");
  rewritten = rewritten.replace(/\bjust\s+desserts\b/gi, "consequences of actions");

  // === Hebrew: Karma ===
  rewritten = rewritten.replace(/מה\s+שהולך\s+חוזר/gi, "לפעולות יש השלכות");
  rewritten = rewritten.replace(/זה\s+יחזור\s+(?:אליו|אליה|אליהם)/gi, "עשויות להיות השלכות");
  rewritten = rewritten.replace(/גמול\s+משמיים/gi, "תוצאות אפשריות");
  rewritten = rewritten.replace(/עונש\s+משמיים/gi, "השלכות שליליות אפשריות");
  rewritten = rewritten.replace(/ישלם\s+על\s+זה/gi, "עשויות להיות השלכות");
  rewritten = rewritten.replace(/צדק\s+פואטי/gi, "תוצאה אירונית");
  rewritten = rewritten.replace(/קארמה/gi, "השלכות של פעולות");

  // ═══════════════════════════════════════════════════════════════════
  // CONSPIRACY REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Conspiracy ===
  rewritten = rewritten.replace(/\bthey\s+don't\s+want\s+you\s+to\s+know\b/gi, "this information is not widely publicized");
  rewritten = rewritten.replace(/\bthey\s+(?:are\s+)?hiding\s+the\s+truth\b/gi, "the full information may not be available");
  rewritten = rewritten.replace(/\bwake\s+up\s+(?:sheeple|people)\b/gi, "consider this perspective");
  rewritten = rewritten.replace(/\bit's\s+all\s+connected\b/gi, "these events may be related");
  rewritten = rewritten.replace(/\bit's\s+all\s+planned\b/gi, "this appears coordinated");
  rewritten = rewritten.replace(/\bthe\s+elites?\s+want\b/gi, "wealthy or powerful individuals may prefer");
  rewritten = rewritten.replace(/\bfollow\s+the\s+money\b/gi, "examine financial incentives");
  rewritten = rewritten.replace(/\bopen\s+your\s+eyes\b/gi, "consider alternative explanations");
  rewritten = rewritten.replace(/\bthe\s+media\s+lies\b/gi, "media reports may have biases");

  // === Hebrew: Conspiracy ===
  rewritten = rewritten.replace(/הם\s+לא\s+רוצים\s+ש/gi, "מידע זה לא מפורסם ברבים ש");
  rewritten = rewritten.replace(/הם\s+מסתירים/gi, "המידע המלא אולי לא זמין");
  rewritten = rewritten.replace(/תתעוררו/gi, "שקלו את הנקודה הזו");
  rewritten = rewritten.replace(/הכל\s+מתוכנן/gi, "זה נראה מתואם");
  rewritten = rewritten.replace(/הכל\s+(?:מתואם|קשור)/gi, "ייתכן שהאירועים קשורים");
  rewritten = rewritten.replace(/(?:האליטות|השלטון)\s+רוצים/gi, "בעלי עוצמה עשויים להעדיף");
  rewritten = rewritten.replace(/(?:התקשורת|המדיה)\s+משקרת/gi, "דיווחי התקשורת עשויים להכיל הטיות");
  rewritten = rewritten.replace(/תפתחו\s+(?:את\s+ה)?עיניים/gi, "שקלו הסברים חלופיים");

  // ═══════════════════════════════════════════════════════════════════
  // AGENT DETECTION REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Agent Detection ===
  rewritten = rewritten.replace(/\beverything\s+happens\s+for\s+a\s+reason\b/gi, "events have causes, though not necessarily purposes");
  rewritten = rewritten.replace(/\bthere\s+(?:are\s+)?no\s+coincidences?\b/gi, "this could be a coincidence or have an explanation");
  rewritten = rewritten.replace(/\bit(?:'s|\s+is)\s+no\s+(?:accident|coincidence)\b/gi, "this may or may not be coincidental");
  rewritten = rewritten.replace(/\bit\s+was\s+meant\s+to\s+(?:be|happen)\b/gi, "this is how events unfolded");
  rewritten = rewritten.replace(/\bthings\s+happen\s+for\s+a\s+reason\b/gi, "events have causes");
  rewritten = rewritten.replace(/\bnothing\s+(?:is|happens)\s+by\s+(?:chance|accident)\b/gi, "many events have identifiable causes, while some involve chance");
  rewritten = rewritten.replace(/\b(?:there\s+)?must\s+be\s+a\s+reason\b/gi, "there may be an explanation");
  rewritten = rewritten.replace(/\bsomeone\s+(?:or\s+something\s+)?is\s+behind\b/gi, "there may be an explanation for");

  // === Hebrew: Agent Detection ===
  rewritten = rewritten.replace(/הכל\s+קורה\s+מסיבה/gi, "לאירועים יש גורמים, אם כי לאו דווקא מטרות");
  rewritten = rewritten.replace(/(?:אין|לא\s+קיימים)\s+(?:מקרים|צירופי\s+מקרים)/gi, "זה יכול להיות צירוף מקרים או שיש הסבר");
  rewritten = rewritten.replace(/זה\s+(?:לא\s+מקרי|לא\s+במקרה)/gi, "זה עשוי להיות מקרי או לא");
  rewritten = rewritten.replace(/זה\s+היה\s+(?:אמור|צריך)\s+לקרות/gi, "כך האירועים התפתחו");
  rewritten = rewritten.replace(/(?:בטח|חייב)\s+(?:יש|שיש)\s+סיבה/gi, "ייתכן שיש הסבר");
  rewritten = rewritten.replace(/שום\s+דבר\s+לא\s+(?:קורה\s+)?במקרה/gi, "לאירועים רבים יש גורמים, אך חלקם מקריים");
  rewritten = rewritten.replace(/מישהו\s+(?:עומד\s+)?מאחורי\s+(?:זה|הכל)/gi, "ייתכן שיש הסבר ל");

  // ═══════════════════════════════════════════════════════════════════
  // NARRATIVE FALLACY REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Narrative Fallacy ===
  rewritten = rewritten.replace(/\bthe\s+story\s+of\s+my\s+life\b/gi, "events in my life");
  rewritten = rewritten.replace(/\bmy\s+(?:life\s+)?journey\b/gi, "my experiences so far");
  rewritten = rewritten.replace(/\b(?:new|next)\s+chapter\s+(?:in|of)\s+(?:my|life)\b/gi, "a new phase I'm entering");
  rewritten = rewritten.replace(/\bhero(?:'s)?\s+(?:journey|story)\b/gi, "personal development process");
  rewritten = rewritten.replace(/\bplot\s+twist\s+in\s+(?:my|life)\b/gi, "unexpected event");

  // === Hebrew: Narrative Fallacy ===
  rewritten = rewritten.replace(/הסיפור\s+של\s+(?:חיי|החיים\s+שלי)/gi, "אירועים בחיי");
  rewritten = rewritten.replace(/(?:פרק\s+חדש|פרק\s+הבא)\s+ב(?:חיי|חיים)/gi, "שלב חדש שאני נכנס אליו");
  rewritten = rewritten.replace(/המסע\s+שלי/gi, "החוויות שלי עד כה");
  rewritten = rewritten.replace(/גיבור\s+(?:הסיפור|החיים)\s+שלי/gi, "התפתחות אישית שלי");
  rewritten = rewritten.replace(/(?:טוויסט|תפנית)\s+(?:בסיפור|בחיים)/gi, "אירוע בלתי צפוי");

  // ═══════════════════════════════════════════════════════════════════
  // ESSENTIALISM REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Essentialism ===
  rewritten = rewritten.replace(/\bthat(?:'s| is)\s+(?:just\s+)?(?:who|how)\s+I\s+am\b/gi, "this is how I currently behave");
  rewritten = rewritten.replace(/\bI\s+(?:was\s+)?born\s+(?:this\s+way|like\s+this)\b/gi, "I developed these patterns early");
  rewritten = rewritten.replace(/\bit(?:'s| is)\s+in\s+my\s+(?:nature|DNA|genes)\b/gi, "I have a strong tendency toward this");
  rewritten = rewritten.replace(/\bI(?:'ve| have)\s+always\s+been\s+(?:this\s+way|like\s+this)\b/gi, "I've behaved this way for a long time");
  rewritten = rewritten.replace(/\bpeople\s+(?:don't|never)\s+(?:really\s+)?change\b/gi, "changing behavior patterns takes effort");

  // === Hebrew: Essentialism ===
  rewritten = rewritten.replace(/זה\s+(?:פשוט\s+)?מי\s+שאני/gi, "כך אני מתנהג כרגע");
  rewritten = rewritten.replace(/ככה\s+(?:אני|נולדתי)/gi, "פיתחתי את הדפוסים האלה מוקדם");
  rewritten = rewritten.replace(/זה\s+ב(?:דנ"א|טבע|דם)\s+שלי/gi, "יש לי נטייה חזקה לזה");
  rewritten = rewritten.replace(/תמיד\s+הייתי\s+(?:ככה|כזה)/gi, "התנהגתי ככה הרבה זמן");
  rewritten = rewritten.replace(/אנשים\s+לא\s+(?:באמת\s+)?משתנים/gi, "שינוי דפוסי התנהגות דורש מאמץ");

  // ═══════════════════════════════════════════════════════════════════
  // VICTIM NARRATIVE REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Victim Narrative ===
  rewritten = rewritten.replace(/\bthey\s+always\s+do\s+this\s+to\s+me\b/gi, "this situation has happened before");
  rewritten = rewritten.replace(/\bnothing\s+(?:ever|good)\s+(?:works|happens)\s+(?:for|to)\s+me\b/gi, "I've had difficulty achieving this");
  rewritten = rewritten.replace(/\beveryone\s+is\s+(?:against|out\s+to\s+get)\s+me\b/gi, "I'm experiencing conflict with multiple people");
  rewritten = rewritten.replace(/\bI(?:'m| am)\s+(?:always\s+)?the\s+victim\b/gi, "I've been harmed in this situation");
  rewritten = rewritten.replace(/\bwhy\s+does\s+this\s+(?:always|only)\s+happen\s+to\s+me\b/gi, "this difficult situation is recurring");

  // === Hebrew: Victim Narrative ===
  rewritten = rewritten.replace(/תמיד\s+(?:עושים|מתייחסים)\s+(?:אלי|לי)\s+(?:ככה|כך)/gi, "המצב הזה קרה בעבר");
  rewritten = rewritten.replace(/(?:אף\s+פעם|שום\s+דבר)\s+לא\s+(?:יוצא|עובד|מצליח)\s+לי/gi, "אני נתקל בקושי להשיג את זה");
  rewritten = rewritten.replace(/(?:כולם|העולם)\s+נגדי/gi, "אני חווה קונפליקט עם כמה אנשים");
  rewritten = rewritten.replace(/אני\s+(?:תמיד\s+)?הקורבן/gi, "נפגעתי במצב הזה");
  rewritten = rewritten.replace(/למה\s+(?:תמיד\s+)?(?:זה|דברים)\s+קורים\s+(?:דווקא\s+)?לי/gi, "המצב הקשה הזה חוזר על עצמו");

  // ═══════════════════════════════════════════════════════════════════
  // HINDSIGHT BIAS REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Hindsight Bias ===
  rewritten = rewritten.replace(/\bI\s+knew\s+(?:it|this)\s+(?:would|was\s+going\s+to)\b/gi, "looking back, there were signs that");
  rewritten = rewritten.replace(/\b(?:it\s+)?was\s+(?:so\s+)?obvious\b/gi, "in retrospect, it seems clearer");
  rewritten = rewritten.replace(/\bI\s+should\s+have\s+(?:known|seen\s+it\s+coming)\b/gi, "with hindsight, I can see patterns");
  rewritten = rewritten.replace(/\bthe\s+(?:signs|writing)\s+(?:were|was)\s+(?:all\s+)?there\b/gi, "looking back, there were indicators");

  // === Hebrew: Hindsight Bias ===
  rewritten = rewritten.replace(/ידעתי\s+(?:שזה|שככה)\s+(?:יקרה|יהיה)/gi, "במבט לאחור, היו סימנים ש");
  rewritten = rewritten.replace(/(?:היה\s+)?ברור\s+(?:מראש|מההתחלה)/gi, "בדיעבד זה נראה ברור יותר");
  rewritten = rewritten.replace(/הייתי\s+(?:צריך|אמור)\s+לדעת/gi, "במבט לאחור אני רואה דפוסים");
  rewritten = rewritten.replace(/הסימנים\s+היו\s+(?:שם|ברורים)/gi, "במבט לאחור היו אינדיקציות");

  // ═══════════════════════════════════════════════════════════════════
  // MAGICAL THINKING REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Magical Thinking ===
  rewritten = rewritten.replace(/\b(?:the\s+)?law\s+of\s+attraction\b/gi, "the belief that thoughts influence outcomes");
  rewritten = rewritten.replace(/\bI(?:'m| am)\s+manifesting\b/gi, "I'm focusing on what I want");
  rewritten = rewritten.replace(/\bI\s+(?:attracted|manifested)\s+(?:this|it)\b/gi, "this outcome occurred");
  rewritten = rewritten.replace(/\bpositive\s+(?:thinking|thoughts?)\s+(?:will|can)\s+(?:bring|attract)\b/gi, "optimism may help motivation toward");
  rewritten = rewritten.replace(/\bthe\s+universe\s+(?:will\s+)?(?:provide|deliver)\b/gi, "circumstances may develop such that");

  // === Hebrew: Magical Thinking ===
  rewritten = rewritten.replace(/חוק\s+המשיכה/gi, "האמונה שמחשבות משפיעות על תוצאות");
  rewritten = rewritten.replace(/(?:אני\s+)?(?:ממניפסט|מגשים)/gi, "אני מתמקד במה שאני רוצה");
  rewritten = rewritten.replace(/משכתי\s+(?:את\s+)?(?:זה|הדבר)/gi, "התוצאה הזו קרתה");
  rewritten = rewritten.replace(/(?:מחשבה|אנרגיה)\s+חיובית\s+(?:תביא|תמשוך)/gi, "אופטימיות עשויה לעזור למוטיבציה לכיוון");
  rewritten = rewritten.replace(/היקום\s+(?:יספק|ייתן|יביא)/gi, "נסיבות עשויות להתפתח כך ש");

  // ═══════════════════════════════════════════════════════════════════
  // SIGNS/OMENS REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Signs/Omens ===
  rewritten = rewritten.replace(/\b(?:it(?:'s| is)|that(?:'s| is))\s+a\s+sign\b/gi, "this is a notable coincidence");
  rewritten = rewritten.replace(/\bthe\s+(?:signs|universe)\s+(?:is|are)\s+(?:telling|showing)\s+me\b/gi, "I'm noticing patterns that suggest");
  rewritten = rewritten.replace(/\bI\s+(?:saw|got|received)\s+a\s+sign\b/gi, "I noticed something that felt meaningful");
  rewritten = rewritten.replace(/\b(?:it|this)\s+(?:must\s+)?mean\s+something\b/gi, "I'm interpreting this as significant");

  // === Hebrew: Signs/Omens ===
  rewritten = rewritten.replace(/זה\s+סימן/gi, "זה צירוף מקרים בולט");
  rewritten = rewritten.replace(/(?:היקום|העולם)\s+(?:שולח|נותן)\s+לי\s+(?:סימן|מסר)/gi, "אני מבחין בדפוסים שמרמזים");
  rewritten = rewritten.replace(/(?:ראיתי|קיבלתי)\s+סימן/gi, "שמתי לב למשהו שהרגיש משמעותי");
  rewritten = rewritten.replace(/זה\s+(?:בטח|חייב)\s+(?:אומר|מסמן)\s+משהו/gi, "אני מפרש את זה כמשמעותי");

  // ═══════════════════════════════════════════════════════════════════
  // PURPOSE QUESTION REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Purpose Questions ===
  rewritten = rewritten.replace(/\bwhy\s+(?:is\s+this\s+happening|did\s+this\s+happen)\s+to\s+me\b/gi, "what are the causes of this situation");
  rewritten = rewritten.replace(/\bwhat(?:'s| is)\s+the\s+(?:purpose|meaning)\s+of\s+(?:this|all\s+this)\b/gi, "how can I understand this situation");
  rewritten = rewritten.replace(/\bwhat\s+(?:am\s+I|are\s+we)\s+(?:supposed|meant)\s+to\s+learn\b/gi, "what insights might come from this");
  rewritten = rewritten.replace(/\bwhy\s+me\b/gi, "what factors led to this");

  // === Hebrew: Purpose Questions ===
  rewritten = rewritten.replace(/למה\s+(?:זה|דווקא)\s+(?:קורה|קרה)\s+לי/gi, "מהם הגורמים למצב הזה");
  rewritten = rewritten.replace(/מה\s+(?:המטרה|המשמעות)\s+(?:של\s+)?(?:זה|כל\s+זה)/gi, "איך אני יכול להבין את המצב");
  rewritten = rewritten.replace(/מה\s+אני\s+(?:אמור|צריך)\s+ללמוד\s+(?:מזה|מהמצב)/gi, "אילו תובנות עשויות לצמוח מזה");
  rewritten = rewritten.replace(/למה\s+(?:דווקא\s+)?אני/gi, "אילו גורמים הובילו לזה");

  // ═══════════════════════════════════════════════════════════════════
  // EMOTION PERSONIFICATION REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Emotion Personification ===
  rewritten = rewritten.replace(/\bmy\s+(?:fear|anxiety|depression)\s+(?:tells?|says?)\b/gi, "when I feel anxious, I tend to think");
  rewritten = rewritten.replace(/\b(?:fear|anxiety|depression)\s+(?:is\s+)?lying\b/gi, "anxious thoughts may distort reality");
  rewritten = rewritten.replace(/\b(?:fear|anxiety|depression)\s+(?:won't|doesn't)\s+let\s+me\b/gi, "I'm having difficulty due to anxiety");
  rewritten = rewritten.replace(/\b(?:my\s+)?inner\s+(?:critic|voice)\s+(?:says?|tells?)\b/gi, "I have self-critical thoughts that");

  // === Hebrew: Emotion Personification ===
  rewritten = rewritten.replace(/(?:הפחד|החרדה|הדיכאון)\s+(?:שלי\s+)?(?:אומר|רוצה)/gi, "כשאני מרגיש חרדה, אני נוטה לחשוב");
  rewritten = rewritten.replace(/(?:הפחד|החרדה|הדיכאון)\s+משקר/gi, "מחשבות חרדתיות עשויות לעוות את המציאות");
  rewritten = rewritten.replace(/(?:הפחד|החרדה|הדיכאון)\s+לא\s+(?:נותן|מרשה)\s+לי/gi, "אני מתקשה בגלל חרדה");
  rewritten = rewritten.replace(/(?:הקול|המבקר)\s+הפנימי\s+(?:שלי\s+)?(?:אומר|רוצה)/gi, "יש לי מחשבות ביקורתיות עצמיות ש");

  // ═══════════════════════════════════════════════════════════════════
  // TIME TELEOLOGY REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Time Teleology ===
  rewritten = rewritten.replace(/\btime\s+(?:will\s+)?(?:tell|show|prove)\b/gi, "we'll see how things develop");
  rewritten = rewritten.replace(/\btime\s+heals?\s+(?:all\s+)?(?:wounds?)?\b/gi, "emotional processing takes time");
  rewritten = rewritten.replace(/\bgive\s+it\s+time\b/gi, "allow time for processing");
  rewritten = rewritten.replace(/\bonly\s+time\s+(?:will\s+)?(?:tell|know)\b/gi, "the outcome will become clear later");

  // === Hebrew: Time Teleology ===
  rewritten = rewritten.replace(/הזמן\s+(?:יגיד|יראה|יוכיח)/gi, "נראה איך הדברים יתפתחו");
  rewritten = rewritten.replace(/הזמן\s+(?:ירפא|מרפא)/gi, "עיבוד רגשי לוקח זמן");
  rewritten = rewritten.replace(/(?:תן|תני)\s+לזמן/gi, "אפשר זמן לעיבוד");
  rewritten = rewritten.replace(/רק\s+הזמן\s+(?:יגיד|יודע)/gi, "התוצאה תתברר בהמשך");

  // ═══════════════════════════════════════════════════════════════════
  // DESTINY LANGUAGE REWRITES
  // ═══════════════════════════════════════════════════════════════════

  // === English: Destiny Language ===
  rewritten = rewritten.replace(/\bI(?:'m| am|was)\s+(?:destined|fated)\s+(?:to|for)\b/gi, "I have a strong inclination toward");
  rewritten = rewritten.replace(/\b(?:it(?:'s| is)|this\s+is)\s+my\s+(?:destiny|fate|calling)\b/gi, "I feel strongly drawn to this");
  rewritten = rewritten.replace(/\bmeant\s+to\s+be\b/gi, "how things turned out");
  rewritten = rewritten.replace(/\bmeant\s+for\s+(?:me|each\s+other)\b/gi, "well-suited for");
  rewritten = rewritten.replace(/\b(?:it|this)\s+was\s+(?:written|predetermined)\b/gi, "this is how events unfolded");
  rewritten = rewritten.replace(/\bfate\s+(?:brought|led)\s+(?:us|me)\b/gi, "circumstances led to");

  // === Hebrew: Destiny Language ===
  rewritten = rewritten.replace(/(?:אני\s+)?נועד(?:תי)?\s+ל/gi, "יש לי נטייה חזקה ל");
  rewritten = rewritten.replace(/זה\s+(?:הגורל|היעוד|הייעוד)\s+שלי/gi, "אני מרגיש משיכה חזקה לזה");
  rewritten = rewritten.replace(/(?:היינו\s+)?אמורים\s+(?:להיפגש|למצוא)/gi, "הנסיבות הובילו אותנו ל");
  rewritten = rewritten.replace(/(?:זה\s+)?היה\s+(?:כתוב|נקבע\s+מראש)/gi, "כך האירועים התפתחו");
  rewritten = rewritten.replace(/הגורל\s+(?:הפגיש|הוביל)\s+(?:אותנו|אותי)/gi, "הנסיבות הובילו את");

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
