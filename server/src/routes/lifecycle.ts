import { Router } from "express";
import { lifecycleSchema } from "../schemas/lifecycleSchema.js";
import { sessionStore } from "../stores/sessionStore.js";
import { transactionStore } from "../stores/transactionStore.js";
import { maxioService } from "../services/maxioService.js";
import { slackService } from "../services/slackService.js";
import {
  buildLifecycleCompleteBlocks,
  buildFailureBlocks,
} from "../services/slackBuilders.js";

export const lifecycleRouter = Router();

lifecycleRouter.post("/api/lifecycle", async (req, res): Promise<void> => {
  // 1. Validate
  const parsed = lifecycleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "invalid", error: parsed.error.flatten() });
    return;
  }

  const { sessionId, txnRef, action, cancelType, reasonCode } = parsed.data;

  if (action === "cancel" && !cancelType) {
    res.status(400).json({ status: "invalid", error: "cancelType is required when action is 'cancel'" });
    return;
  }

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
  const fromState = txn.state ?? "unknown";
  const actionLabel = action === "cancel"
    ? `cancel (${cancelType})`
    : action;

  // 4. Post in-progress
  await slackService.postMessage(
    channelId,
    `:vertical_traffic_light: ${actionLabel} in progress…`,
    [],
  );

  // 5. Drive Maxio
  try {
    const result = await maxioService.lifecycleAction({
      subscriptionId: txn.subscriptionId,
      action,
      cancelType,
      reasonCode,
    });

    transactionStore.update(txnRef, { state: result.state === "active" ? "completed" : "completed" });

    const effectiveDate =
      result.canceledAt
        ? new Date(result.canceledAt).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
          })
        : result.resumesAt
        ? new Date(result.resumesAt).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
          })
        : "Immediately";

    await slackService.postMessage(
      channelId,
      `:vertical_traffic_light: ${fromState} → ${result.state}`,
      buildLifecycleCompleteBlocks({
        action: actionLabel,
        fromState,
        toState: result.state,
        reasonCode,
        effectiveDate,
      }),
    );

    res.status(200).json({
      status: "ok",
      txnId: txnRef,
      channelId,
      channelName: txn.channelName,
      action,
      cancelType,
      fromState,
      toState: result.state,
      effectiveDate,
      canceledAt: result.canceledAt,
      resumesAt: result.resumesAt,
    });
  } catch (err) {
    const errorSummary = err instanceof Error ? err.message : String(err);
    console.error("[lifecycle] Maxio error:", err);

    await slackService.postMessage(
      channelId,
      `:warning: Lifecycle action failed`,
      buildFailureBlocks(`Lifecycle (${actionLabel})`, errorSummary),
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
