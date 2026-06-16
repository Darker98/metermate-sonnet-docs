import { useState } from "react";
import BookForm from "./components/client/BookForm.js";

type Role = "client" | "admin";

export default function App() {
  const [role, setRole] = useState<Role>("client");

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
        {role === "client" && <BookForm />}
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
