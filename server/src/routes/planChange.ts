import { Router } from "express";
import { planChangeSchema } from "../schemas/planChangeSchema.js";
import { sessionStore } from "../stores/sessionStore.js";
import { transactionStore } from "../stores/transactionStore.js";
import { maxioService } from "../services/maxioService.js";
import { slackService } from "../services/slackService.js";
import {
  buildPlanChangePreviewBlocks,
  buildPlanChangeCompleteBlocks,
  buildFailureBlocks,
} from "../services/slackBuilders.js";

export const planChangeRouter = Router();

// ── Preview ──────────────────────────────────────────────────────────────────
planChangeRouter.post("/api/plan-change/preview", async (req, res): Promise<void> => {
  const parsed = planChangeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "invalid", error: parsed.error.flatten() });
    return;
  }

  const { sessionId, txnRef, targetHandle, timing } = parsed.data;

  const txn = transactionStore.get(txnRef);
  if (!txn) {
    res.status(404).json({ status: "invalid", error: `Transaction not found: ${txnRef}` });
    return;
  }
  if (!txn.subscriptionId) {
    res.status(409).json({ status: "invalid", error: "Transaction has no active subscription" });
    return;
  }

  if (sessionStore.get(sessionId)) sessionStore.put(sessionId, {});

  const channelId = txn.channelId ?? "";
  const fromPlan = txn.planHandle ?? "current plan";

  await slackService.postMessage(
    channelId,
    `:mag: Previewing plan change from *${fromPlan}* → *${targetHandle}* (${timing})…`,
    [],
  );

  try {
    const preview = await maxioService.previewPlanChange({
      subscriptionId: txn.subscriptionId,
      targetHandle,
    });

    await slackService.postMessage(
      channelId,
      ":mag: Plan change preview",
      buildPlanChangePreviewBlocks({
        fromPlan,
        toPlan: targetHandle,
        timing,
        ...preview,
      }),
    );

    res.status(200).json({
      status: "ok",
      txnId: txnRef,
      channelId,
      channelName: txn.channelName,
      fromPlan,
      toPlan: targetHandle,
      timing,
      proratedAdjustmentInCents: preview.proratedAdjustmentInCents.toString(),
      chargeInCents: preview.chargeInCents.toString(),
      paymentDueInCents: preview.paymentDueInCents.toString(),
      creditAppliedInCents: preview.creditAppliedInCents.toString(),
    });
  } catch (err) {
    const errorSummary = err instanceof Error ? err.message : String(err);
    console.error("[plan-change/preview] error:", err);

    await slackService.postMessage(
      channelId,
      ":warning: Plan change preview failed",
      buildFailureBlocks("Plan change preview", errorSummary),
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

// ── Commit ───────────────────────────────────────────────────────────────────
planChangeRouter.post("/api/plan-change", async (req, res): Promise<void> => {
  const parsed = planChangeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "invalid", error: parsed.error.flatten() });
    return;
  }

  const { sessionId, txnRef, targetHandle, timing } = parsed.data;

  const txn = transactionStore.get(txnRef);
  if (!txn) {
    res.status(404).json({ status: "invalid", error: `Transaction not found: ${txnRef}` });
    return;
  }
  if (!txn.subscriptionId) {
    res.status(409).json({ status: "invalid", error: "Transaction has no active subscription" });
    return;
  }

  if (sessionStore.get(sessionId)) sessionStore.put(sessionId, {});

  const channelId = txn.channelId ?? "";
  const fromPlan = txn.planHandle ?? "current plan";

  await slackService.postMessage(
    channelId,
    `:arrows_counterclockwise: Applying plan change from *${fromPlan}* → *${targetHandle}* (${timing})…`,
    [],
  );

  try {
    const result = await maxioService.applyPlanChange({
      subscriptionId: txn.subscriptionId,
      targetHandle,
      timing,
    });

    // Update transaction with new plan handle
    transactionStore.update(txnRef, { planHandle: result.planHandle });

    const effectiveDate =
      timing === "prorate"
        ? "Immediately"
        : result.nextAssessmentAt
        ? new Date(result.nextAssessmentAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "Next renewal";

    await slackService.postMessage(
      channelId,
      ":arrows_counterclockwise: Plan changed",
      buildPlanChangeCompleteBlocks({
        fromPlan,
        toPlan: result.planName,
        timing,
        effectiveDate,
        state: result.state,
      }),
    );

    res.status(200).json({
      status: "ok",
      txnId: txnRef,
      channelId,
      channelName: txn.channelName,
      fromPlan,
      toPlan: result.planName,
      toPlanHandle: result.planHandle,
      timing,
      effectiveDate,
      state: result.state,
      nextAssessmentAt: result.nextAssessmentAt,
      ...(result.nextProductName ? { scheduledAt: result.nextProductName } : {}),
    });
  } catch (err) {
    const errorSummary = err instanceof Error ? err.message : String(err);
    console.error("[plan-change] error:", err);

    await slackService.postMessage(
      channelId,
      ":warning: Plan change failed",
      buildFailureBlocks("Plan change", errorSummary),
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
