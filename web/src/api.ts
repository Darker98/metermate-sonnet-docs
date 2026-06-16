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

// ── UC2: Report Usage ────────────────────────────────────────────────────────

export interface UsagePayload {
  sessionId: string;
  txnRef: string;
  componentHandle: string;
  quantity: number;
  memo?: string;
  timestamp?: string;
}

export type UsageStatus = "ok" | "maxio_failed" | "invalid" | "session_expired";

export interface UsageResponse {
  status: UsageStatus;
  txnId?: string;
  channelId?: string;
  channelName?: string;
  usageId?: string;
  quantity?: number;
  periodTotal?: number;
  componentHandle?: string;
  error?: string | Record<string, unknown>;
}

export async function reportUsage(payload: UsagePayload): Promise<UsageResponse> {
  return post<UsageResponse>("/usage", payload);
}

// ── UC3: Plan Change ─────────────────────────────────────────────────────────

export interface PlanChangePayload {
  sessionId: string;
  txnRef: string;
  targetHandle: string;
  timing: "prorate" | "at-renewal";
}

export type PlanChangeStatus = "ok" | "maxio_failed" | "invalid" | "session_expired";

export interface PlanChangePreviewResponse {
  status: PlanChangeStatus;
  txnId?: string;
  channelId?: string;
  channelName?: string;
  fromPlan?: string;
  toPlan?: string;
  timing?: string;
  proratedAdjustmentInCents?: string;
  chargeInCents?: string;
  paymentDueInCents?: string;
  creditAppliedInCents?: string;
  error?: string | Record<string, unknown>;
}

export interface PlanChangeResponse {
  status: PlanChangeStatus;
  txnId?: string;
  channelId?: string;
  channelName?: string;
  fromPlan?: string;
  toPlan?: string;
  toPlanHandle?: string;
  timing?: string;
  effectiveDate?: string;
  state?: string;
  nextAssessmentAt?: string;
  error?: string | Record<string, unknown>;
}

export async function previewPlanChange(payload: PlanChangePayload): Promise<PlanChangePreviewResponse> {
  return post<PlanChangePreviewResponse>("/plan-change/preview", payload);
}

export async function applyPlanChange(payload: PlanChangePayload): Promise<PlanChangeResponse> {
  return post<PlanChangeResponse>("/plan-change", payload);
}

// ── UC4: Lifecycle ───────────────────────────────────────────────────────────

export interface LifecyclePayload {
  sessionId: string;
  txnRef: string;
  action: "pause" | "resume" | "cancel" | "reactivate";
  cancelType?: "immediate" | "end-of-period";
  reasonCode?: string;
}

export type LifecycleStatus = "ok" | "maxio_failed" | "invalid" | "session_expired";

export interface LifecycleResponse {
  status: LifecycleStatus;
  txnId?: string;
  channelId?: string;
  channelName?: string;
  action?: string;
  cancelType?: string;
  fromState?: string;
  toState?: string;
  effectiveDate?: string;
  canceledAt?: string | null;
  resumesAt?: string | null;
  error?: string | Record<string, unknown>;
}

export async function triggerLifecycle(payload: LifecyclePayload): Promise<LifecycleResponse> {
  return post<LifecycleResponse>("/lifecycle", payload);
}

// ── UC5: Invoice Issue + Send ─────────────────────────────────────────────────

export interface InvoiceLineItem {
  title: string;
  quantity: string;
  unitPrice: string;
  description?: string;
}

export interface InvoicePayload {
  sessionId: string;
  txnRef: string;
  lineItems?: InvoiceLineItem[];
  memo?: string;
  sendEmail: boolean;
  adminUser: string;
  adminPassword: string;
}

export type InvoiceStatus = "ok" | "maxio_failed" | "invalid" | "session_expired";

export interface InvoiceResponse {
  status: InvoiceStatus;
  txnId?: string;
  channelId?: string;
  channelName?: string;
  invoiceUid?: string;
  invoiceNumber?: string;
  invoiceStatus?: string;
  totalAmount?: string;
  dueAmount?: string;
  dueDate?: string;
  publicUrl?: string | null;
  emailSent?: boolean;
  error?: string | Record<string, unknown>;
}

export async function issueInvoice(payload: InvoicePayload): Promise<InvoiceResponse> {
  const { adminUser, adminPassword, ...body } = payload;
  const encoded = btoa(`${adminUser}:${adminPassword}`);
  return post<InvoiceResponse>("/invoices", body, {
    Authorization: `Basic ${encoded}`,
  });
}
