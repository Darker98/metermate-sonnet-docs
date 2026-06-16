import { useState } from "react";
import {
  issueInvoice,
  type InvoiceLineItem,
  type InvoiceResponse,
} from "../../api.js";
import { getSessionId, getLastTxnId } from "../../session.js";

interface AdminProps {
  adminUser: string;
  adminPassword: string;
}

function emptyLineItem(): InvoiceLineItem {
  return { title: "", quantity: "1", unitPrice: "", description: "" };
}

function formatDate(iso: string): string {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function InvoiceForm({ adminUser, adminPassword }: AdminProps) {
  const [txnRef, setTxnRef]           = useState(getLastTxnId);
  const [lineItems, setLineItems]     = useState<InvoiceLineItem[]>([emptyLineItem()]);
  const [memo, setMemo]               = useState("");
  const [sendEmail, setSendEmail]     = useState(true);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<InvoiceResponse | null>(null);

  function updateItem(index: number, field: keyof InvoiceLineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function addItem() {
    setLineItems((prev) => [...prev, emptyLineItem()]);
  }

  function removeItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  // Filter out incomplete line items before submitting
  function validLineItems(): InvoiceLineItem[] | undefined {
    const filled = lineItems.filter((item) => item.title.trim() && item.unitPrice.trim());
    return filled.length > 0 ? filled : undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!txnRef.trim()) { alert("Enter a Transaction ID."); return; }

    setLoading(true);
    setResult(null);
    try {
      const res = await issueInvoice({
        sessionId: getSessionId(),
        txnRef: txnRef.trim(),
        lineItems: validLineItems(),
        memo: memo.trim() || undefined,
        sendEmail,
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

  function handleReset() {
    setResult(null);
    setLineItems([emptyLineItem()]);
    setMemo("");
    setSendEmail(true);
  }

  const isOk     = result?.status === "ok";
  const isFailed = result && result.status !== "ok";

  return (
    <div className="card">
      <div className="card-header">
        <h2>Issue Invoice</h2>
        <p>Create and issue an on-demand invoice for a subscription — posts a Pay Invoice link to the Slack channel.</p>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit}>
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
            </div>

            {/* Line items */}
            <div className="field span-2">
              <label>Line Items <span style={{ fontWeight: 400, color: "#8f95b2" }}>(optional — leave blank to use subscription charges)</span></label>
              <table className="line-items-table">
                <thead>
                  <tr>
                    <th style={{ width: "35%" }}>Title</th>
                    <th style={{ width: "12%" }}>Qty</th>
                    <th style={{ width: "15%" }}>Unit Price ($)</th>
                    <th style={{ width: "30%" }}>Description</th>
                    <th style={{ width: "8%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          type="text"
                          placeholder="e.g. Strategy session"
                          value={item.title}
                          onChange={(e) => updateItem(i, "title", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, "quantity", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="500.00"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="Optional note"
                          value={item.description ?? ""}
                          onChange={(e) => updateItem(i, "description", e.target.value)}
                        />
                      </td>
                      <td>
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            className="btn-small danger"
                            onClick={() => removeItem(i)}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="btn-small" onClick={addItem}>
                + Add line item
              </button>
            </div>

            {/* Memo */}
            <div className="field span-2">
              <label>Memo <span style={{ fontWeight: 400, color: "#8f95b2" }}>(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Q2 consulting services"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>

            {/* Send email */}
            <div className="field span-2">
              <label>Email to Client</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="sendEmail"
                    checked={sendEmail}
                    onChange={() => setSendEmail(true)}
                  />
                  Yes — send invoice email
                </label>
                <label>
                  <input
                    type="radio"
                    name="sendEmail"
                    checked={!sendEmail}
                    onChange={() => setSendEmail(false)}
                  />
                  No — issue only
                </label>
              </div>
            </div>
          </div>

          <div className="actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ marginRight: 8 }} />Issuing…</>
                : "Issue Invoice"}
            </button>
            {result && (
              <button type="button" className="btn-ghost" onClick={handleReset}>
                New invoice
              </button>
            )}
          </div>
        </form>

        {isOk && result && (
          <div className="result-panel success">
            <div className="result-header">✓ Invoice issued</div>
            <div className="result-body">
              <div className="result-field">
                <label>Invoice #</label>
                <span>{result.invoiceNumber ?? "—"}</span>
              </div>
              <div className="result-field">
                <label>Status</label>
                <span style={{ textTransform: "capitalize" }}>{result.invoiceStatus ?? "—"}</span>
              </div>
              <div className="result-field">
                <label>Total</label>
                <span>${result.totalAmount ?? "0.00"}</span>
              </div>
              <div className="result-field">
                <label>Amount Due</label>
                <span style={{ fontWeight: 700 }}>${result.dueAmount ?? "0.00"}</span>
              </div>
              <div className="result-field">
                <label>Due Date</label>
                <span>{result.dueDate ? formatDate(result.dueDate) : "N/A"}</span>
              </div>
              <div className="result-field">
                <label>Email Sent</label>
                <span>{result.emailSent ? "Yes" : "No"}</span>
              </div>
              <div className="result-field">
                <label>Slack Channel</label>
                <span className="channel-badge"># {result.channelName ?? "—"}</span>
              </div>
              {result.publicUrl && (
                <div className="result-field span-2" style={{ gridColumn: "1 / -1" }}>
                  <label>Hosted Payment URL</label>
                  <a
                    href={result.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      padding: "0.45rem 1rem",
                      background: "#4c6ef5",
                      color: "#fff",
                      borderRadius: 5,
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Pay Invoice →
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {isFailed && result && (
          <div className="result-panel error">
            <div className="result-header">
              ✕ {result.status === "invalid" ? "Validation error" : "Invoice failed"}
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
