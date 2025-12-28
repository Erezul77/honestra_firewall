import type { TeleologyAnalysis } from "./teleologyEngine";

export type TeleologyAction = "allow" | "annotate" | "warn" | "block";

export interface TeleologyPolicyConfig {
  /** Minimum score at which we start applying a policy instead of "allow". */
  minScoreForPolicy: number;
  /** Score at which high-risk content can become a hard "block". */
  highRiskScore: number;
}

export interface TeleologyDecision {
  action: TeleologyAction;
  reason: string;
}

const defaultConfig: TeleologyPolicyConfig = {
  minScoreForPolicy: 0.2,
  highRiskScore: 0.7,
};

export function evaluateTeleologyPolicy(
  analysis: TeleologyAnalysis,
  config: TeleologyPolicyConfig = defaultConfig
): TeleologyDecision {
  const { teleologyScore: score, teleologyType, manipulationRisk } = analysis;

  // Very low teleology → just let it pass.
  if (score < config.minScoreForPolicy || teleologyType === null || teleologyType === "harmless/weak") {
    return {
      action: "allow",
      reason:
        "Teleology score is low; content can pass without intervention.",
    };
  }

  const isHardFraming =
    teleologyType === "moralistic" ||
    teleologyType === "religious" ||
    teleologyType === "national/ideological";

  // Highest tier: strong teleology + high-risk framing.
  if ((isHardFraming && score >= config.highRiskScore) || manipulationRisk === "high") {
    return {
      action: "block",
      reason:
        "Content uses strong moral or ideological teleology with high manipulation risk; it should be blocked or heavily down-ranked.",
    };
  }

  // Medium tier: non-trivial teleology, but not catastrophic.
  if (isHardFraming || manipulationRisk === "medium") {
    return {
      action: "warn",
      reason:
        "Content uses teleological framing that could mislead or inflame; it should be shown with a warning and reduced reach.",
    };
  }

  // Remaining cases (mostly personal-meaning narratives).
  return {
    action: "annotate",
    reason:
      "Content mainly expresses personal meaning; it should be allowed but annotated with a causal clarification.",
  };
}

