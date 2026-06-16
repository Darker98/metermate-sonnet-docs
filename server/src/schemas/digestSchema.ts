import { z } from "zod";

export const digestSchema = z.object({
  sessionId: z.string().min(1),
  consultantId: z.string().min(1, "consultantId is required"),
  windowDays: z.number().int().positive().default(30),
});

export type DigestInput = z.infer<typeof digestSchema>;
