import { useState } from "react";
import { reportUsage, type UsageResponse } from "../../api.js";
import { getSessionId, getLastTxnId } from "../../session.js";

const COMPONENTS = [
  { handle: "mm-consulting-minutes-mm", label: "Consulting Minutes  ($2.00 / min)" },
  { handle: "mm-api-calls-mm",          label: "API Calls  ($0.01 / call)" },
];

export default function UsageForm() {
  const [txnRef, setTxnRef]                   = useState(getLastTxnId);
  const [componentHandle, setComponentHandle] = useState(COMPONENTS[0]!.handle);
  const [quantity, setQuantity]               = useState("");
  const [memo, setMemo]                       = useState("");
  const [timestamp, setTimestamp]             = useState("");
  const [loading, setLoading]                 = useState(false);
  const [result, setResult]                   = useState<UsageResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (!txnRef.trim()) { alert("Enter a Transaction ID (txnRef from a completed booking)."); return; }
    if (isNaN(qty) || qty <= 0) { alert("Quantity must be a positive number."); return; }

    setLoading(true);
    setResult(null);
    try {
      const res = await reportUsage({
        sessionId: getSessionId(),
        txnRef: txnRef.trim(),
        componentHandle,
        quantity: qty,
        memo: memo.trim() || undefined,
        timestamp: timestamp.trim() || undefined,
      });
      setResult(res);
    } catch (err) {
      setResult({ status: "maxio_failed", error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setQuantity("");
    setMemo("");
    setTimestamp("");
  }

  const isOk     = result?.status === "ok";
  const isFailed = result && result.status !== "ok";

  const selectedComponent = COMPONENTS.find(c => c.handle === componentHandle);

  return (
    <div className="card">
      <div className="card-header">
        <h2>Report Session Usage</h2>
        <p>Record consulting minutes or API calls against an active subscription — accrues to the next invoice.</p>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">

            {/* Transaction reference */}
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

            {/* Component */}
            <div className="field span-2">
              <label>Component</label>
              <select
                value={componentHandle}
                onChange={(e) => setComponentHandle(e.target.value)}
                required
              >
                {COMPONENTS.map((c) => (
                  <option key={c.handle} value={c.handle}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="field">
              <label>
                Quantity&nbsp;
                <span style={{ fontWeight: 400, color: "#8f95b2" }}>
                  ({componentHandle === "mm-consulting-minutes-mm" ? "minutes" : "calls"})
                </span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                placeholder={componentHandle === "mm-consulting-minutes-mm" ? "e.g. 30" : "e.g. 500"}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            {/* Estimated charge */}
            <div className="field">
              <label>Estimated Charge</label>
              <input
                type="text"
                readOnly
                value={
                  quantity && !isNaN(parseFloat(quantity))
                    ? (() => {
                        const rate = componentHandle === "mm-consulting-minutes-mm" ? 2.0 : 0.01;
                        return "$" + (parseFloat(quantity) * rate).toFixed(2);
                      })()
                    : "—"
                }
                style={{ background: "#f4f5f7", color: "#344563", fontWeight: 600 }}
              />
            </div>

            {/* Memo */}
            <div className="field span-2">
              <label>Memo <span style={{ fontWeight: 400, color: "#8f95b2" }}>(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Strategy session, Q2 batch import"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>

            {/* Timestamp */}
            <div className="field span-2">
              <label>Timestamp <span style={{ fontWeight: 400, color: "#8f95b2" }}>(optional — ISO 8601)</span></label>
              <input
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
              />
            </div>
          </div>

          <div className="actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ marginRight: 8 }} />Recording…</>
                : "Record Usage"}
            </button>
            {result && (
              <button type="button" className="btn-ghost" onClick={handleReset}>
                Record another
              </button>
            )}
          </div>
        </form>

        {/* Success result */}
        {isOk && result && (
          <div className="result-panel success">
            <div className="result-header">
              ✓ Usage recorded — accrues to next invoice
            </div>
            <div className="result-body">
              <div className="result-field">
                <label>Slack Channel</label>
                <span className="channel-badge"># {result.channelName ?? "—"}</span>
              </div>
              <div className="result-field">
                <label>Usage ID</label>
                <span>{result.usageId ?? "—"}</span>
              </div>
              <div className="result-field">
                <label>Component</label>
                <span>{result.componentHandle ?? selectedComponent?.handle}</span>
              </div>
              <div className="result-field">
                <label>Quantity Recorded</label>
                <span>{result.quantity ?? "—"}</span>
              </div>
              <div className="result-field">
                <label>Period Total</label>
                <span>{result.periodTotal ?? "—"}</span>
              </div>
              <div className="result-field">
                <label>Billing</label>
                <span>Accrues to next invoice</span>
              </div>
            </div>
          </div>
        )}

        {isFailed && result && (
          <div className="result-panel error">
            <div className="result-header">
              ✕ {result.status === "invalid" ? "Validation error" : "Usage recording failed"}
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
