import { FeedFirewallDemo } from "../_components/FeedFirewallDemo";

// Force dynamic rendering to prevent build timeout
export const dynamic = 'force-dynamic';

export default function FeedDemoPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Honestra Feed Firewall Demo
          </h1>
          <p className="text-sm text-zinc-300 max-w-2xl">
            This page shows how a simple social feed could use the Honestra
            teleology firewall to scan posts for purpose-based narratives,
            estimate manipulation risk, and decide whether to allow, annotate,
            warn, or block content.
          </p>
        </header>

        <FeedFirewallDemo />
      </div>
    </main>
  );
}

