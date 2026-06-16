import { useState } from "react";
import {
  triggerLifecycle,
  type LifecycleResponse,
} from "../../api.js";
import { getSessionId, getLastTxnId } from "../../session.js";

type Action = "pause" | "resume" | "cancel" | "reactivate";
type CancelType = "immediate" | "end-of-period";

const ACTIONS: { value: Action; label: string; description: string }[] = [
  { value: "pause",      label: "Pause",       description: "Place the subscription on hold — no billing until resumed." },
  { value: "resume",     label: "Resume",       description: "Resume a paused subscription from the hold state." },
  { value: "cancel",     label: "Cancel",       description: "Cancel the subscription immediately or at end of period." },
  { value: "reactivate", label: "Reactivate",   description: "Reactivate a previously canceled subscription." },
];

export default function LifecycleForm() {
  const [txnRef, setTxnRef]           = useState(getLastTxnId);
  const [action, setAction]           = useState<Action>("pause");
  const [cancelType, setCancelType]   = useState<CancelType>("end-of-period");
  const [reasonCode, setReasonCode]   = useState("");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<LifecycleResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!txnRef.trim()) { alert("Enter a Transaction ID from a completed booking."); return; }

    setLoading(true);
    setResult(null);
    try {
      const res = await triggerLifecycle({
        sessionId: getSessionId(),
        txnRef: txnRef.trim(),
        action,
        cancelType: action === "cancel" ? cancelType : undefined,
        reasonCode: reasonCode.trim() || undefined,
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
    setReasonCode("");
  }

  const isOk     = result?.status === "ok";
  const isFailed = result && result.status !== "ok";
  const selectedAction = ACTIONS.find((a) => a.value === action);

  return (
    <div className="card">
      <div className="card-header">
        <h2>Lifecycle Control</h2>
        <p>Pause, resume, cancel, or reactivate an active subscription.</p>
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

            {/* Action */}
            <div className="field span-2">
              <label>Action</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                {ACTIONS.map((a) => (
                  <label
                    key={a.value}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      padding: "0.65rem 0.8rem",
                      border: `1.5px solid ${action === a.value ? "#4c6ef5" : "#dfe1e6"}`,
                      borderRadius: 6,
                      cursor: "pointer",
                      background: action === a.value ? "#f0f3ff" : "#fff",
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                  >
                    <input
                      type="radio"
                      name="action"
                      value={a.value}
                      checked={action === a.value}
                      onChange={() => setAction(a.value)}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#172b4d" }}>{a.label}</div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7a99", marginTop: 2 }}>{a.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Cancel type — only shown when action is cancel */}
            {action === "cancel" && (
              <div className="field span-2">
                <label>Cancellation Timing</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="cancelType"
                      value="immediate"
                      checked={cancelType === "immediate"}
                      onChange={() => setCancelType("immediate")}
                    />
                    Immediate
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="cancelType"
                      value="end-of-period"
                      checked={cancelType === "end-of-period"}
                      onChange={() => setCancelType("end-of-period")}
                    />
                    End of billing period
                  </label>
                </div>
                <span style={{ fontSize: "0.75rem", color: "#6b7a99", marginTop: 4 }}>
                  {cancelType === "immediate"
                    ? "Subscription canceled right now — no further charges."
                    : "Subscription stays active until the current period ends, then cancels."}
                </span>
              </div>
            )}

            {/* Reason code */}
            <div className="field span-2">
              <label>Reason Code <span style={{ fontWeight: 400, color: "#8f95b2" }}>(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. customer_request, non_payment"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
              />
            </div>
          </div>

          <div className="actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ marginRight: 8 }} />Processing…</>
                : `${selectedAction?.label ?? "Submit"} Subscription`}
            </button>
            {result && (
              <button type="button" className="btn-ghost" onClick={handleReset}>
                Another action
              </button>
            )}
          </div>
        </form>

        {/* Success result */}
        {isOk && result && (
          <div className="result-panel success">
            <div className="result-header">
              ✓ {result.action ?? action} applied
            </div>
            <div className="result-body">
              <div className="result-field">
                <label>Action</label>
                <span style={{ textTransform: "capitalize" }}>{result.action ?? "—"}</span>
              </div>
              <div className="result-field">
                <label>State Transition</label>
                <span>
                  <span style={{ color: "#6b7a99" }}>{result.fromState ?? "—"}</span>
                  {" → "}
                  <strong>{result.toState ?? "—"}</strong>
                </span>
              </div>
              <div className="result-field">
                <label>Effective</label>
                <span>{result.effectiveDate ?? "—"}</span>
              </div>
              <div className="result-field">
                <label>Slack Channel</label>
                <span className="channel-badge"># {result.channelName ?? "—"}</span>
              </div>
              {result.cancelType && (
                <div className="result-field">
                  <label>Cancel Type</label>
                  <span style={{ textTransform: "capitalize" }}>{result.cancelType}</span>
                </div>
              )}
              <div className="result-field">
                <label>Transaction ID</label>
                <span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{result.txnId ?? "—"}</span>
              </div>
            </div>
          </div>
        )}

        {isFailed && result && (
          <div className="result-panel error">
            <div className="result-header">
              ✕ {result.status === "invalid" ? "Validation error" : "Action failed"}
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
