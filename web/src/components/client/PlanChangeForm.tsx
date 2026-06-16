import { useEffect, useState } from "react";
import {
  getProducts,
  previewPlanChange,
  applyPlanChange,
  type Product,
  type PlanChangePreviewResponse,
  type PlanChangeResponse,
} from "../../api.js";
import { getSessionId, getLastTxnId } from "../../session.js";

function centsToDisplay(centsStr: string | undefined): string {
  if (!centsStr) return "$0.00";
  return "$" + (parseInt(centsStr, 10) / 100).toFixed(2);
}

type Step = "form" | "preview" | "done";

export default function PlanChangeForm() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [txnRef, setTxnRef]         = useState(getLastTxnId);
  const [targetHandle, setTarget]   = useState("");
  const [timing, setTiming]         = useState<"prorate" | "at-renewal">("prorate");
  const [loading, setLoading]       = useState(false);
  const [step, setStep]             = useState<Step>("form");
  const [preview, setPreview]       = useState<PlanChangePreviewResponse | null>(null);
  const [result, setResult]         = useState<PlanChangeResponse | null>(null);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    getProducts().then((ps) => {
      setProducts(ps);
      if (ps.length > 0) setTarget(ps[0]!.handle);
    }).catch(console.error);
  }, []);

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!txnRef.trim()) { alert("Enter a Transaction ID from a completed booking."); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await previewPlanChange({
        sessionId: getSessionId(),
        txnRef: txnRef.trim(),
        targetHandle,
        timing,
      });
      if (res.status === "ok") {
        setPreview(res);
        setStep("preview");
      } else {
        setError(typeof res.error === "string" ? res.error : JSON.stringify(res.error));
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    setLoading(true);
    setError(null);
    try {
      const res = await applyPlanChange({
        sessionId: getSessionId(),
        txnRef: txnRef.trim(),
        targetHandle,
        timing,
      });
      setResult(res);
      setStep("done");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStep("form");
    setPreview(null);
    setResult(null);
    setError(null);
  }

  const isOk = result?.status === "ok";

  return (
    <div className="card">
      <div className="card-header">
        <h2>Plan Change</h2>
        <p>Upgrade or downgrade an active subscription — preview the proration before committing.</p>
      </div>

      <div className="card-body">

        {/* ── Step 1: form ──────────────────────────────────── */}
        {step === "form" && (
          <form onSubmit={handlePreview}>
            <div className="form-grid">

              <div className="field span-2">
                <label>Transaction ID <span style={{ fontWeight: 400, color: "#8f95b2" }}>(txnRef from booking)</span></label>
                <input
                  type="text"
                  placeholder="txn-1234567890-0001"
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  required
                  style={{ fontFamily: "monospace", fontSize: "0.82rem" }}
                />
                {!txnRef && (
                  <span style={{ fontSize: "0.72rem", color: "#e5534b", marginTop: 2 }}>
                    Complete a booking first — the txnId auto-fills from your last booking.
                  </span>
                )}
              </div>

              <div className="field span-2">
                <label>Target Plan</label>
                <select
                  value={targetHandle}
                  onChange={(e) => setTarget(e.target.value)}
                  required
                >
                  {products.length === 0 && <option value="">Loading plans…</option>}
                  {products.map((p) => (
                    <option key={p.handle} value={p.handle}>
                      {p.name} — ${(parseInt(p.priceInCents, 10) / 100).toFixed(0)}/mo
                    </option>
                  ))}
                </select>
              </div>

              <div className="field span-2">
                <label>Timing</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="timing"
                      value="prorate"
                      checked={timing === "prorate"}
                      onChange={() => setTiming("prorate")}
                    />
                    Prorate now
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="timing"
                      value="at-renewal"
                      checked={timing === "at-renewal"}
                      onChange={() => setTiming("at-renewal")}
                    />
                    At renewal
                  </label>
                </div>
                <span style={{ fontSize: "0.75rem", color: "#6b7a99", marginTop: 4 }}>
                  {timing === "prorate"
                    ? "Change applies immediately — prorated delta charged/credited today."
                    : "Change schedules for next billing date — no proration."}
                </span>
              </div>
            </div>

            <div className="actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading
                  ? <><span className="spinner" style={{ marginRight: 8 }} />Fetching preview…</>
                  : "Preview Change"}
              </button>
            </div>

            {error && (
              <div className="result-panel error" style={{ marginTop: "1.5rem" }}>
                <div className="result-header">✕ Preview failed</div>
                <div className="error-text">{error}</div>
              </div>
            )}
          </form>
        )}

        {/* ── Step 2: preview panel ──────────────────────────── */}
        {step === "preview" && preview && (
          <>
            <div className="result-panel success">
              <div className="result-header">
                :mag: Proration preview — review before committing
              </div>
              <div className="result-body">
                <div className="result-field">
                  <label>From Plan</label>
                  <span>{preview.fromPlan ?? "—"}</span>
                </div>
                <div className="result-field">
                  <label>To Plan</label>
                  <span>{preview.toPlan ?? "—"}</span>
                </div>
                <div className="result-field">
                  <label>Timing</label>
                  <span style={{ textTransform: "capitalize" }}>{preview.timing ?? "—"}</span>
                </div>
                <div className="result-field">
                  <label>Prorated Adjustment</label>
                  <span>{centsToDisplay(preview.proratedAdjustmentInCents)}</span>
                </div>
                <div className="result-field">
                  <label>Charge Now</label>
                  <span style={{ fontWeight: 700 }}>{centsToDisplay(preview.chargeInCents)}</span>
                </div>
                <div className="result-field">
                  <label>Payment Due</label>
                  <span>{centsToDisplay(preview.paymentDueInCents)}</span>
                </div>
                <div className="result-field">
                  <label>Credit Applied</label>
                  <span>{centsToDisplay(preview.creditAppliedInCents)}</span>
                </div>
                <div className="result-field">
                  <label>Slack Channel</label>
                  <span className="channel-badge"># {preview.channelName ?? "—"}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="result-panel error" style={{ marginTop: "1rem" }}>
                <div className="result-header">✕ Commit failed</div>
                <div className="error-text">{error}</div>
              </div>
            )}

            <div className="actions" style={{ marginTop: "1.25rem" }}>
              <button
                type="button"
                className="btn-primary"
                disabled={loading}
                onClick={handleCommit}
              >
                {loading
                  ? <><span className="spinner" style={{ marginRight: 8 }} />Applying…</>
                  : "Confirm & Apply"}
              </button>
              <button type="button" className="btn-ghost" onClick={handleReset}>
                Cancel
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: done ──────────────────────────────────── */}
        {step === "done" && result && (
          <>
            <div className={`result-panel ${isOk ? "success" : "error"}`}>
              <div className="result-header">
                {isOk ? "✓ Plan change applied" : "✕ Plan change failed"}
              </div>
              {isOk ? (
                <div className="result-body">
                  <div className="result-field">
                    <label>From Plan</label>
                    <span>{result.fromPlan ?? "—"}</span>
                  </div>
                  <div className="result-field">
                    <label>To Plan</label>
                    <span>{result.toPlan ?? "—"}</span>
                  </div>
                  <div className="result-field">
                    <label>Timing</label>
                    <span style={{ textTransform: "capitalize" }}>{result.timing ?? "—"}</span>
                  </div>
                  <div className="result-field">
                    <label>Effective Date</label>
                    <span>{result.effectiveDate ?? "—"}</span>
                  </div>
                  <div className="result-field">
                    <label>State</label>
                    <span style={{ textTransform: "capitalize" }}>{result.state ?? "—"}</span>
                  </div>
                  <div className="result-field">
                    <label>Slack Channel</label>
                    <span className="channel-badge"># {result.channelName ?? "—"}</span>
                  </div>
                </div>
              ) : (
                <div className="error-text">
                  {typeof result.error === "string"
                    ? result.error
                    : JSON.stringify(result.error, null, 2)}
                </div>
              )}
            </div>

            <div className="actions" style={{ marginTop: "1.25rem" }}>
              <button type="button" className="btn-ghost" onClick={handleReset}>
                Make another change
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
