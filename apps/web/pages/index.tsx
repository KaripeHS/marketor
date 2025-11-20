import Head from "next/head";
import type { CSSProperties } from "react";

const cardStyle: CSSProperties = {
  padding: "1.5rem",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.02)",
  backdropFilter: "blur(12px)"
};

export default function Home() {
  return (
    <>
      <Head>
        <title>GrowthPilot AI</title>
      </Head>
      <main style={{ minHeight: "100vh", padding: "2.5rem", maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <p style={{ color: "#8FB2FF", letterSpacing: "0.08em", fontSize: 12, textTransform: "uppercase", margin: 0 }}>
              v0 scaffold
            </p>
            <h1 style={{ margin: "0.4rem 0 0.25rem", fontSize: "2.6rem" }}>GrowthPilot AI</h1>
            <p style={{ margin: 0, maxWidth: 560, color: "#c9d2e3" }}>
              Multi-agent autopilot marketing engine for regulated professionals with human-in-loop safety.
            </p>
          </div>
          <button
            style={{
              borderRadius: 999,
              padding: "0.75rem 1.25rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "linear-gradient(135deg, #6cc6ff, #8b8cff)",
              color: "#0b1021",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Coming soon
          </button>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>What&apos;s here</h3>
            <ul style={{ lineHeight: 1.6, margin: 0, paddingLeft: "1.1rem", color: "#dfe6f5" }}>
              <li>Monorepo scaffold (API, Web, Shared, Docs)</li>
              <li>Implementation plan + compliance/prompt registry placeholders</li>
              <li>Next.js web shell ready for Vercel deployment</li>
              <li>NestJS API bootstrap with health check</li>
            </ul>
          </div>

          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Next milestones</h3>
            <ul style={{ lineHeight: 1.6, margin: 0, paddingLeft: "1.1rem", color: "#dfe6f5" }}>
              <li>Wire auth + tenant models and persistence</li>
              <li>Agent data contracts + prompt registry expansion</li>
              <li>Calendar/review UI and approval flows</li>
              <li>Integrations for publishing and analytics</li>
            </ul>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
          {[
            { title: "Compliance-first", text: "Doctor rulepacks, disclaimers, PII checks, and kill-switches before autopilot." },
            { title: "Human-in-loop", text: "Approvals + revisions by default; autopilot as an explicit toggle per tenant." },
            { title: "Multi-agent", text: "Trend research, strategy, planning, creation, compliance, scheduling, analytics, learning." }
          ].map((item) => (
            <div key={item.title} style={cardStyle}>
              <h4 style={{ marginTop: 0 }}>{item.title}</h4>
              <p style={{ margin: 0, color: "#c9d2e3" }}>{item.text}</p>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
