import { z } from "zod";

export const planChangeSchema = z.object({
  sessionId: z.string().min(1),
  txnRef: z.string().min(1, "txnRef is required"),
  targetHandle: z.string().min(1, "targetHandle is required"),
  timing: z.enum(["prorate", "at-renewal"]),
});

export type PlanChangeInput = z.infer<typeof planChangeSchema>;
