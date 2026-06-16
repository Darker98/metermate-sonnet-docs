import { Router } from "express";
import { adminGuard } from "../auth.js";
import { invoicesSchema } from "../schemas/invoicesSchema.js";
import { sessionStore } from "../stores/sessionStore.js";
import { transactionStore } from "../stores/transactionStore.js";
import { maxioService } from "../services/maxioService.js";
import { slackService } from "../services/slackService.js";
import {
  buildInvoiceIssuedBlocks,
  buildFailureBlocks,
} from "../services/slackBuilders.js";

export const invoicesRouter = Router();

invoicesRouter.post("/api/invoices", adminGuard, async (req, res): Promise<void> => {
  // 1. Validate
  const parsed = invoicesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "invalid", error: parsed.error.flatten() });
    return;
  }

  const { sessionId, txnRef, lineItems, memo, sendEmail } = parsed.data;

  // 2. Resolve transaction
  const txn = transactionStore.get(txnRef);
  if (!txn) {
    res.status(404).json({ status: "invalid", error: `Transaction not found: ${txnRef}` });
    return;
  }
  if (!txn.subscriptionId) {
    res.status(409).json({ status: "invalid", error: "Transaction has no active subscription" });
    return;
  }

  // 3. Touch session
  if (sessionStore.get(sessionId)) sessionStore.put(sessionId, {});

  const channelId = txn.channelId ?? "";

  // 4. Post in-progress
  await slackService.postMessage(
    channelId,
    ":receipt: Issuing invoice…",
    [],
  );

  // 5. Drive Maxio
  try {
    const result = await maxioService.createAndIssueInvoice({
      subscriptionId: txn.subscriptionId,
      clientEmail: txn.clientEmail,
      lineItems,
      memo,
      sendEmail,
    });

    sessionStore.put(sessionId, { lastResult: result });

    const formattedDueDate = result.dueDate
      ? new Date(result.dueDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "N/A";

    await slackService.postMessage(
      channelId,
      ":receipt: Invoice issued",
      buildInvoiceIssuedBlocks({
        invoiceNumber: result.invoiceNumber,
        status: result.status,
        totalAmount: result.totalAmount,
        dueAmount: result.dueAmount,
        dueDate: formattedDueDate,
        publicUrl: result.publicUrl,
        emailSent: result.emailSent,
      }),
    );

    res.status(201).json({
      status: "ok",
      txnId: txnRef,
      channelId,
      channelName: txn.channelName,
      invoiceUid: result.uid,
      invoiceNumber: result.invoiceNumber,
      invoiceStatus: result.status,
      totalAmount: result.totalAmount,
      dueAmount: result.dueAmount,
      dueDate: result.dueDate,
      publicUrl: result.publicUrl,
      emailSent: result.emailSent,
    });
  } catch (err) {
    const errorSummary = err instanceof Error ? err.message : String(err);
    console.error("[invoices] error:", err);

    await slackService.postMessage(
      channelId,
      ":warning: Invoice failed",
      buildFailureBlocks("Invoice", errorSummary),
    );

    res.status(200).json({
      status: "maxio_failed",
      txnId: txnRef,
      channelId,
      channelName: txn.channelName,
      error: errorSummary,
    });
  }
});
