import { useState } from "react";
import BookForm from "./components/client/BookForm.js";
import UsageForm from "./components/client/UsageForm.js";
import PlanChangeForm from "./components/client/PlanChangeForm.js";
import LifecycleForm from "./components/client/LifecycleForm.js";

type Role      = "client" | "admin";
type ClientTab = "book" | "usage" | "plan-change" | "lifecycle";

const CLIENT_TABS: { id: ClientTab; label: string; available: boolean }[] = [
  { id: "book",        label: "Book & Subscribe",  available: true  },
  { id: "usage",       label: "Report Usage",       available: true  },
  { id: "plan-change", label: "Plan Change",        available: true  },
  { id: "lifecycle",   label: "Lifecycle",          available: true  },
];

export default function App() {
  const [role, setRole]         = useState<Role>("client");
  const [clientTab, setClientTab] = useState<ClientTab>("book");

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
          <div className="card">
            <div className="card-header">
              <h2>Admin Panel</h2>
              <p>Invoice management and activity digest — coming in subsequent use cases.</p>
            </div>
            <div className="card-body">
              <div className="placeholder">
                <h3>Admin features coming soon</h3>
                <p>UC5 (Invoice Issue) and UC6 (Billing Digest) will appear here.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
