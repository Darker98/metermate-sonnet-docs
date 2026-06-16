import { useEffect, useState } from "react";
import {
  getConsultants,
  getProducts,
  bookSubscription,
  type Consultant,
  type Product,
  type BookResponse,
} from "../../api.js";
import { getSessionId } from "../../session.js";

function formatMrr(centsStr: string): string {
  const dollars = parseInt(centsStr, 10) / 100;
  return "$" + dollars.toFixed(2) + "/mo";
}

function formatDate(iso: string): string {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BookForm() {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BookResponse | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [consultantId, setConsultantId] = useState("");
  const [productHandle, setProductHandle] = useState("");
  const [collectionMethod, setCollectionMethod] = useState<"automatic" | "remittance">("remittance");
  const [couponCode, setCouponCode] = useState("");

  useEffect(() => {
    getConsultants().then((cs) => {
      setConsultants(cs);
      if (cs.length > 0) setConsultantId(cs[0]!.id);
    }).catch(console.error);

    getProducts().then((ps) => {
      setProducts(ps);
      if (ps.length > 0) setProductHandle(ps[0]!.handle);
    }).catch(console.error);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await bookSubscription({
        sessionId: getSessionId(),
        firstName,
        lastName,
        email,
        consultantId,
        productHandle,
        collectionMethod,
        couponCode: couponCode.trim() || undefined,
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
    setFirstName("");
    setLastName("");
    setEmail("");
    setCouponCode("");
    if (consultants.length > 0) setConsultantId(consultants[0]!.id);
    if (products.length > 0) setProductHandle(products[0]!.handle);
    setCollectionMethod("remittance");
  }

  const isOk = result?.status === "ok";
  const isFailed = result && result.status !== "ok";

  return (
    <div className="card">
      <div className="card-header">
        <h2>Book &amp; Subscribe</h2>
        <p>Enroll a client on a plan — creates a Maxio subscription and opens a private Slack channel.</p>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Client name */}
            <div className="field">
              <label>First Name</label>
              <input
                type="text"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Last Name</label>
              <input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            {/* Client email */}
            <div className="field span-2">
              <label>Client Email</label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Consultant */}
            <div className="field">
              <label>Consultant</label>
              <select
                value={consultantId}
                onChange={(e) => setConsultantId(e.target.value)}
                required
              >
                {consultants.length === 0 && (
                  <option value="">Loading…</option>
                )}
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Plan */}
            <div className="field">
              <label>Plan</label>
              <select
                value={productHandle}
                onChange={(e) => setProductHandle(e.target.value)}
                required
              >
                {products.length === 0 && (
                  <option value="">No plans — check Maxio config</option>
                )}
                {products.map((p) => (
                  <option key={p.handle} value={p.handle}>
                    {p.name} — ${(parseInt(p.priceInCents, 10) / 100).toFixed(0)}/mo
                  </option>
                ))}
              </select>
            </div>

            {/* Collection method */}
            <div className="field span-2">
              <label>Payment Collection</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="collectionMethod"
                    value="remittance"
                    checked={collectionMethod === "remittance"}
                    onChange={() => setCollectionMethod("remittance")}
                  />
                  Remittance (invoice)
                </label>
                <label>
                  <input
                    type="radio"
                    name="collectionMethod"
                    value="automatic"
                    checked={collectionMethod === "automatic"}
                    onChange={() => setCollectionMethod("automatic")}
                  />
                  Automatic (card on file)
                </label>
              </div>
            </div>

            {/* Coupon code */}
            <div className="field span-2">
              <label>Coupon Code <span style={{ fontWeight: 400, color: "#8f95b2" }}>(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. WELCOME20"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
            </div>
          </div>

          <div className="actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ marginRight: 8 }} />Creating subscription…</> : "Book & Subscribe"}
            </button>
            {result && (
              <button type="button" className="btn-ghost" onClick={handleReset}>
                New booking
              </button>
            )}
          </div>
        </form>

        {/* Result panel */}
        {isOk && result && (
          <div className="result-panel success">
            <div className="result-header">
              ✓ Subscription active — Slack channel opened
            </div>
            <div className="result-body">
              <div className="result-field">
                <label>Slack Channel</label>
                <span className="channel-badge">
                  # {result.channelName ?? "—"}
                </span>
              </div>
              <div className="result-field">
                <label>Transaction ID</label>
                <span>{result.txnId ?? "—"}</span>
              </div>
              <div className="result-field">
                <label>Customer</label>
                <span>{result.customerName ?? "—"}</span>
              </div>
              <div className="result-field">
                <label>Plan</label>
                <span>{result.planName ?? "—"}</span>
              </div>
              <div className="result-field">
                <label>MRR</label>
                <span>{result.mrrCents ? formatMrr(result.mrrCents) : "—"}</span>
              </div>
              <div className="result-field">
                <label>State</label>
                <span style={{ textTransform: "capitalize" }}>{result.state ?? "—"}</span>
              </div>
              <div className="result-field">
                <label>Next Bill</label>
                <span>{result.nextAssessmentAt ? formatDate(result.nextAssessmentAt) : "—"}</span>
              </div>
              <div className="result-field">
                <label>Subscription ID</label>
                <span>{result.subscriptionId ?? "—"}</span>
              </div>
            </div>
          </div>
        )}

        {isFailed && result && (
          <div className="result-panel error">
            <div className="result-header">
              ✕ {result.status === "invalid" ? "Validation error" : "Booking failed"}
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
