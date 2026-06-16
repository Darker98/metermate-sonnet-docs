const SESSION_KEY = "metermate_session_id";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return "sess-" + crypto.randomUUID();
  }
  return "sess-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const LAST_TXN_KEY = "metermate_last_txn_id";

export function saveLastTxnId(txnId: string): void {
  localStorage.setItem(LAST_TXN_KEY, txnId);
}

export function getLastTxnId(): string {
  return localStorage.getItem(LAST_TXN_KEY) ?? "";
}
