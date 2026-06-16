import { useState } from "react";
import BookForm from "./components/client/BookForm.js";
import UsageForm from "./components/client/UsageForm.js";
import PlanChangeForm from "./components/client/PlanChangeForm.js";
import LifecycleForm from "./components/client/LifecycleForm.js";
import InvoiceForm from "./components/admin/InvoiceForm.js";

type Role      = "client" | "admin";
type ClientTab = "book" | "usage" | "plan-change" | "lifecycle";
type AdminTab  = "invoice" | "digest";

const CLIENT_TABS: { id: ClientTab; label: string; available: boolean }[] = [
  { id: "book",        label: "Book & Subscribe",  available: true  },
  { id: "usage",       label: "Report Usage",       available: true  },
  { id: "plan-change", label: "Plan Change",        available: true  },
  { id: "lifecycle",   label: "Lifecycle",          available: true  },
];

const ADMIN_TABS: { id: AdminTab; label: string; available: boolean }[] = [
  { id: "invoice", label: "Issue Invoice", available: true  },
  { id: "digest",  label: "Activity Digest", available: false },
];

export default function App() {
  const [role, setRole]           = useState<Role>("client");
  const [clientTab, setClientTab] = useState<ClientTab>("book");
  const [adminTab, setAdminTab]   = useState<AdminTab>("invoice");

  // Admin credentials — entered once and held in component state
  const [adminUser, setAdminUser]         = useState("admin");
  const [adminPassword, setAdminPassword] = useState("");

  return (
    <div className="shell">
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
          <h1>MeterMate</h1>
          <span className="subtitle">Billing Concierge</span>
        </div>
        <div className="role-switcher">
          <button
            className={role === "client" ? "active" : ""}
            onClick={() => setRole("client")}
          >
            Client
          </button>
          <button
            className={role === "admin" ? "active" : ""}
            onClick={() => setRole("admin")}
          >
            Admin
          </button>
        </div>
      </header>

      <main className="main">
        {role === "client" && (
          <div style={{ width: "100%", maxWidth: 680 }}>
            <nav className="client-nav">
              {CLIENT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={clientTab === tab.id ? "active" : ""}
                  disabled={!tab.available}
                  onClick={() => setClientTab(tab.id)}
                  title={!tab.available ? "Coming in a future use case" : undefined}
                >
                  {tab.label}
                  {!tab.available && (
                    <span style={{ marginLeft: 4, fontSize: "0.68rem", opacity: 0.6 }}>soon</span>
                  )}
                </button>
              ))}
            </nav>

            {clientTab === "book"        && <BookForm />}
            {clientTab === "usage"       && <UsageForm />}
            {clientTab === "plan-change" && <PlanChangeForm />}
            {clientTab === "lifecycle"   && <LifecycleForm />}
          </div>
        )}

        {role === "admin" && (
          <div style={{ width: "100%", maxWidth: 680 }}>
            {/* Credential bar */}
            <div style={{
              background: "#fff",
              border: "1.5px solid #e8ecf0",
              borderRadius: 8,
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#344563", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Admin credentials
              </span>
              <input
                type="text"
                placeholder="Username"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                style={{ border: "1.5px solid #dfe1e6", borderRadius: 4, padding: "0.35rem 0.6rem", fontSize: "0.82rem", width: 110 }}
              />
              <input
                type="password"
                placeholder="Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                style={{ border: "1.5px solid #dfe1e6", borderRadius: 4, padding: "0.35rem 0.6rem", fontSize: "0.82rem", width: 130 }}
              />
              <span style={{ fontSize: "0.72rem", color: "#8f95b2" }}>Sent as Basic Auth on each request</span>
            </div>

            <nav className="admin-nav">
              {ADMIN_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={adminTab === tab.id ? "active" : ""}
                  disabled={!tab.available}
                  onClick={() => setAdminTab(tab.id)}
                  title={!tab.available ? "Coming in UC6" : undefined}
                >
                  {tab.label}
                  {!tab.available && (
                    <span style={{ marginLeft: 4, fontSize: "0.68rem", opacity: 0.6 }}>soon</span>
                  )}
                </button>
              ))}
            </nav>

            {adminTab === "invoice" && (
              <InvoiceForm adminUser={adminUser} adminPassword={adminPassword} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
