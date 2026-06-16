import { useEffect, useState } from "react";
import {
  getConsultants,
  triggerDigest,
  type Consultant,
  type DigestResponse,
} from "../../api.js";
import { getSessionId } from "../../session.js";

interface AdminProps {
  adminUser: string;
  adminPassword: string;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red" | "blue";
}) {
  const accentColor =
    accent === "green" ? "#2da44e" :
    accent === "red"   ? "#e5534b" :
    accent === "blue"  ? "#4c6ef5" :
    "#172b4d";

  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid #e8ecf0",
      borderRadius: 8,
      padding: "1rem 1.25rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.2rem",
    }}>
      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6b7a99", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <span style={{ fontSize: "1.5rem", fontWeight: 700, color: accentColor, lineHeight: 1.2 }}>
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: "0.72rem", color: "#8f95b2" }}>{sub}</span>
      )}
    </div>
  );
}

export default function ActivityPanel({ adminUser, adminPassword }: AdminProps) {
  const [consultants, setConsultants]   = useState<Consultant[]>([]);
  const [consultantId, setConsultantId] = useState("");
  const [windowDays, setWindowDays]     = useState("30");
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState<DigestResponse | null>(null);

  useEffect(() => {
    getConsultants().then((cs) => {
      setConsultants(cs);
      if (cs.length > 0) setConsultantId(cs[0]!.id);
    }).catch(console.error);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await triggerDigest({
        sessionId: getSessionId(),
        consultantId,
        windowDays: parseInt(windowDays, 10) || 30,
        adminUser,
        adminPassword,
      });
      setResult(res);
    } catch (err) {
      setResult({ status: "maxio_failed", error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  const isOk     = result?.status === "ok";
  const isFailed = result && result.status !== "ok";

  const mrrDollars = result?.totalMrrCents
    ? (parseInt(result.totalMrrCents, 10) / 100).toFixed(2)
    : null;

  return (
    <div className="card">
      <div className="card-header">
        <h2>Activity Digest</h2>
        <p>Pull a live billing summary for a consultant and post it to the digest Slack channel.</p>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">

            <div className="field">
              <label>Consultant</label>
              <select
                value={consultantId}
                onChange={(e) => setConsultantId(e.target.value)}
                required
              >
                {consultants.length === 0 && <option value="">Loading…</option>}
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Lookback Window <span style={{ fontWeight: 400, color: "#8f95b2" }}>(days)</span></label>
              <select value={windowDays} onChange={(e) => setWindowDays(e.target.value)}>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>
          </div>

          <div className="actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ marginRight: 8 }} />Building digest…</>
                : "Generate Digest"}
            </button>
            {result && (
              <button type="button" className="btn-ghost" onClick={() => setResult(null)}>
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Success — stat grid */}
        {isOk && result && (
          <div style={{ marginTop: "1.5rem" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.75rem",
            }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#344563" }}>
                ✓ Digest posted to Slack
                {result.digestChannel && (
                  <span className="channel-badge" style={{ marginLeft: 8 }}>
                    # {result.digestChannel}
                  </span>
                )}
              </span>
              {result.generatedAt && (
                <span style={{ fontSize: "0.72rem", color: "#8f95b2" }}>
                  {result.generatedAt}
                </span>
              )}
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
            }}>
              <StatCard
                label="Active Subscriptions"
                value={String(result.activeCount ?? 0)}
                accent="green"
              />
              <StatCard
                label="Total MRR"
                value={mrrDollars ? `$${mrrDollars}` : "$0.00"}
                sub="per month"
                accent="blue"
              />
              <StatCard
                label="New Signups"
                value={String(result.newInWindow ?? 0)}
                sub={`last ${result.windowDays} days`}
                accent="green"
              />
              <StatCard
                label="Churn"
                value={String(result.churnInWindow ?? 0)}
                sub={`last ${result.windowDays} days`}
                accent={result.churnInWindow ? "red" : undefined}
              />
              <StatCard
                label="Overdue Invoices"
                value={String(result.overdueInvoiceCount ?? 0)}
                accent={result.overdueInvoiceCount ? "red" : undefined}
              />
              <StatCard
                label="Overdue Amount"
                value={`$${result.overdueAmountDue ?? "0.00"}`}
                accent={result.overdueInvoiceCount ? "red" : undefined}
              />
            </div>

            <p style={{ fontSize: "0.72rem", color: "#8f95b2", marginTop: "0.75rem" }}>
              Reporting data may lag live state slightly. Scoped to subscriptions created in this session.
            </p>
          </div>
        )}

        {isFailed && result && (
          <div className="result-panel error" style={{ marginTop: "1.5rem" }}>
            <div className="result-header">
              ✕ {result.status === "invalid" ? "Validation error" : "Digest failed"}
            </div>
            <div className="error-text">
              {typeof result.error === "string"
                ? result.error
                : JSON.stringify(result.error, null, 2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
