import { z } from "zod";

export const usageSchema = z.object({
  sessionId: z.string().min(1),
  txnRef: z.string().min(1, "txnRef is required"),
  componentHandle: z.string().min(1, "componentHandle is required"),
  quantity: z.number().positive("quantity must be a positive number"),
  memo: z.string().optional(),
  timestamp: z.string().optional(), // informational; included in memo
});

export type UsageInput = z.infer<typeof usageSchema>;
