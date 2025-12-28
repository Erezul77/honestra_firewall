"use client";

import React, { useState } from "react";

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
};

type Post = {
  id: string;
  text: string;
  status: "idle" | "checking" | "checked" | "error";
  result?: FirewallResult;
  error?: string;
};

const seededPosts: Post[] = [
  {
    id: "1",
    text: "This war is happening so that our nation will finally wake up and become pure.",
    status: "idle",
  },
  {
    id: "2",
    text: "I feel like life keeps punishing me for my past mistakes, like everything is meant to teach me a lesson.",
    status: "idle",
  },
  {
    id: "3",
    text: "The climate crisis is the result of decades of policy failures and economic incentives. We need to change how we produce energy and food.",
    status: "idle",
  },
];

function badgeClasses(action: TeleologyDecision["action"]): string {
  switch (action) {
    case "allow":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-500/40";
    case "annotate":
      return "bg-sky-500/15 text-sky-200 border-sky-500/40";
    case "warn":
      return "bg-amber-500/15 text-amber-200 border-amber-500/40";
    case "block":
      return "bg-rose-500/15 text-rose-200 border-rose-500/40";
    default:
      return "bg-zinc-800 text-zinc-200 border-zinc-700";
  }
}

export function FeedFirewallDemo() {
  const [posts, setPosts] = useState<Post[]>(seededPosts);
  const [draft, setDraft] = useState("");
  const [isBulkChecking, setIsBulkChecking] = useState(false);

  async function runFirewallForPost(id: string) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "checking", error: undefined } : p
      )
    );

    const post = posts.find((p) => p.id === id);
    if (!post) return;

    try {
      const res = await fetch("/api/firewall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: post.text }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Firewall request failed");
      }

      const data = (await res.json()) as FirewallResult;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: "checked",
                result: data,
              }
            : p
        )
      );
    } catch (err: any) {
      console.error("Firewall error:", err);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: "error",
                error: "Firewall check failed",
              }
            : p
        )
      );
    }
  }

  async function runFirewallForAll() {
    setIsBulkChecking(true);
    for (const post of posts) {
      // eslint-disable-next-line no-await-in-loop
      await runFirewallForPost(post.id);
    }
    setIsBulkChecking(false);
  }

  function addPost() {
    const text = draft.trim();
    if (!text) return;
    const newPost: Post = {
      id: String(Date.now()),
      text,
      status: "idle",
    };
    setPosts((prev) => [newPost, ...prev]);
    setDraft("");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">
          Moderated Feed – Teleology Firewall Demo
        </h2>
        <p className="text-sm text-zinc-300">
          This simulates a simple feed. Each post is sent through the Honestra
          firewall (<code>/api/firewall</code>), which decides whether to allow,
          annotate, warn, or block based on teleological framing.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a new post here..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          rows={3}
        />
        <div className="flex items-center justify-between">
          <button
            onClick={addPost}
            className="inline-flex items-center rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
          >
            Add post to feed
          </button>
          <button
            onClick={runFirewallForAll}
            disabled={isBulkChecking || posts.length === 0}
            className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
          >
            {isBulkChecking ? "Checking..." : "Run firewall on all posts"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {posts.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No posts yet. Add one above to see the firewall in action.
          </p>
        ) : (
          posts.map((post) => {
            const decision = post.result?.decision;
            const analysis = post.result?.analysis;

            return (
              <div
                key={post.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-zinc-100 whitespace-pre-wrap">
                    {post.text}
                  </p>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => runFirewallForPost(post.id)}
                      disabled={post.status === "checking"}
                      className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] font-medium text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {post.status === "checking"
                        ? "Checking..."
                        : "Check post"}
                    </button>
                    {decision && (
                      <span
                        className={
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                          badgeClasses(decision.action)
                        }
                      >
                        {decision.action}
                      </span>
                    )}
                  </div>
                </div>

                {post.status === "error" && (
                  <p className="text-xs text-rose-300">
                    {post.error ?? "Firewall check failed."}
                  </p>
                )}

                {decision && analysis && (
                  <div className="border-t border-zinc-800 pt-2 text-xs text-zinc-300 space-y-1">
                    <div>
                      <span className="font-medium">Reason:</span>{" "}
                      {decision.reason}
                    </div>
                    <div>
                      <span className="font-medium">
                        Teleology score:
                      </span>{" "}
                      {analysis.teleologyScore.toFixed(2)} (
                      {analysis.teleologyType ?? "none"})
                    </div>
                    <div>
                      <span className="font-medium">
                        Manipulation risk:
                      </span>{" "}
                      {analysis.manipulationRisk}
                    </div>
                    {analysis.detectedPhrases.length > 0 && (
                      <div>
                        <span className="font-medium">
                          Detected phrases:
                        </span>{" "}
                        {analysis.detectedPhrases.join(", ")}
                      </div>
                    )}
                    {analysis.purposeClaim && (
                      <div>
                        <span className="font-medium">
                          Purpose story:
                        </span>{" "}
                        {analysis.purposeClaim}
                      </div>
                    )}
                    {analysis.neutralCausalParaphrase && (
                      <div>
                        <span className="font-medium">
                          Causal paraphrase:
                        </span>{" "}
                        {analysis.neutralCausalParaphrase}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

