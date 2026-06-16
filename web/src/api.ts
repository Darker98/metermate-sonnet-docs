const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

// ── Meta ────────────────────────────────────────────────────────────────────

export interface Consultant {
  id: string;
  name: string;
}

export interface Product {
  handle: string;
  name: string;
  priceInCents: string;
}

export async function getConsultants(): Promise<Consultant[]> {
  const data = await get<{ consultants: Consultant[] }>("/consultants");
  return data.consultants;
}

export async function getProducts(): Promise<Product[]> {
  const data = await get<{ products: Product[] }>("/products");
  return data.products;
}

// ── UC1: Book & Subscribe ────────────────────────────────────────────────────

export interface BookPayload {
  sessionId: string;
  firstName: string;
  lastName: string;
  email: string;
  consultantId: string;
  productHandle: string;
  collectionMethod: "automatic" | "remittance";
  couponCode?: string;
}

export type BookStatus = "ok" | "maxio_failed" | "invalid" | "session_expired";

export interface BookResponse {
  status: BookStatus;
  txnId?: string;
  channelId?: string;
  channelName?: string;
  subscriptionId?: number;
  state?: string;
  planName?: string;
  planHandle?: string;
  mrrCents?: string;
  nextAssessmentAt?: string;
  customerName?: string;
  customerEmail?: string;
  error?: string | Record<string, unknown>;
}

export async function bookSubscription(payload: BookPayload): Promise<BookResponse> {
  return post<BookResponse>("/book", payload);
}
