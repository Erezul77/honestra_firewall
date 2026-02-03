// app/page.tsx
import React from "react";

export default function HonestraLandingPage() {
  return (
    <main className="honestra-root">
      <div className="honestra-shell">
        {/* HEADER */}
        <header className="honestra-header">
          <div className="honestra-logo-block">
            <div className="honestra-logo-circle">
              <img
                src="/Logo/Honestra_logo.png"
                alt="Honestra shield logo"
                className="honestra-logo-img"
              />
            </div>
            <div className="honestra-wordmark">
              <span className="honestra-name">Honestra</span>
              <span className="honestra-tagline">
                Firewall for Teleological Narratives
              </span>
            </div>
          </div>

          <div className="honestra-header-cta-group">
            <a
              href="/downloads/honestra-extension-v0.1.zip"
              download
              target="_blank"
              rel="noopener noreferrer"
              className="honestra-btn honestra-btn-primary"
            >
              ⬇ Download Extension
            </a>
            <a
              href="https://github.com/Erezul77/Anti-Teleology"
              target="_blank"
              rel="noreferrer"
              className="honestra-btn honestra-btn-ghost"
            >
              View Guard Engine &amp; API
            </a>
          </div>
        </header>

        {/* HERO ROW */}
        <section className="honestra-hero-row">
          <div className="honestra-hero-card">
            <h1 className="honestra-hero-title">
              Clean explanations from <span>dirty teleology.</span>
            </h1>
            <p className="honestra-hero-lead">
              Honestra watches AI explanations and system messages for a very
              specific failure mode: when impersonal mechanisms are described as
              if they <em>want</em>, <em>intend</em>, <em>punish</em> or{" "}
              <em>guide</em>.
            </p>

            <p className="honestra-body-text">
              It detects anthropomorphic and cosmic–purpose language in English
              and Hebrew, flags severity, and can suggest neutral, causal
              rewrites. For longer texts it also scores{" "}
              <strong>teleology density</strong> and{" "}
              <strong>infiltration</strong> – how deeply teleology shapes the
              overall narrative.
            </p>

            <ul className="honestra-bullets">
              <li>Bilingual: English + Hebrew rule–based guard.</li>
              <li>
                No black–box "feeling" scores – explicit patterns and reasons.
              </li>
              <li>
                Designed for AI labs, safety teams and critical interfaces.
              </li>
            </ul>

            <div className="honestra-inline-ctas">
              <a
                href="/downloads/honestra-extension-v0.1.zip"
                download
                target="_blank"
                rel="noopener noreferrer"
                className="honestra-btn honestra-btn-primary"
              >
                <span>⬇</span>
                <span>Download Honestra Chrome Extension (.zip)</span>
              </a>
              <a
                href="https://github.com/Erezul77/HonestraChromeExtension/releases"
                target="_blank"
                rel="noreferrer"
                className="honestra-text-link"
              >
                View on GitHub
              </a>
            </div>
          </div>

          {/* DOCUMENT MODE CARD */}
          <aside className="honestra-doc-card">
            <h2 className="honestra-doc-label">Document mode</h2>
            <h3 className="honestra-doc-title">
              Teleology density &amp; infiltration for long texts
            </h3>
            <p className="honestra-body-text">
              Paste or select a full policy, spec, or FAQ. Honestra breaks it
              into sentences, scores teleology density, and estimates how deeply
              the teleological framing penetrates the overall meaning.
            </p>

            <div className="honestra-doc-metrics">
              <div className="honestra-doc-metric-row">
                <div>
                  <div className="honestra-doc-metric-label">
                    Teleology Density (T%)
                  </div>
                  <div className="honestra-doc-metric-note">
                    Fraction of teleological sentences.
                  </div>
                </div>
              </div>
              <div className="honestra-doc-metric-row">
                <div>
                  <div className="honestra-doc-metric-label">
                    Infiltration Score
                  </div>
                  <div className="honestra-doc-metric-note">
                    Low / medium / high impact on meaning.
                  </div>
                </div>
              </div>
              <div className="honestra-doc-metric-row">
                <div>
                  <div className="honestra-doc-metric-label">
                    Document Status
                  </div>
                  <div className="honestra-doc-metric-note">
                    globally_clean · mixed · globally_teleological
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* FLAGS + HOW TO START */}
        <section className="honestra-two-col">
          <div className="honestra-card">
            <h2 className="honestra-section-title">What Honestra flags</h2>

            <h3 className="honestra-flag-heading">Anthropomorphism</h3>
            <p className="honestra-flag-example">
              "The model wants to help you" → rewritten as "the model is
              configured to respond to your request".
            </p>

            <h3 className="honestra-flag-heading">Cosmic purpose</h3>
            <p className="honestra-flag-example">
              "The universe is guiding this answer" → rewritten as "these events
              follow from prior causes in the system".
            </p>

            <h3 className="honestra-flag-heading">Moralised systems</h3>
            <p className="honestra-flag-example">
              "The algorithm is punishing you" → rewritten as "this rule reduces
              your access based on clear conditions".
            </p>
          </div>

          <div className="honestra-card honestra-card-right">
            <h2 className="honestra-section-title">How to start</h2>
            <ol className="honestra-steps">
              <li>
                <a
                  href="/downloads/honestra-extension-v0.1.zip"
                  download
                  className="honestra-text-link"
                >
                  Download the Honestra Chrome Extension
                </a>{" "}
                (.zip file).
              </li>
              <li>
                Extract the ZIP and load it via{" "}
                <span className="honestra-inline-code">
                  chrome://extensions
                </span>{" "}
                (Developer Mode → Load unpacked).
              </li>
              <li>
                Right–click any AI output →{" "}
                <span className="honestra-inline-code">
                  "Analyze with Honestra Guard"
                </span>
                .
              </li>
              <li>
                For backend/API integration, use the guard engine in{" "}
                <a
                  href="https://github.com/Erezul77/Anti-Teleology"
                  target="_blank"
                  rel="noreferrer"
                  className="honestra-text-link"
                >
                  Anti-Teleology · Honestra
                </a>
                .
              </li>
            </ol>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="honestra-footer">
          <span className="honestra-footer-text">
            Built for clarity, not comfort: teleology-aware safety tooling for
            the AI stack.
          </span>
        </footer>
      </div>
    </main>
  );
}
