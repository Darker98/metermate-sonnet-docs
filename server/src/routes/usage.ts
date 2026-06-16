import { Router } from "express";
import { usageSchema } from "../schemas/usageSchema.js";
import { sessionStore } from "../stores/sessionStore.js";
import { transactionStore } from "../stores/transactionStore.js";
import { maxioService } from "../services/maxioService.js";
import { slackService } from "../services/slackService.js";
import {
  buildUsageProgressBlocks,
  buildUsageCompleteBlocks,
  buildFailureBlocks,
} from "../services/slackBuilders.js";

export const usageRouter = Router();

usageRouter.post("/api/usage", async (req, res): Promise<void> => {
  // 1. Validate
  const parsed = usageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "invalid", error: parsed.error.flatten() });
    return;
  }

  const { sessionId, txnRef, componentHandle, quantity, memo, timestamp } = parsed.data;

  // 2. Resolve transaction
  const txn = transactionStore.get(txnRef);
  if (!txn) {
    res.status(404).json({ status: "invalid", error: `Transaction not found: ${txnRef}` });
    return;
  }

  if (!txn.subscriptionId) {
    res.status(409).json({
      status: "invalid",
      error: "Transaction has no active subscription — complete UC1 first",
    });
    return;
  }

  // 3. Touch session
  if (sessionStore.get(sessionId)) {
    sessionStore.put(sessionId, {});
  }

  const channelId = txn.channelId ?? "";

  // 4. Post progress
  await slackService.postMessage(
    channelId,
    `:bar_chart: Recording ${quantity} unit(s) of ${componentHandle}…`,
    buildUsageProgressBlocks(componentHandle, quantity),
  );

  // 5. Drive Maxio
  try {
    const result = await maxioService.recordUsage({
      subscriptionId: txn.subscriptionId,
      componentHandle,
      quantity,
      memo,
      timestamp,
    });

    sessionStore.put(sessionId, { lastResult: result });

    await slackService.postMessage(
      channelId,
      ":white_check_mark: Usage recorded",
      buildUsageCompleteBlocks({
        componentHandle: result.componentHandle,
        quantity: result.quantity,
        periodTotal: result.periodTotal,
        memo,
      }),
    );

    res.status(200).json({
      status: "ok",
      txnId: txnRef,
      channelId,
      channelName: txn.channelName,
      usageId: result.usageId.toString(),
      quantity: result.quantity,
      periodTotal: result.periodTotal,
      componentHandle: result.componentHandle,
    });
  } catch (err) {
    const errorSummary = err instanceof Error ? err.message : String(err);
    console.error("[usage] Maxio error:", err);

    await slackService.postMessage(
      channelId,
      ":warning: Usage recording failed",
      buildFailureBlocks("Usage recording", errorSummary),
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
