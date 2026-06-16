export type ConsultantId = string;
export type ClientEmail = string;
export type TxnId = string;
export type ChannelId = string;
export type SessionId = string;

export type TxnType =
  | "subscription"
  | "usage"
  | "plan-change"
  | "lifecycle"
  | "invoice";

export type TxnState = "started" | "completed" | "failed";

export interface Transaction {
  txnId: TxnId;
  consultantId: ConsultantId;
  clientEmail: ClientEmail;
  type: TxnType;
  state: TxnState;
  subscriptionId?: number;
  channelId?: ChannelId;
  channelName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionData {
  sessionId: SessionId;
  lastSubmission?: unknown;
  lastResult?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface Consultant {
  id: string;
  name: string;
  email: string;
}

export type ApiStatus =
  | "ok"
  | "maxio_failed"
  | "invalid"
  | "session_expired";
