import type { SessionData, SessionId } from "../types.js";
import { config } from "../config.js";

const store = new Map<SessionId, SessionData>();

setInterval(() => {
  const cutoff = Date.now() - config.app.sessionTtlMinutes * 60 * 1000;
  for (const [id, s] of store) {
    if (s.updatedAt.getTime() < cutoff) store.delete(id);
  }
}, 5 * 60 * 1000).unref();

export const sessionStore = {
  get(id: SessionId): SessionData | undefined {
    return store.get(id);
  },

  ensure(id: SessionId): SessionData {
    let s = store.get(id);
    if (!s) {
      s = { sessionId: id, createdAt: new Date(), updatedAt: new Date() };
      store.set(id, s);
    }
    return s;
  },

  put(id: SessionId, data: Partial<Omit<SessionData, "sessionId" | "createdAt">>): SessionData {
    const existing = this.ensure(id);
    const updated: SessionData = { ...existing, ...data, updatedAt: new Date() };
    store.set(id, updated);
    return updated;
  },

  delete(id: SessionId): void {
    store.delete(id);
  },

  isExpired(id: SessionId): boolean {
    const s = store.get(id);
    if (!s) return true;
    const cutoff = Date.now() - config.app.sessionTtlMinutes * 60 * 1000;
    return s.updatedAt.getTime() < cutoff;
  },

  size(): number {
    return store.size;
  },
};
