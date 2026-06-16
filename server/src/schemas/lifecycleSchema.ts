import { z } from "zod";

export const lifecycleSchema = z.object({
  sessionId: z.string().min(1),
  txnRef: z.string().min(1, "txnRef is required"),
  action: z.enum(["pause", "resume", "cancel", "reactivate"]),
  cancelType: z.enum(["immediate", "end-of-period"]).optional(),
  reasonCode: z.string().optional(),
});

export type LifecycleInput = z.infer<typeof lifecycleSchema>;
