export default function DocsPage() {
  return (
    <main>
      <h1>Honestra Teleology API</h1>
      <p>
        The Honestra Teleology API analyzes text for teleological (purpose-based)
        language patterns. It detects hidden purpose-narratives and provides
        neutral causal paraphrases.
      </p>

      <section style={{ marginTop: "2rem" }}>
        <h2>Endpoint</h2>
        <p>
          <strong>POST</strong> <code>/api/teleology</code>
        </p>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Request</h2>
        <p>Send a JSON body with a <code>text</code> field:</p>
        <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px", overflow: "auto" }}>
          <code>{`{
  "text": "This war is happening so that our nation will be purified."
}`}</code>
        </pre>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Example: cURL</h2>
        <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px", overflow: "auto" }}>
          <code>{`curl -X POST https://honestra.org/api/teleology \\
  -H "Content-Type: application/json" \\
  -d '{"text": "This war is happening so that our nation will be purified."}'`}</code>
        </pre>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Example: JavaScript</h2>
        <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px", overflow: "auto" }}>
          <code>{`const response = await fetch("/api/teleology", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "This war is happening so that our nation will be purified."
  })
});

const analysis = await response.json();`}</code>
        </pre>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Response</h2>
        <p>The API returns a JSON object with the following fields:</p>
        <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px", overflow: "auto" }}>
          <code>{`{
  "teleologyScore": 0.5,
  "teleologyType": "national/ideological",
  "manipulationRisk": "medium",
  "detectedPhrases": ["so that"],
  "purposeClaim": "The war is happening to purify the nation.",
  "neutralCausalParaphrase": "The war is occurring due to historical, political, and social conditions that led to conflict."
}`}</code>
        </pre>

        <ul style={{ marginTop: "1rem" }}>
          <li>
            <strong>teleologyScore</strong> (number): 0.0–1.0, how strongly
            teleological the text is
          </li>
          <li>
            <strong>teleologyType</strong> (string | null): Type of teleology:
            &quot;personal&quot;, &quot;religious&quot;, &quot;national/ideological&quot;,
            &quot;conspiracy&quot;, or null
          </li>
          <li>
            <strong>manipulationRisk</strong> (string): &quot;low&quot;,
            &quot;medium&quot;, or &quot;high&quot;
          </li>
          <li>
            <strong>detectedPhrases</strong> (string[]): Array of detected
            teleological phrases
          </li>
          <li>
            <strong>purposeClaim</strong> (string | null): Short summary of the
            core teleological story, if present
          </li>
          <li>
            <strong>neutralCausalParaphrase</strong> (string | null): Same
            content rewritten in causal terms
          </li>
        </ul>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Teleology Firewall</h2>
        <p>
          <code>POST /api/firewall</code> runs the shared teleology engine and then applies a simple policy to decide how a platform should treat the content.
        </p>
        <p style={{ marginTop: "0.5rem" }}>
          Unlike <code>/api/teleology</code> which returns raw analysis only, <code>/api/firewall</code> includes a policy decision (allow, annotate, warn, or block) based on the analysis results.
        </p>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h3>Firewall Request</h3>
        <p>Send a JSON body with a <code>text</code> field:</p>
        <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px", overflow: "auto" }}>
          <code>{`{
  "text": "This war is happening so that our nation will be purified."
}`}</code>
        </pre>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h3>Firewall Response</h3>
        <p>The API returns a JSON object with both the decision and the analysis:</p>
        <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px", overflow: "auto" }}>
          <code>{`{
  "decision": {
    "action": "block",
    "reason": "Content uses strong moral or ideological teleology with high manipulation risk; it should be blocked or heavily down-ranked."
  },
  "analysis": {
    "teleologyScore": 0.8,
    "teleologyType": "national/ideological",
    "manipulationRisk": "high",
    "detectedPhrases": ["so that"],
    "purposeClaim": "The war is happening to purify the nation.",
    "neutralCausalParaphrase": "The war is occurring due to historical, political, and social conditions that led to conflict."
  }
}`}</code>
        </pre>

        <ul style={{ marginTop: "1rem" }}>
          <li>
            <strong>decision.action</strong> (string): One of &quot;allow&quot;, &quot;annotate&quot;, &quot;warn&quot;, or &quot;block&quot;
          </li>
          <li>
            <strong>decision.reason</strong> (string): Explanation of why this action was chosen
          </li>
          <li>
            <strong>analysis</strong> (object): The full teleology analysis (same structure as <code>/api/teleology</code> response)
          </li>
        </ul>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h3>Example: cURL</h3>
        <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px", overflow: "auto" }}>
          <code>{`curl -X POST https://honestra.org/api/firewall \\
  -H "Content-Type: application/json" \\
  -d '{"text": "This war is happening so that our nation will be purified."}'`}</code>
        </pre>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h3>Example: JavaScript</h3>
        <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px", overflow: "auto" }}>
          <code>{`const response = await fetch("/api/firewall", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "This war is happening so that our nation will be purified."
  })
});

const { decision, analysis } = await response.json();
console.log("Firewall decision:", decision.action);
console.log("Teleology score:", analysis.teleologyScore);`}</code>
        </pre>
      </section>
    </main>
  );
}

