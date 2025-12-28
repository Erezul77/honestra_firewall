import { NextRequest, NextResponse } from "next/server";

// Import from Honestra's own lib folder
import { analyzeTeleology } from "../../../lib/teleologyEngine";
import { evaluateTeleologyPolicy } from "../../../lib/teleologyPolicy";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const textRaw = body?.text ?? "";
    const text = String(textRaw);

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Missing 'text' field in request body." },
        { status: 400 }
      );
    }

    const analysis = await analyzeTeleology(text);
    const decision = evaluateTeleologyPolicy(analysis);

    return NextResponse.json({
      decision,
      analysis,
    });
  } catch (err) {
    console.error("[/api/firewall] Teleology firewall error:", err);
    return NextResponse.json(
      { error: "Internal error in teleology firewall." },
      { status: 500 }
    );
  }
}

