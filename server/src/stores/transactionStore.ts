import type {
  Transaction,
  TxnId,
  TxnType,
  TxnState,
  ConsultantId,
  ClientEmail,
  ChannelId,
} from "../types.js";

let seq = 0;

function newTxnId(): TxnId {
  return `txn-${Date.now()}-${(++seq).toString().padStart(4, "0")}`;
}

const txnStore = new Map<TxnId, Transaction>();

// (consultantId + clientEmail) → channel info — powers channel reuse
const channelMap = new Map<
  string,
  { channelId: ChannelId; channelName: string }
>();

function channelKey(consultantId: ConsultantId, clientEmail: ClientEmail): string {
  return `${consultantId}::${clientEmail.toLowerCase()}`;
}

type CreateTxnInput = {
  consultantId: ConsultantId;
  clientEmail: ClientEmail;
  type: TxnType;
  state: TxnState;
  subscriptionId?: number;
  channelId?: ChannelId;
  channelName?: string;
};

export const transactionStore = {
  create(data: CreateTxnInput): Transaction {
    const txnId = newTxnId();
    const txn: Transaction = {
      ...data,
      txnId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    txnStore.set(txnId, txn);
    return txn;
  },

  get(txnId: TxnId): Transaction | undefined {
    return txnStore.get(txnId);
  },

  update(
    txnId: TxnId,
    data: Partial<Omit<Transaction, "txnId" | "createdAt">>,
  ): Transaction | undefined {
    const existing = txnStore.get(txnId);
    if (!existing) return undefined;
    const updated: Transaction = { ...existing, ...data, updatedAt: new Date() };
    txnStore.set(txnId, updated);
    return updated;
  },

  getChannel(
    consultantId: ConsultantId,
    clientEmail: ClientEmail,
  ): { channelId: ChannelId; channelName: string } | undefined {
    return channelMap.get(channelKey(consultantId, clientEmail));
  },

  setChannel(
    consultantId: ConsultantId,
    clientEmail: ClientEmail,
    channelId: ChannelId,
    channelName: string,
  ): void {
    channelMap.set(channelKey(consultantId, clientEmail), { channelId, channelName });
  },

  size(): number {
    return txnStore.size;
  },
};
