"use client";

import { useState } from "react";

type TeleologyAnalysis = {
  teleologyScore: number;
  teleologyType: string | null;
  manipulationRisk: string;
  detectedPhrases: string[];
  purposeClaim?: string | null;
  neutralCausalParaphrase?: string | null;
};

type TeleologyDecision = {
  action: "allow" | "annotate" | "warn" | "block";
  reason: string;
};

type FirewallResult = {
  decision: TeleologyDecision;
  analysis: TeleologyAnalysis;
  error?: string;
};

export default function TeleologyDemo() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<FirewallResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log("[Honestra][teleology-demo] Sending request with text:", text);
      const res = await fetch("/api/firewall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      console.log("[Honestra][teleology-demo] Response status:", res.status);
      const data = await res.json();
      console.log("[Honestra][teleology-demo] Response data:", JSON.stringify(data, null, 2));

      if (!res.ok) {
        setError(data?.error || "Request failed");
        return;
      }

      const firewallResult = data as FirewallResult;
      setResult(firewallResult);
    } catch (err: any) {
      console.error("[Honestra][teleology-demo] error", err);
      setError("Unexpected error while calling the API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <label style={{ marginTop: "0.5rem", display: "block" }}>
        Text to analyze:
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='e.g. "This war is happening so that our nation will be purified."'
        />
      </label>

      <div style={{ marginTop: "0.75rem" }}>
        <button onClick={handleAnalyze} disabled={loading || !text.trim()}>
          {loading ? "Analyzing..." : "Run firewall check"}
        </button>
      </div>

      {error && (
        <p style={{ marginTop: "1rem", color: "red" }}>
          Error: {error}
        </p>
      )}

      {result && !error && (
        <section style={{ marginTop: "1rem" }}>
          <div style={{ 
            borderRadius: "0.75rem", 
            border: "1px solid rgba(16, 185, 129, 0.4)", 
            backgroundColor: "rgba(16, 185, 129, 0.1)", 
            padding: "0.75rem 1rem", 
            marginBottom: "1rem" 
          }}>
            <div style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.25rem" }}>
              Firewall decision:{" "}
              <span style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {result.decision.action}
              </span>
            </div>
            <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "rgba(209, 250, 229, 0.8)" }}>
              {result.decision.reason}
            </p>
          </div>

          <div style={{ 
            borderRadius: "0.75rem", 
            border: "1px solid rgba(63, 63, 70, 1)", 
            backgroundColor: "rgba(39, 39, 42, 0.6)", 
            padding: "1rem", 
            display: "flex", 
            flexDirection: "column", 
            gap: "0.5rem", 
            fontSize: "0.875rem" 
          }}>
            <div>
              <span style={{ fontWeight: "500" }}>Teleology score:</span>{" "}
              {result.analysis.teleologyScore.toFixed(2)}
            </div>
            <div>
              <span style={{ fontWeight: "500" }}>Type:</span>{" "}
              {result.analysis.teleologyType ?? "none"}
            </div>
            <div>
              <span style={{ fontWeight: "500" }}>Manipulation risk:</span>{" "}
              {result.analysis.manipulationRisk}
            </div>
            {result.analysis.detectedPhrases.length > 0 && (
              <div>
                <span style={{ fontWeight: "500" }}>Detected phrases:</span>{" "}
                {result.analysis.detectedPhrases.join(", ")}
              </div>
            )}
            {result.analysis.purposeClaim && (
              <div>
                <span style={{ fontWeight: "500" }}>Purpose story:</span>{" "}
                {result.analysis.purposeClaim}
              </div>
            )}
            {result.analysis.neutralCausalParaphrase && (
              <div>
                <span style={{ fontWeight: "500" }}>Causal paraphrase:</span>{" "}
                {result.analysis.neutralCausalParaphrase}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}

