import { NextResponse } from "next/server";

// Log at module level to verify file is loaded
console.log("[Honestra][teleology-api] Route file loaded");

// Import Honestra Guard (primary teleology detector)
import { honestraAlertGuard } from "@shared/honestra";
import { analyzeDocumentTeleology } from "@shared/honestraDocument";

console.log("[Honestra][teleology-api] honestraAlertGuard imported:", typeof honestraAlertGuard);
console.log("[Honestra][teleology-api] analyzeDocumentTeleology imported:", typeof analyzeDocumentTeleology);

export async function POST(req: Request) {
  console.log("[Honestra][teleology-api] POST handler called");
  
  try {
    const body = await req.json().catch(() => null);
    
    // Support both 'text' and 'message' field names for robustness
    const textRaw = body?.text ?? body?.message ?? "";
    const text = typeof textRaw === "string" ? textRaw.trim() : "";
    const mode = body?.mode;

    console.log("[Honestra][teleology-api] Received request with text:", text?.substring(0, 100));
    console.log("[Honestra][teleology-api] Mode:", mode);

    if (!text) {
      console.log("[Honestra][teleology-api] Invalid or missing text field");
      return NextResponse.json(
        { error: "Missing 'text' or 'message' field in request body" },
        { status: 400 }
      );
    }

    // Document Mode: analyze multiple sentences for density + infiltration
    if (mode === "document") {
      console.log("[Honestra][teleology-api] Using DOCUMENT mode");
      const docAnalysis = analyzeDocumentTeleology(text);
      console.log("[Honestra][teleology-api] Document analysis:", JSON.stringify(docAnalysis.summary, null, 2));
      return NextResponse.json(docAnalysis, { status: 200 });
    }

    // Default: single-text guard mode (for extension compatibility)
    console.log("[Honestra][teleology-api] Using SINGLE-TEXT guard mode");
    
    // Primary: use Honestra Guard (rule-based + bilingual patterns)
    const guard = honestraAlertGuard(text);
    
    console.log("[Honestra][teleology-api] Guard result:", JSON.stringify(guard, null, 2));

    // Build a stable, extension-friendly payload
    const response = {
      text,
      hasTeleology: guard.hasTeleology,
      teleologyScore: guard.teleologyScore,
      severity: guard.severity || "none",
      reasons: Array.isArray(guard.reasons) ? guard.reasons : [],
      changes: Array.isArray(guard.changes) ? guard.changes : [],
      guardAnalysis: guard
    };

    console.log("[Honestra][teleology-api] Returning response:", JSON.stringify(response, null, 2));

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("[Honestra][teleology-api] Error in /api/teleology:", err);
    console.error("[Honestra][teleology-api] Error stack:", err instanceof Error ? err.stack : String(err));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
