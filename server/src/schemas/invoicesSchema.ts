import { z } from "zod";

const lineItemSchema = z.object({
  title: z.string().min(1),
  quantity: z.string().min(1),
  unitPrice: z.string().min(1),
  description: z.string().optional(),
});

export const invoicesSchema = z.object({
  sessionId: z.string().min(1),
  txnRef: z.string().min(1, "txnRef is required"),
  lineItems: z.array(lineItemSchema).optional(),
  memo: z.string().optional(),
  sendEmail: z.boolean().default(true),
});

export type InvoicesInput = z.infer<typeof invoicesSchema>;
