import { z } from "zod";

export const bookSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  firstName: z.string().min(1, "firstName is required"),
  lastName: z.string().min(1, "lastName is required"),
  email: z.string().email("Invalid client email"),
  consultantId: z.string().min(1, "consultantId is required"),
  productHandle: z.string().min(1, "productHandle is required"),
  collectionMethod: z.enum(["automatic", "remittance"]),
  couponCode: z.string().optional(),
});

export type BookInput = z.infer<typeof bookSchema>;
